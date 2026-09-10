import hashlib
import json
import logging
import random
import secrets
from datetime import date, datetime, timedelta

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import IntegrityError
from django.db.models import Count, Max, Q
from django.db.models.functions import TruncDay, TruncMonth, TruncYear
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import can
from master.models import Category, Source
from utilities.models import Notification, log_activity

from .models import (
    Attachment,
    CallHistory,
    ClientDetail,
    Lead,
    LeadContactHistory,
    Order,
    ProposalDraft,
    ProposalTemplate,
    Quotation,
    QuotationApproval,
)
from .serializers import (
    AttachmentSerializer,
    ClientDetailSerializer,
    LeadSerializer,
    OrderSerializer,
    ProposalDraftSerializer,
    ProposalTemplateSerializer,
    QuotationApprovalSerializer,
    QuotationSerializer,
)
from .services import build_client_email, build_order_client_email, create_client_detail_from_order

User = get_user_model()
logger = logging.getLogger(__name__)


def hash_otp(code, salt):
    return hashlib.sha256(f'{salt}:{code}'.encode('utf-8')).hexdigest()


def generate_otp():
    return f'{secrets.randbelow(1000000):06d}'


def notify(user, notif_type, title, message, url='', entity_type='', entity_id=''):
    """Create an in-app notification for a user (no-op if ``user`` is missing)."""
    if user is None or not getattr(user, 'pk', None):
        return
    Notification.objects.create(
        user=user,
        type=notif_type,
        title=title,
        message=message,
        time='Just now',
        url=url,
        entity_type=entity_type,
        entity_id=entity_id,
    )


# Lead field -> Quotation field for the company/contact details kept in sync
# between the two records (the Lead is the single source of truth).
CONTACT_FIELD_MAP = {
    'company': 'company',
    'contact': 'customer',
    'phone': 'mobile',
    'email': 'email',
    'category': 'category',
    'city': 'city',
    'source': 'source',
}

# Quotation field -> Lead field (inverse of CONTACT_FIELD_MAP).
CONTACT_Q_TO_LEAD = {value: key for key, value in CONTACT_FIELD_MAP.items()}

# Quotation statuses that mean a proposal has not been generated/sent yet.
NOT_GENERATED_STATUSES = {'', 'Not Sent', 'Quotation Requested'}

# Statuses that represent a proposal already approved / sent / decided. These
# proposals are locked: they cannot be edited in place, only re-created as a
# new version via "Edit as New Version".
LOCKED_STATUSES = {'Approved', 'Sent to Client', 'Accepted', 'Declined'}

CONTACT_EDITABLE_CAMEL = ('customer', 'company', 'mobile', 'email', 'category', 'city', 'source')


def log_contact_change(user, lead, field, old_value, new_value):
    """Write one audit row when a company/contact detail actually changed."""
    old_value = '' if old_value is None else str(old_value)
    new_value = '' if new_value is None else str(new_value)
    if old_value == new_value:
        return
    LeadContactHistory.objects.create(
        lead=lead,
        field=field,
        from_value=old_value[:255],
        to_value=new_value[:255],
        changed_by=user.name,
        stage=lead.status,
    )


def quotation_was_generated(quotation):
    """True when a proposal already exists past being merely drafted/sent."""
    return quotation is not None and quotation.status not in NOT_GENERATED_STATUSES


def sync_contact_from_quotation(user, lead, quotation, old_contact):
    """Audit quotation contact edits and mirror them onto the lead.

    ``old_contact`` maps lead field name -> value before the edit. Returns the
    list of lead fields that actually changed (or [] when nothing changed or the
    mirror could not be applied).
    """
    pending = []
    for lead_field, old_value in old_contact.items():
        q_field = CONTACT_FIELD_MAP.get(lead_field, lead_field)
        new_value = getattr(quotation, q_field)
        if new_value is None:
            new_value = ''
        if (old_value or '') != new_value:
            pending.append((lead_field, old_value, new_value))
    if not pending:
        return []
    changed_fields = [entry[0] for entry in pending]
    for lead_field, _, new_value in pending:
        setattr(lead, lead_field, new_value)
    try:
        lead.save(update_fields=changed_fields + ['updated_at'])
    except IntegrityError:
        # e.g. the proposal company name collides with another lead — keep the
        # quotation's value but leave the lead (source of truth) untouched.
        logger.warning('Could not mirror contact change to lead %s.', lead.id)
        return []
    for lead_field, old_value, new_value in pending:
        log_contact_change(user, lead, lead_field, old_value, new_value)
    return changed_fields


def sync_lead_contact_to_quotation(lead, old_contact):
    """Push changed lead contact details into the existing quotation (if any)."""
    quotation = Quotation.objects.filter(lead_id=lead.id).first()
    if quotation is None:
        return
    changed = False
    for lead_field in old_contact:
        q_field = CONTACT_FIELD_MAP.get(lead_field)
        if q_field is None:
            continue
        value = getattr(lead, lead_field)
        if value is None:
            value = ''
        if getattr(quotation, q_field) != value:
            setattr(quotation, q_field, value)
            changed = True
    if changed:
        quotation.save()


def proposal_url(quotation):
    """Preview URL for a specific proposal (version-aware)."""
    if quotation is None:
        return ''
    return f"/quotations/preview/{quotation.id}"


def find_quotation(param):
    """Resolve a quotation by its own id, else by lead id (latest version)."""
    if not param:
        return None
    quotation = Quotation.objects.filter(id=param).first()
    if quotation is not None:
        return quotation
    return Quotation.objects.filter(lead_id=param).order_by('-version_no').first()


def latest_version_no(lead_id):
    """The next version number to assign for a lead's proposal."""
    return (Quotation.objects.filter(lead_id=lead_id)
            .aggregate(max=Max('version_no'))['max'] or 0) + 1


def duplicate_quotation(source, payload):
    """Create a new version row of ``source`` from an edit payload.

    The old proposal is left untouched; the new copy starts from scratch
    (``Not Sent``, no approvals, signatures, or client token) so it must be
    approved again before it can be sent to the client.
    """
    version_no = latest_version_no(source.lead_id)
    quotation = Quotation(
        id=f'{source.lead_id}-V{version_no}',
        lead_id=source.lead_id,
        tenant=source.tenant,
        company=payload.get('company') or source.company,
        customer=payload.get('customer') or source.customer,
        mobile=payload.get('mobile') or source.mobile,
        email=payload.get('email') or source.email,
        category=payload.get('category') or source.category,
        city=payload.get('city') or source.city,
        source=payload.get('source') or source.source,
        bdm=payload.get('bdm') or source.bdm,
        qtn_by=payload.get('qtnBy') or source.qtn_by,
        staff=payload.get('staff') or source.staff,
        date=payload.get('date') or source.date,
        revision_no=payload.get('revisionNo') or source.revision_no,
        version_no=version_no,
        status='Not Sent',
        total=payload.get('total') or source.total,
        discount=payload.get('discount') or source.discount,
        net_amount=payload.get('netAmount') or source.net_amount,
        currency=payload.get('currency') or source.currency,
        proposal_scope=payload.get('proposalScope') or source.proposal_scope,
        terms_conditions=payload.get('termsConditions') or source.terms_conditions,
        remarks=payload.get('remarks') or source.remarks,
    )
    quotation.save()
    return quotation


def resolve_approvers(user, raw_ids):
    """Return the validated list of approver users for a send action.

    ``raw_ids`` may be a list of ids (or a JSON/list string). The submitter is
    excluded and every remaining user must belong to the same company and hold
    the ``quotation.approve`` permission (or be a superuser).
    """
    if isinstance(raw_ids, str):
        try:
            raw_ids = json.loads(raw_ids)
        except (TypeError, ValueError):
            raw_ids = [raw_ids]
    ids = []
    for value in (raw_ids or []):
        try:
            candidate = int(value)
        except (TypeError, ValueError):
            continue
        if candidate not in ids:
            ids.append(candidate)
    if not user.company:
        return []
    qs = User.objects.filter(
        company=user.company,
        pk__in=ids,
    )
    approvers = []
    for approver in qs:
        if approver.pk == user.pk:
            continue
        if not (approver.is_superuser or approver.has_permission('quotation.approve')):
            continue
        approvers.append(approver)
    return approvers


def approvals_all_approved(quotation):
    approvals = list(quotation.approvals.all())
    return bool(approvals) and all(a.status == QuotationApproval.STATUS_APPROVED for a in approvals)


def assignment_name_set(user):
    """Names that ``user`` may assign leads to (their company's non-superusers)."""
    if not user.company:
        return set()
    return set(
        User.objects
        .filter(company=user.company)
        .exclude(is_superuser=True)
        .values_list('name', flat=True)
    )


def generate_lead_id():
    existing = set(Lead.objects.values_list('id', flat=True))
    for _ in range(200):
        candidate = f'LEAD-{random.randint(100000, 999999)}'
        if candidate not in existing:
            return candidate
    return f'LEAD-{random.randint(1000000, 9999999)}'


def scoped_queryset(user, status_filter='all'):
    """Return the Lead queryset visible to ``user``.

    Superusers see everything. Managers/admins (``leads.view_all``) see their
    company's records plus legacy unassigned rows. Staff with
    ``leads.view_raw_all`` see all raw data in the company but otherwise only
    the leads assigned to them. An optional ``status_filter`` narrows the
    result by lead status.
    """
    qs = Lead.objects.all()
    if not user.is_superuser:
        if user.has_permission('leads.view_all'):
            # Managers/admins see their company's records plus legacy rows.
            qs = qs.filter(Q(tenant=user.company) | Q(tenant__isnull=True))
        elif user.has_permission('leads.view_raw_all'):
            # Raw data is public in the company; otherwise staff only see
            # the leads assigned to them.
            qs = qs.filter(
                Q(status=Lead.STATUS_RAW, tenant=user.company)
                | Q(status=Lead.STATUS_RAW, tenant__isnull=True)
                | Q(tenant=user.company, assigned_to=user.name)
            )
        else:
            # Staff without view_raw_all see the leads assigned to them plus
            # the leads they still hold in raw status.
            qs = qs.filter(
                Q(tenant=user.company, assigned_to=user.name)
                | Q(added_by=user.name, status=Lead.STATUS_RAW)
            )
    if status_filter and status_filter != 'all':
        qs = qs.filter(status=status_filter)
    return qs


def format_display_date(value):
    return value.strftime('%d %b %Y') if value else ''


def parse_due_date(value):
    """Best-effort parse of the free-text follow-up due date (ISO or common
    dd-mm-yyyy / dd/mm/yyyy). Returns a ``date`` or ``None`` when unparseable."""
    if not value:
        return None
    text = str(value).strip()
    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def find_duplicate_lead(user, company):
    """Return an existing Lead with the same normalized company name, from
    across the org (not just the current user's own records) and regardless
    of its current status."""
    queryset = Lead.objects.all()
    if not user.is_superuser:
        queryset = queryset.filter(Q(tenant=user.company) | Q(tenant__isnull=True))
    return queryset.filter(company__iexact=company).only(
        'id', 'company', 'contact', 'phone', 'category', 'city', 'added_by',
        'display_date', 'date', 'status',
    ).first()


def duplicate_response(existing):
    added_by = existing.added_by or 'another user'
    when = existing.display_date or (format_display_date(existing.date) if existing.date else '')
    when_text = f' on {when}' if when else ''
    return Response(
        {
            'detail': f'This lead was already entered by {added_by}{when_text}. '
                      f'Please use the existing record.',
            'existing': LeadSerializer(existing).data,
        },
        status=status.HTTP_409_CONFLICT,
    )


class LeadListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can(request.user, 'leads.view', 'telecall.view'):
            return Response(
                {'detail': 'You do not have permission to view leads.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        status_filter = request.query_params.get('status') or 'raw'
        leads = scoped_queryset(request.user, status_filter).order_by('-created_at')
        leads = leads.prefetch_related('history', 'contact_history')
        quotations = {}
        lead_ids = leads.values_list('id', flat=True)
        for quotation in Quotation.objects.filter(lead_id__in=lead_ids).order_by('version_no'):
            quotations.setdefault(quotation.lead_id, []).append(quotation)
        return Response(
            LeadSerializer(leads, many=True, context={'quotations': quotations}).data
        )

    def post(self, request):
        if not can(request.user, 'leads.create'):
            return Response(
                {'detail': 'You do not have permission to add leads.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        company = request.data.get('company', '').strip()
        if not company:
            return Response(
                {'detail': 'company: This field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        existing = find_duplicate_lead(request.user, company)
        if existing is not None:
            return duplicate_response(existing)
        category = request.data.get('category', '').strip()
        source = request.data.get('source', '').strip()
        invalid = []
        if category and not Category.objects.filter(
            company=request.user.company, name=category
        ).exists():
            invalid.append(f'category: Unknown category "{category}".')
        if source and not Source.objects.filter(
            company=request.user.company, name=source
        ).exists():
            invalid.append(f'source: Unknown source "{source}".')
        if invalid:
            return Response({'detail': ' '.join(invalid)}, status=status.HTTP_400_BAD_REQUEST)
        phone = request.data.get('phone', '').strip()
        lead_date = date.today()
        saved = None
        last_error = None
        for _ in range(5):
            try:
                saved = Lead.objects.create(
                    id=generate_lead_id(),
                    company=company,
                    tenant=request.user.company,
                    contact=request.data.get('contact', '').strip(),
                    phone=phone,
                    email=request.data.get('email', '').strip(),
                    category=category,
                    source=source,
                    city=request.data.get('city', '').strip(),
                    date=lead_date,
                    display_date=format_display_date(lead_date),
                    added_by=request.user.name,
                    status=Lead.STATUS_RAW,
                )
                break
            except IntegrityError as exc:
                # Either a real duplicate (concurrent create) or a random id
                # collision; retry the id-generation rather than 500.
                last_error = exc
                existing = find_duplicate_lead(request.user, company)
                if existing is not None:
                    return duplicate_response(existing)
        if saved is None:
            raise last_error
        log_activity(
            request.user,
            request.user.company,
            'added lead',
            f'{request.user.name} added raw lead {saved.id} - {saved.company}.',
            entity_type='lead',
            entity_id=saved.id,
        )
        return Response(LeadSerializer(saved).data, status=status.HTTP_201_CREATED)


class LeadDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return scoped_queryset(self.request.user).get(pk=pk)
        except Lead.DoesNotExist:
            return None

    def patch(self, request, pk):
        lead = self.get_object(pk)
        if lead is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        user = request.user
        is_own = lead.added_by == user.name
        if lead.status == Lead.STATUS_RAW:
            can_edit = (user.has_permission('leads.edit_all')
                        or (user.has_permission('leads.edit_own') and is_own))
        else:
            # Assigned leads are edited by the assigned staff while the lead is
            # still in the assigned (telecall) stage, or by telecall editors.
            # Once a lead leaves the assigned stage (e.g. set to "Quotation
            # Requested"), the staff member loses control of it.
            can_edit = user.has_permission('telecall.edit') or (
                lead.assigned_to == user.name and lead.status == Lead.STATUS_ASSIGNED
            )
        if not can_edit:
            return Response(
                {'detail': 'You do not have permission to edit this lead.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        edited_contact_fields = [f for f in CONTACT_FIELD_MAP if f in request.data]
        old_contact = {f: getattr(lead, f) for f in edited_contact_fields}
        old_call_status = lead.call_status
        if 'company' in request.data:
            company = request.data.get('company', '').strip()
            if not company:
                return Response(
                    {'detail': 'company: This field may not be blank.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if lead.company.strip().lower() != company.lower():
                # Changing the name to one that already exists would violate the
                # unique constraint — surface it as a friendly duplicate instead.
                conflict = find_duplicate_lead(request.user, company)
                if conflict is not None and conflict.id != lead.id:
                    return duplicate_response(conflict)
            lead.company = company
        for field in ('contact', 'phone', 'category', 'source', 'city'):
            if field in request.data:
                value = request.data.get(field)
                if isinstance(value, str):
                    value = value.strip()
                setattr(lead, field, value)
        if 'email' in request.data:
            lead.email = request.data.get('email', '').strip()
        for field in ('assigned_to', 'call_status', 'priority', 'remarks',
                      'last_call_date', 'next_follow_up_date', 'next_follow_up_time'):
            if field in request.data:
                value = request.data.get(field)
                if value is None:
                    value = ''
                elif isinstance(value, str):
                    value = value.strip()
                setattr(lead, field, value)
        invalid = []
        submitted = set(request.data)
        # Reassigning a lead to another staff member is an assign action: only
        # users with an assign permission may change who owns a lead. This keeps
        # the per-lead edit path consistent with the bulk-assign gate.
        if 'assigned_to' in submitted:
            if not user.has_permission('leads.assign') and not user.has_permission('telecall.assign'):
                return Response(
                    {'detail': 'You do not have permission to reassign leads.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
        if 'category' in submitted and lead.category and not Category.objects.filter(
            company=user.company, name=lead.category
        ).exists():
            invalid.append(f'category: Unknown category "{lead.category}".')
        if 'source' in submitted and lead.source and not Source.objects.filter(
            company=user.company, name=lead.source
        ).exists():
            invalid.append(f'source: Unknown source "{lead.source}".')
        if 'call_status' in submitted and lead.call_status not in Lead.CALL_STATUS_VALUES:
            invalid.append(f'call_status: "{lead.call_status}" is not a valid call status.')
        if 'assigned_to' in submitted and lead.assigned_to:
            valid_names = assignment_name_set(user)
            if lead.assigned_to not in valid_names:
                invalid.append(f'assigned_to: Unknown staff member "{lead.assigned_to}".')
        if invalid:
            return Response({'detail': ' '.join(invalid)}, status=status.HTTP_400_BAD_REQUEST)
        if 'has_follow_up' in request.data:
            lead.has_follow_up = bool(request.data.get('has_follow_up'))
        if 'assigned_to' in request.data and lead.assigned_to and user.company:
            lead.tenant = user.company
        try:
            lead.save()
        except IntegrityError:
            conflict = find_duplicate_lead(request.user, lead.company)
            if conflict is not None and conflict.id != lead.id:
                return duplicate_response(conflict)
            raise
        # Assigning a raw lead via the edit path must move it out of the raw
        # pool, mirroring the bulk-assign behaviour.
        if 'assigned_to' in submitted and lead.assigned_to and lead.status == Lead.STATUS_RAW:
            lead.status = Lead.STATUS_ASSIGNED
            lead.call_status = lead.call_status or 'Pending Call'
            lead.save(update_fields=['status', 'updated_at'])
        if lead.call_status == 'Quotation Requested' and lead.status != Lead.STATUS_QUOTATION:
            lead.status = Lead.STATUS_QUOTATION
            lead.save(update_fields=['status', 'updated_at'])
        # Call-history noise guard: only record a call entry when the call
        # status actually changed (re-saving an unchanged status must not
        # append duplicate history rows).
        if 'call_status' in request.data and lead.call_status != old_call_status and lead.call_status != 'Pending Call':
            report = request.data.get('remarks')
            if report is None:
                report = lead.remarks
            follow_up = ''
            if lead.has_follow_up and lead.next_follow_up_date:
                follow_up = lead.next_follow_up_date
                if lead.next_follow_up_time:
                    follow_up = f'{follow_up} {lead.next_follow_up_time}'
            CallHistory.objects.create(
                lead=lead,
                date_time=datetime.now().strftime('%d-%m-%Y %I:%M %p'),
                caller=user.name,
                report=report,
                follow_up=follow_up,
                status=lead.call_status,
            )
        quotation = Quotation.objects.filter(lead_id=lead.id).first()
        was_generated = quotation_was_generated(quotation)
        contact_changed = False
        if old_contact:
            changed_fields = []
            for field in old_contact:
                new_value = getattr(lead, field)
                if new_value is None:
                    new_value = ''
                if (old_contact[field] or '') != new_value:
                    log_contact_change(user, lead, field, old_contact[field], new_value)
                    changed_fields.append(field)
            if changed_fields:
                contact_changed = True
                sync_lead_contact_to_quotation(lead, changed_fields)
        if 'assigned_to' in submitted and lead.assigned_to:
            log_activity(
                user,
                user.company,
                'assigned lead',
                f'{user.name} assigned {lead.id} - {lead.company} to {lead.assigned_to}.',
                entity_type='lead',
                entity_id=lead.id,
            )
        elif 'call_status' in submitted and lead.call_status != old_call_status:
            log_activity(
                user,
                user.company,
                'updated call status',
                f'{user.name} set {lead.company} call status to "{lead.call_status}".',
                entity_type='lead',
                entity_id=lead.id,
            )
        else:
            log_activity(
                user,
                user.company,
                'updated lead',
                f'{user.name} updated lead {lead.id} - {lead.company}.',
                entity_type='lead',
                entity_id=lead.id,
            )
        data = LeadSerializer(lead).data
        data['contactChanged'] = contact_changed
        data['wasGenerated'] = was_generated
        return Response(data)

    def delete(self, request, pk):
        lead = self.get_object(pk)
        if lead is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        user = request.user
        is_own = lead.added_by == user.name
        if not (user.has_permission('leads.delete') and is_own) and not user.has_permission('leads.delete_all'):
            return Response(
                {'detail': 'You do not have permission to delete this lead.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        label = f'{lead.id} - {lead.company}'
        lead.delete()
        log_activity(
            user,
            user.company,
            'deleted lead',
            f'{user.name} deleted lead {label}.',
            entity_type='lead',
            entity_id=lead.id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class QuotationView(APIView):
    permission_classes = [IsAuthenticated]

    QUOTATION_FIELDS = {
        'customer': 'customer',
        'company': 'company',
        'mobile': 'mobile',
        'email': 'email',
        'category': 'category',
        'city': 'city',
        'bdm': 'bdm',
        'qtnBy': 'qtn_by',
        'staff': 'staff',
        'date': 'date',
        'revisionNo': 'revision_no',
        'status': 'status',
        'total': 'total',
        'discount': 'discount',
        'netAmount': 'net_amount',
        'currency': 'currency',
        'source': 'source',
        'proposalScope': 'proposal_scope',
        'termsConditions': 'terms_conditions',
        'remarks': 'remarks',
    }

    def get(self, request, lead_id):
        if not can(request.user, 'quotation.view'):
            return Response(
                {'detail': 'You do not have permission to view quotations.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        quotation = find_quotation(lead_id)
        if quotation is None:
            return Response({'detail': 'Quotation not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not request.user.is_superuser:
            lead_in_scope = scoped_queryset(request.user).filter(pk=quotation.lead_id).first() is not None
            same_company = quotation.tenant is not None and quotation.tenant == request.user.company
            if not lead_in_scope and not same_company:
                return Response({'detail': 'Quotation not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(QuotationSerializer(quotation).data)

    def put(self, request, lead_id):
        if not can(request.user, 'quotation.create', 'quotation.edit'):
            return Response(
                {'detail': 'You do not have permission to create or edit quotations.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        is_new_version = bool(request.data.get('newVersion'))
        quotation = find_quotation(lead_id)
        if quotation is None:
            lead = scoped_queryset(request.user).filter(pk=lead_id).first()
            if lead is None:
                return Response(
                    {'detail': 'Lead not found.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            quotation = Quotation(id=lead_id, lead_id=lead_id, version_no=1, tenant=request.user.company, company=lead.company)
            new_row = True
        else:
            new_row = False
            if not request.user.is_superuser:
                lead_in_scope = scoped_queryset(request.user).filter(pk=quotation.lead_id).first() is not None
                same_company = quotation.tenant is not None and quotation.tenant == request.user.company
                if not lead_in_scope and not same_company:
                    return Response({'detail': 'Lead not found.'}, status=status.HTTP_404_NOT_FOUND)
            lead = scoped_queryset(request.user).filter(pk=quotation.lead_id).first()
            if lead is None:
                return Response({'detail': 'Lead not found.'}, status=status.HTTP_404_NOT_FOUND)

        source_quotation = quotation
        old_was_generated = quotation_was_generated(quotation)
        old_contact = {}
        if not new_row:
            old_contact = {
                CONTACT_Q_TO_LEAD.get(self.QUOTATION_FIELDS[camel], self.QUOTATION_FIELDS[camel]):
                getattr(quotation, self.QUOTATION_FIELDS[camel])
                for camel in CONTACT_EDITABLE_CAMEL
                if camel in request.data
            }
        current_status = quotation.status
        was_pending = current_status == 'Pending Approval'
        new_status = request.data.get('status')
        is_send_action = 'approvers' in request.data

        # A locked (approved/sent/decided) proposal cannot be edited in place.
        # The edit must spawn a fresh version via the "Edit as New Version"
        # flow (newVersion flag); it will only be sendable after re-approval.
        if is_new_version and not new_row:
            quotation = duplicate_quotation(source_quotation, request.data)
            contact_changed = bool(old_contact) and bool(
                sync_contact_from_quotation(request.user, lead, quotation, old_contact)
            )
            log_activity(
                request.user,
                request.user.company,
                'created quotation version',
                f'{request.user.name} created a new version of quotation {quotation.id} - {quotation.company}.',
                entity_type='quotation',
                entity_id=quotation.lead_id,
            )
            data = QuotationSerializer(quotation).data
            data.update({
                'contactChanged': contact_changed,
                'wasGenerated': old_was_generated,
                'newVersion': True,
            })
            return Response(data, status=status.HTTP_201_CREATED)

        if current_status in LOCKED_STATUSES:
            return Response(
                {'detail': 'This proposal is already approved or sent to the client and cannot be edited. Use "Edit as New Version" to create an updated copy.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # A generic edit must not force a terminal/approval status; use the
        # dedicated approve/reject actions.
        if new_status in ('Approved', 'Rejected') and new_status != current_status:
            return Response(
                {'detail': 'The proposal status cannot be set directly. Use the approve / reject action.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # "Pending Approval" can only be entered through the send-for-approval
        # flow (which requires approvers). Without approval rows the proposal
        # would be wedged in limbo with no approver to act on it. Editing an
        # already-pending proposal (approvals exist) stays allowed.
        if new_status == 'Pending Approval' and not is_send_action:
            if not quotation.approvals.exists():
                return Response(
                    {'detail': 'Send the proposal for approval using the "Send for Approval" action.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        for camel, field in self.QUOTATION_FIELDS.items():
            if camel in request.data:
                value = request.data.get(camel)
                setattr(quotation, field, value if value is not None else '')

        # Audit any company/contact change made here and mirror it to the lead.
        contact_changed = bool(old_contact) and bool(
            sync_contact_from_quotation(request.user, lead, quotation, old_contact)
        )
        response_flags = {'contactChanged': contact_changed, 'wasGenerated': old_was_generated}

        if new_status == 'Pending Approval' and is_send_action:
            if was_pending:
                return Response(
                    {'detail': 'This proposal is already awaiting approval. Approve or reject it before resending.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if current_status in LOCKED_STATUSES:
                return Response(
                    {'detail': 'This proposal is already approved and cannot be resent.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            approvers = resolve_approvers(request.user, request.data.get('approvers', []))
            if not approvers:
                return Response(
                    {'detail': 'Please select at least one approver.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            quotation.approvals.all().delete()
            quotation.submitted_by = request.user
            quotation.approval_requested_at = timezone.now()
            quotation.approved_at = None
            quotation.rejected_at = None
            quotation.rejection_reason = ''
            quotation.approval_note = ''
            quotation.signed_by = ''
            quotation.signature_ref = ''
            quotation.signature_hash = ''
            quotation.otp_hash = ''
            quotation.otp_sent_at = None
            quotation.otp_expires_at = None
            quotation.approver = None
            quotation.approver_name = ''
            quotation.save()
            for approver in approvers:
                quotation.approvals.create(user=approver)
                notify(
                    approver,
                    'Approval',
                    'Proposal awaiting your approval',
                    f'{quotation.id} - {quotation.company}, submitted by {request.user.name}.',
                    url=proposal_url(quotation),
                    entity_type='quotation',
                    entity_id=quotation.lead_id,
                )
            log_activity(
                request.user,
                request.user.company,
                'sent for approval',
                f'{request.user.name} sent quotation {quotation.id} - {quotation.company} for approval.',
                entity_type='quotation',
                entity_id=quotation.lead_id,
            )
            data = QuotationSerializer(quotation).data
            data.update(response_flags)
            return Response(data)
        quotation.save()
        log_activity(
            request.user,
            request.user.company,
            'created quotation' if new_row else 'updated quotation',
            f'{request.user.name} {"created" if new_row else "updated"} quotation {quotation.id} - {quotation.company}.',
            entity_type='quotation',
            entity_id=quotation.lead_id,
        )
        data = QuotationSerializer(quotation).data
        data.update(response_flags)
        return Response(data)

    def delete(self, request, lead_id):
        if not can(request.user, 'quotation.edit'):
            return Response(
                {'detail': 'You do not have permission to delete quotations.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        quotation = find_quotation(lead_id)
        if quotation is None:
            return Response({'detail': 'Quotation not found.'}, status=status.HTTP_404_NOT_FOUND)
        lead = scoped_queryset(request.user).filter(pk=quotation.lead_id).first()
        if lead is None:
            return Response({'detail': 'Quotation not found.'}, status=status.HTTP_404_NOT_FOUND)
        # Never let quotation deletion regress a lead that already produced an
        # order/client record — otherwise the pipeline and the order book diverge.
        if Order.objects.filter(lead_id=quotation.lead_id).exists() or \
                ClientDetail.objects.filter(lead_id=quotation.lead_id).exists():
            return Response(
                {'detail': 'This lead already has an order/client record. Quotation cannot be deleted here.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        Quotation.objects.filter(lead_id=quotation.lead_id).delete()
        lead.status = Lead.STATUS_ASSIGNED
        lead.call_status = 'Pending Call'
        lead.save(update_fields=['status', 'call_status', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class QuotationApproverListView(APIView):
    """List the company users who can approve a quotation (the picker in
    "Send for Approval"). Users with ``quotation.approve`` or superusers."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can(request.user, 'quotation.view'):
            return Response(
                {'detail': 'You do not have permission to view quotations.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not request.user.company:
            return Response([])
        users = User.objects.filter(company=request.user.company).exclude(pk=request.user.pk)
        result = [
            {
                'id': user.id,
                'name': user.name,
                'role': (user.role.name if user.role_id else ''),
                'is_superuser': user.is_superuser,
            }
            for user in users
            if user.is_superuser or user.has_permission('quotation.approve')
        ]
        result.sort(key=lambda x: x['name'].lower())
        return Response(result)


class QuotationApprovalBaseView(APIView):
    permission_classes = [IsAuthenticated]

    def get_context(self, request, lead_id):
        """Return (quotation, approval, error) for the current user's approval."""
        if not can(request.user, 'quotation.approve'):
            return None, None, Response(
                {'detail': 'You do not have permission to approve quotations.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        quotation = find_quotation(lead_id)
        if quotation is None:
            return None, None, Response(
                {'detail': 'Quotation not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        approval = quotation.approvals.filter(user=request.user).first()
        if approval is None:
            return quotation, None, Response(
                {'detail': 'You are not an approver for this proposal.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return quotation, approval, None


class QuotationOtpView(QuotationApprovalBaseView):
    """Send a one-time approval code to the logged-in approver by email."""

    OTP_MINUTES = 5

    def post(self, request, lead_id):
        quotation, approval, error = self.get_context(request, lead_id)
        if error is not None:
            return error
        if quotation.status != 'Pending Approval':
            return Response(
                {'detail': 'This proposal is not awaiting approval.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if approval.status != QuotationApproval.STATUS_PENDING:
            return Response(
                {'detail': 'You have already decided on this proposal.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        code = generate_otp()
        approval.otp_hash = hash_otp(code, approval.id)
        approval.otp_sent_at = timezone.now()
        approval.otp_expires_at = timezone.now() + timedelta(minutes=self.OTP_MINUTES)
        approval.otp_attempts = 0
        approval.save(update_fields=['otp_hash', 'otp_sent_at', 'otp_expires_at', 'otp_attempts', 'updated_at'])
        try:
            send_mail(
                subject='LEADS — Quotation approval code',
                message=(
                    f'Hi {request.user.name},\n\n'
                    f'You requested to approve quotation {quotation.id} for '
                    f'{quotation.company}.\n\n'
                    f'Your one-time approval code is:\n\n    {code}\n\n'
                    f'It expires in {self.OTP_MINUTES} minutes and can only be used once.\n\n'
                    f'If you did not request this, you can safely ignore this email.\n\n'
                    f'— LEADS'
                ),
                from_email=None,
                recipient_list=[request.user.email],
                fail_silently=True,
            )
        except Exception:
            pass
        return Response({'sent': True, 'expires_in': self.OTP_MINUTES * 60})


class QuotationApproveView(QuotationApprovalBaseView):
    """Verify the OTP and record this approver's digital signature."""

    def post(self, request, lead_id):
        quotation, approval, error = self.get_context(request, lead_id)
        if error is not None:
            return error
        if quotation.status != 'Pending Approval':
            return Response(
                {'detail': 'This proposal is not awaiting approval.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if approval.status != QuotationApproval.STATUS_PENDING:
            return Response(
                {'detail': 'You have already decided on this proposal.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        code = str(request.data.get('otp', '')).strip()
        note = str(request.data.get('note', '') or '').strip()
        if not code:
            return Response(
                {'detail': 'Please enter the approval code.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not approval.otp_hash or not approval.otp_expires_at:
            return Response(
                {'detail': 'No approval code was requested. Please request a code first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if timezone.now() > approval.otp_expires_at:
            return Response(
                {'detail': 'The approval code has expired. Please request a new one.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        MAX_OTP_ATTEMPTS = 5
        if approval.otp_attempts >= MAX_OTP_ATTEMPTS:
            return Response(
                {'detail': 'Too many incorrect attempts. Please request a new approval code.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if hash_otp(code, approval.id) != approval.otp_hash:
            approval.otp_attempts += 1
            approval.save(update_fields=['otp_attempts', 'updated_at'])
            return Response(
                {'detail': 'The approval code is invalid. Please try again.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        approval.status = QuotationApproval.STATUS_APPROVED
        approval.signed_by = request.user.name
        approval.signed_at = timezone.now()
        approval.signature_ref = f'OTP-{random.randint(10000000, 99999999)}'
        approval.signature_hash = approval.otp_hash
        approval.otp_hash = ''
        approval.otp_expires_at = None
        approval.otp_sent_at = None
        approval.save()
        if approvals_all_approved(quotation):
            quotation.status = 'Approved'
            quotation.approved_at = timezone.now()
            quotation.signed_by = request.user.name
            quotation.signature_ref = approval.signature_ref
            quotation.save()
            log_activity(
                request.user,
                quotation.tenant,
                'approved quotation',
                f'{request.user.name} approved quotation {quotation.id} - {quotation.company}.',
                entity_type='quotation',
                entity_id=quotation.lead_id,
            )
            if quotation.submitted_by_id and quotation.submitted_by_id != request.user.id:
                notify(
                    quotation.submitted_by,
                    'Approval',
                    'Proposal approved',
                    f'{quotation.id} - {quotation.company} approved by {request.user.name}. Order execution can begin.',
                    url=proposal_url(quotation),
                    entity_type='quotation',
                    entity_id=quotation.lead_id,
                )
        return Response(QuotationSerializer(quotation).data)


class QuotationRejectView(QuotationApprovalBaseView):
    """Reject a pending proposal with a reason (no OTP required)."""

    def post(self, request, lead_id):
        quotation, approval, error = self.get_context(request, lead_id)
        if error is not None:
            return error
        if quotation.status != 'Pending Approval':
            return Response(
                {'detail': 'This proposal is not awaiting approval.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if approval.status != QuotationApproval.STATUS_PENDING:
            return Response(
                {'detail': 'You have already decided on this proposal.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = str(request.data.get('reason', '') or '').strip()
        if not reason:
            return Response(
                {'detail': 'Please provide a reason for rejecting the proposal.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        approval.status = QuotationApproval.STATUS_REJECTED
        approval.rejection_reason = reason
        approval.save()
        quotation.status = 'Rejected'
        quotation.rejected_at = timezone.now()
        quotation.rejection_reason = reason
        quotation.approver = request.user
        quotation.approver_name = request.user.name
        quotation.save()
        log_activity(
            request.user,
            quotation.tenant,
            'rejected quotation',
            f'{request.user.name} rejected quotation {quotation.id} - {quotation.company}. Reason: {reason}',
            entity_type='quotation',
            entity_id=quotation.lead_id,
        )
        if quotation.submitted_by_id and quotation.submitted_by_id != request.user.id:
            notify(
                quotation.submitted_by,
                'Approval',
                'Proposal rejected',
                f'{quotation.id} - {quotation.company} was rejected by {request.user.name}. Reason: {reason}',
                url=proposal_url(quotation),
                entity_type='quotation',
                entity_id=quotation.lead_id,
            )
        return Response(QuotationSerializer(quotation).data)


class QuotationSendToClientView(APIView):
    """Send an approved quotation to the client via email / WhatsApp / link.

    Generates (or reuses) a one-time signed client token, marks the quotation
    ``Sent to Client``, and emails the proposal (with PDF) when requested.
    The signed page link is returned so the frontend can open WhatsApp or copy
    it. The link is single-use: once the client responds they cannot decide
    again.
    """

    permission_classes = [IsAuthenticated]
    CLIENT_TOKEN_DAYS = 30
    ALLOWED_CHANNELS = ('email', 'whatsapp', 'copy')

    def post(self, request, lead_id):
        if not can(request.user, 'quotation.send'):
            return Response(
                {'detail': 'You do not have permission to send quotations to clients.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        quotation = find_quotation(lead_id)
        if quotation is None:
            return Response({'detail': 'Quotation not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not request.user.is_superuser:
            lead_in_scope = scoped_queryset(request.user).filter(pk=quotation.lead_id).first() is not None
            same_company = quotation.tenant is not None and quotation.tenant == request.user.company
            if not lead_in_scope and not same_company:
                return Response({'detail': 'Quotation not found.'}, status=status.HTTP_404_NOT_FOUND)
        if quotation.status not in ('Approved', 'Sent to Client'):
            return Response(
                {'detail': 'Only approved quotations can be sent to the client.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_channels = request.data.get('channels') or []
        if isinstance(raw_channels, str):
            try:
                raw_channels = json.loads(raw_channels)
            except (TypeError, ValueError):
                raw_channels = [raw_channels]
        channels = [c for c in raw_channels if c in self.ALLOWED_CHANNELS]
        channels = list(dict.fromkeys(channels))
        if not channels:
            return Response(
                {'detail': 'Please select at least one way to send the quotation.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if 'email' in channels and not quotation.email:
            return Response(
                {'detail': 'This quotation has no client email address to send to.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if 'whatsapp' in channels and not quotation.mobile:
            return Response(
                {'detail': 'This quotation has no client mobile number to send to.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        needs_token = not quotation.client_token or (
            quotation.client_token_expires_at
            and quotation.client_token_expires_at < now
        )
        if needs_token:
            quotation.client_token = secrets.token_urlsafe(32)
            quotation.client_token_expires_at = now + timedelta(days=self.CLIENT_TOKEN_DAYS)

        origin = (request.data.get('origin') or '').strip().rstrip('/')
        path = f'/quotation/{quotation.client_token}'
        link = f'{origin}{path}' if origin else path

        email_sent = False
        email_error = None
        if 'email' in channels:
            try:
                email = build_client_email(
                    quotation,
                    link,
                    message=(request.data.get('message') or '').strip(),
                )
                email_sent = email.send(fail_silently=False) > 0
            except Exception as exc:  # email failure is reported, never blocks the action
                email_sent = False
                email_error = str(exc) or exc.__class__.__name__
                logger.warning('Failed to email quotation %s: %s', quotation.id, exc)

        # Only an actual send marks the quotation as sent; a failed email is
        # not treated as sent. Copying the link just generates it without
        # changing status.
        is_actual_send = 'email' in channels or 'whatsapp' in channels
        if is_actual_send and (email_sent or 'whatsapp' in channels):
            if quotation.status != 'Sent to Client':
                quotation.status = 'Sent to Client'
            quotation.sent_to_client_at = now
        quotation.client_status = quotation.client_status or Quotation.CLIENT_PENDING
        quotation.save()

        if is_actual_send:
            log_activity(
                request.user,
                quotation.tenant,
                'sent quotation to client',
                f'{request.user.name} sent quotation {quotation.id} - {quotation.company} to the client.',
                entity_type='quotation',
                entity_id=quotation.lead_id,
            )

        return Response(
            {
                'link': link,
                'mobile': quotation.mobile,
                'email': quotation.email,
                'channels': channels,
                'email_sent': email_sent,
                'email_error': email_error,
            },
            status=status.HTTP_200_OK,
        )


def public_quotation_payload(quotation):
    """Safe summary of a quotation for the public client page."""
    tenant = quotation.tenant
    logo_url = ''
    if tenant and tenant.logo and tenant.logo.name:
        try:
            logo_url = tenant.logo.url
        except Exception:
            logo_url = ''
    return {
        'id': quotation.id,
        'versionNo': quotation.version_no,
        'company': quotation.company,
        'customer': quotation.customer,
        'category': quotation.category,
        'city': quotation.city,
        'date': quotation.date,
        'revisionNo': quotation.revision_no,
        'total': quotation.total,
        'discount': quotation.discount,
        'netAmount': quotation.net_amount,
        'currency': quotation.currency,
        'proposalScope': quotation.proposal_scope,
        'termsConditions': quotation.terms_conditions,
        'companyTerms': (tenant.terms_summary_html or tenant.terms_full_html) if tenant else '',
        'companyName': tenant.name if tenant else '',
        'companyLogo': logo_url,
        'companyAddress': tenant.address if tenant else '',
        'companyEmail': tenant.email if tenant else '',
        'companyPhone': tenant.phone if tenant else '',
        'companyWebsite': tenant.website if tenant else '',
        'status': quotation.status,
        'clientStatus': quotation.client_status,
        'clientMessage': quotation.client_message,
        'clientRespondedAt': quotation.client_responded_at.isoformat()
        if quotation.client_responded_at
        else None,
        'versions': _public_sibling_versions(quotation),
    }


def _public_sibling_versions(quotation):
    """Other proposal versions for the same lead, for the client switcher.

    Only versions that carry a live client link are included so the client can
    compare the proposals they were actually sent. ``client_token`` fields are
    excluded to avoid handing out unsigned links in bulk.
    """
    if not quotation.lead_id:
        return []
    versions = [
        q for q in Quotation.objects
        .filter(lead_id=quotation.lead_id)
        .order_by('version_no')
    ]
    siblings = []
    for q in versions:
        if q.client_token and q.client_token_expires_at and q.client_token_expires_at >= timezone.now():
            siblings.append({
                'id': q.id,
                'versionNo': q.version_no,
                'revisionNo': q.revision_no,
                'date': q.date,
                'total': q.total,
                'netAmount': q.net_amount,
                'currency': q.currency,
                'status': q.status,
                'clientStatus': q.client_status,
            })
    return siblings


def _get_by_client_token(token):
    return Quotation.objects.filter(client_token=str(token or '')).first()


def create_order_from_quotation(quotation):
    """Create an Order record from an accepted quotation.

    Returns the created order, or an existing order for the same lead if one
    already exists so a lead never ends up with duplicate active orders
    (dedupe is per-lead, not per-version, by design).
    """
    if quotation.lead_id:
        existing = Order.objects.filter(lead_id=quotation.lead_id).first()
        if existing is not None:
            return existing
    existing = Order.objects.filter(id=quotation.id).first()
    if existing is not None:
        return existing
    return Order.objects.create(
        id=quotation.id,
        lead_id=quotation.lead_id,
        proposal_no=quotation.id,
        proposal_date=quotation.date,
        customer=quotation.customer,
        company=quotation.company,
        tenant=quotation.tenant,
        mobile=quotation.mobile,
        email=quotation.email,
        city=quotation.city,
        bdm=quotation.bdm,
        proposal_by=quotation.qtn_by,
        staff=quotation.staff,
        date=quotation.date,
        status='Pending',
        total=quotation.total,
        discount=quotation.discount,
        net_amount=quotation.net_amount,
        currency=quotation.currency or 'INR (₹)',
        category=quotation.category,
        remarks=quotation.remarks,
        scope=quotation.proposal_scope,
        details=quotation.terms_conditions,
    )


def mark_lead_as_client(lead_id):
    """Move a lead to the ``client`` stage once its order is accepted."""
    if not lead_id:
        return
    lead = Lead.objects.filter(id=lead_id).first()
    if lead is not None and lead.status != Lead.STATUS_CLIENT:
        lead.status = Lead.STATUS_CLIENT
        lead.save(update_fields=['status', 'updated_at'])


class ClientQuotationDetailView(APIView):
    """Public, unauthenticated read of an approved quotation by signed token."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, token):
        quotation = _get_by_client_token(token)
        if quotation is None:
            return Response(
                {'detail': 'This quotation link is not valid.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if quotation.client_token_expires_at and quotation.client_token_expires_at < timezone.now():
            return Response(
                {'detail': 'This quotation link has expired. Please request a fresh one.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(public_quotation_payload(quotation))


class ClientQuotationResponseView(APIView):
    """Public, unauthenticated single-use accept/decline with comments."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, token):
        quotation = _get_by_client_token(token)
        if quotation is None:
            return Response(
                {'detail': 'This quotation link is not valid.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if quotation.client_token_expires_at and quotation.client_token_expires_at < timezone.now():
            return Response(
                {'detail': 'This quotation link has expired. Please request a fresh one.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if quotation.client_status != Quotation.CLIENT_PENDING:
            return Response(
                {'detail': 'You have already responded to this quotation.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        decision = str(request.data.get('decision') or '').strip().lower()
        accepted = decision in ('accepted', 'accept', 'yes')
        declined = decision in ('declined', 'decline', 'reject', 'no')
        if not accepted and not declined:
            return Response(
                {'detail': 'Please choose to accept or decline the quotation.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        message = str(request.data.get('message') or '').strip()
        verb = 'accepted' if accepted else 'declined'
        quotation.client_status = Quotation.CLIENT_ACCEPTED if accepted else Quotation.CLIENT_DECLINED
        quotation.status = 'Accepted' if accepted else 'Declined'
        quotation.client_message = message
        quotation.client_responded_at = timezone.now()
        # Single-use: revoke the token once a decision is recorded.
        quotation.client_token = ''
        quotation.client_token_expires_at = None
        quotation.save()
        if accepted:
            # Auto-create the Order form and move the lead to the Order stage.
            order = create_order_from_quotation(quotation)
            lead = Lead.objects.filter(id=quotation.lead_id).first()
            if lead is not None and lead.status != Lead.STATUS_ORDER:
                lead.status = Lead.STATUS_ORDER
                lead.save(update_fields=['status', 'updated_at'])
            # Once any version is accepted, no other live version of the same
            # lead may be accepted later: revoke sibling links so we never end
            # up with a second order for the same deal.
            if quotation.lead_id:
                Quotation.objects.filter(
                    lead_id=quotation.lead_id,
                    client_token__gt='',
                ).exclude(pk=quotation.pk).update(
                    client_token='',
                    client_token_expires_at=None,
                )
        if quotation.submitted_by_id:
            notify(
                quotation.submitted_by,
                'Client',
                f'Client {verb} the quotation',
                (
                    f'{quotation.id} - {quotation.company} was {verb} by the client'
                    + (f'. Comment: {message}' if message else '.')
                ),
                url=proposal_url(quotation),
                entity_type='quotation',
                entity_id=quotation.lead_id,
            )
        return Response(public_quotation_payload(quotation))


class LeadAssignView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not can(request.user, 'leads.assign', 'telecall.assign'):
            return Response(
                {'detail': 'You do not have permission to assign leads to staff.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        assigned_raw = request.data.get('assigned_to')
        if isinstance(assigned_raw, str):
            assigned_raw = [assigned_raw]
        assigned_to = [str(n).strip() for n in (assigned_raw or []) if str(n).strip()]
        if not assigned_to:
            return Response(
                {'detail': 'assigned_to: At least one staff member is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if request.user.company:
            valid_names = assignment_name_set(request.user)
            unknown = [name for name in assigned_to if name not in valid_names]
            if unknown:
                return Response(
                    {'detail': f'assigned_to: Unknown staff member(s): {", ".join(unknown)}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        lead_ids_raw = request.data.get('lead_ids')
        if isinstance(lead_ids_raw, str):
            try:
                lead_ids_raw = json.loads(lead_ids_raw)
            except (TypeError, ValueError):
                lead_ids_raw = [lead_ids_raw]
        lead_ids = [str(i).strip() for i in (lead_ids_raw or []) if str(i).strip()]

        if lead_ids:
            base = scoped_queryset(request.user, Lead.STATUS_RAW).filter(
                assigned_to='', pk__in=lead_ids
            )
            found = set(base.values_list('pk', flat=True))
            if len(found) < len(lead_ids):
                missing = [i for i in lead_ids if i not in found]
                return Response(
                    {'detail': f'Some selected lead(s) are no longer assignable: {", ".join(missing)}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            leads = list(base.order_by('-created_at'))
        else:
            category = (request.data.get('category') or '').strip()
            from_date = request.data.get('from_date') or ''
            to_date = request.data.get('to_date') or ''
            try:
                count = int(request.data.get('count') or 0)
            except (TypeError, ValueError):
                count = 0
            if count <= 0:
                count = 1

            queryset = scoped_queryset(request.user, Lead.STATUS_RAW).filter(assigned_to='')
            if category and category != 'All Categories':
                queryset = queryset.filter(category=category)
            if from_date:
                queryset = queryset.filter(date__gte=from_date)
            if to_date:
                queryset = queryset.filter(date__lte=to_date)

            leads = list(queryset.order_by('-created_at')[:count])

        if not leads:
            return Response(
                {'detail': 'No matching raw leads for the given filters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        updated = []
        for index, lead in enumerate(leads):
            assignee = assigned_to[index % len(assigned_to)]
            lead.assigned_to = assignee
            lead.tenant = request.user.company
            lead.status = Lead.STATUS_ASSIGNED
            lead.call_status = 'Pending Call'
            lead.remarks = 'Newly assigned from raw data.'
            lead.save(update_fields=[
                'assigned_to', 'tenant', 'status', 'call_status', 'remarks', 'updated_at',
            ])
            updated.append(lead)

        log_activity(
            request.user,
            request.user.company,
            'assigned leads',
            f'{request.user.name} assigned {len(updated)} lead(s) to {", ".join(assigned_to)}.',
        )

        return Response(
            {
                'assigned': len(updated),
                'assigned_to': assigned_to,
                'leads': LeadSerializer(updated, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ProposalTemplateListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        templates = ProposalTemplate.objects.filter(
            Q(owner=request.user) | Q(owner__isnull=True)
        )
        return Response(ProposalTemplateSerializer(templates, many=True).data)

    def post(self, request):
        if not can(request.user, 'quotation.create', 'quotation.edit'):
            return Response(
                {'detail': 'You do not have permission to create proposal templates.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response(
                {'detail': 'name: A template name is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name_dup = ProposalTemplate.objects.filter(
            owner=request.user, name__iexact=name
        ).first()
        if name_dup is not None:
            return Response(
                {'detail': 'A template with this name already exists. Please choose another name.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = ProposalTemplateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        template = serializer.save(owner=request.user)
        return Response(
            ProposalTemplateSerializer(template).data,
            status=status.HTTP_201_CREATED,
        )


class ProposalTemplateDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        return ProposalTemplate.objects.filter(
            Q(owner=request.user) | Q(owner__isnull=True),
            pk=pk,
        ).first()

    def put(self, request, pk):
        template = self.get_object(request, pk)
        if template is None or template.owner_id != request.user.id:
            return Response(
                {'detail': 'Template not found or you do not own it.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        name = (request.data.get('name') or '').strip()
        if name:
            name_dup = ProposalTemplate.objects.filter(
                owner=request.user, name__iexact=name
            ).exclude(pk=template.pk).first()
            if name_dup is not None:
                return Response(
                    {'detail': 'A template with this name already exists. Please choose another name.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        serializer = ProposalTemplateSerializer(template, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        template = serializer.save()
        return Response(ProposalTemplateSerializer(template).data)

    def delete(self, request, pk):
        template = self.get_object(request, pk)
        if template is None or template.owner_id != request.user.id:
            return Response(
                {'detail': 'Template not found or you do not own it.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProposalDraftView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        proposal_id = request.query_params.get('proposal_id') or ''
        draft = ProposalDraft.objects.filter(
            user=request.user,
            proposal_id=proposal_id,
        ).first()
        if draft is None:
            return Response({}, status=status.HTTP_200_OK)
        return Response(ProposalDraftSerializer(draft).data)

    def put(self, request):
        proposal_id = str(request.data.get('proposalId') or request.data.get('proposal_id') or '').strip()
        draft, _ = ProposalDraft.objects.get_or_create(
            user=request.user,
            proposal_id=proposal_id,
        )
        data = dict(request.data)
        data['proposalId'] = proposal_id
        serializer = ProposalDraftSerializer(draft, data=data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        draft = serializer.save()
        return Response(ProposalDraftSerializer(draft).data)

    def delete(self, request):
        proposal_id = request.query_params.get('proposal_id') or ''
        ProposalDraft.objects.filter(
            user=request.user,
            proposal_id=proposal_id,
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def scoped_orders(user):
    """Return the Order queryset visible to ``user`` (superusers see all)."""
    qs = Order.objects.all()
    if not user.is_superuser:
        qs = qs.filter(Q(tenant=user.company) | Q(tenant__isnull=True))
    return qs


def generate_client_detail_id():
    existing = set(ClientDetail.objects.values_list('id', flat=True))
    for _ in range(200):
        candidate = f'CD-{random.randint(100000, 999999)}'
        if candidate not in existing:
            return candidate
    return f'CD-{random.randint(1000000, 9999999)}'


def scoped_client_details(user):
    """Return the ClientDetail queryset visible to ``user`` (superusers see all)."""
    qs = ClientDetail.objects.all()
    if not user.is_superuser:
        qs = qs.filter(Q(tenant=user.company) | Q(tenant__isnull=True))
    return qs


# Allowed handover material and its upload limits.
ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024  # 10 MB per file
ATTACHMENT_ALLOWED_MIME = {
    'application/pdf',
}
ATTACHMENT_ALLOWED_TYPE_PREFIXES = ('image/', 'audio/')

# Canonical client-detail status lifecycle (frontend tab rail mirrors this).
CLIENT_DETAIL_STATUSES = [code for code, _ in ClientDetail.STATUS_CHOICES]


def validate_client_detail_status(request):
    value = request.data.get('status')
    if value and value not in CLIENT_DETAIL_STATUSES:
        return Response(
            {'detail': f'status: "{value}" is not a valid status.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return None


def format_attachment_size(size):
    size = int(size or 0)
    if size < 1024:
        return f'{size} B'
    if size < 1024 * 1024:
        return f'{size // 1024} KB'
    return f'{size / (1024 * 1024):.1f} MB'


def guess_attachment_type(mime):
    if mime == 'application/pdf':
        return 'SRS Document'
    if mime.startswith('image/'):
        return 'Business Card'
    if mime.startswith('audio/'):
        return 'Voice Clip'
    return 'Other'


class ClientDetailAttachmentView(APIView):
    """Upload a handover file (PDF / image / audio) onto a client detail.

    Files are validated (MIME + size) and stored per organization via the
    attachment's upload path. Returns the serialized attachment.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not can(request.user, 'client.create', 'client.edit'):
            return Response(
                {'detail': 'You do not have permission to edit client details.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        record = scoped_client_details(request.user).filter(pk=pk).first()
        if record is None:
            return Response({'detail': 'Client detail not found.'}, status=status.HTTP_404_NOT_FOUND)
        uploaded = request.FILES.get('file')
        if uploaded is None:
            return Response({'detail': 'Please attach a file to upload.'}, status=status.HTTP_400_BAD_REQUEST)
        mime = (uploaded.content_type or '').lower()
        if mime != 'application/pdf' and not mime.startswith(ATTACHMENT_ALLOWED_TYPE_PREFIXES):
            return Response(
                {'detail': 'Only PDF, image and audio files can be uploaded.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if uploaded.size > ATTACHMENT_MAX_BYTES:
            return Response(
                {'detail': f'File exceeds the {ATTACHMENT_MAX_BYTES // (1024 * 1024)} MB upload limit.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        label = str(request.data.get('type') or '').strip() or guess_attachment_type(mime)
        attachment = Attachment(
            client_detail=record,
            type=label,
            name=uploaded.name,
            mime=mime,
            size=format_attachment_size(uploaded.size),
        )
        attachment.file.save(uploaded.name, uploaded, save=False)
        attachment.url = attachment.file.url
        attachment.save()
        return Response(
            AttachmentSerializer(attachment).data,
            status=status.HTTP_201_CREATED,
        )


class ClientDetailAttachmentDeleteView(APIView):
    """Remove a handover file (storage + record row)."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, aid):
        if not can(request.user, 'client.edit'):
            return Response(
                {'detail': 'You do not have permission to edit client details.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        record = scoped_client_details(request.user).filter(pk=pk).first()
        if record is None:
            return Response({'detail': 'Client detail not found.'}, status=status.HTTP_404_NOT_FOUND)
        attachment = Attachment.objects.filter(pk=aid, client_detail=record).first()
        if attachment is None:
            return Response({'detail': 'Attachment not found.'}, status=status.HTTP_404_NOT_FOUND)
        if attachment.file:
            attachment.file.delete(save=False)
        attachment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ClientDetailListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can(request.user, 'client.view'):
            return Response(
                {'detail': 'You do not have permission to view client details.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        records = scoped_client_details(request.user).order_by('-created_at')
        records = records.prefetch_related('attachments')
        return Response(ClientDetailSerializer(records, many=True).data)

    def post(self, request):
        if not can(request.user, 'client.create', 'client.edit'):
            return Response(
                {'detail': 'You do not have permission to add client details.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        company = str(request.data.get('company') or '').strip()
        if not company:
            return Response(
                {'detail': 'company: This field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        status_error = validate_client_detail_status(request)
        if status_error is not None:
            return status_error
        order_no = str(request.data.get('orderNo') or '').strip()
        created = False
        record = None
        if order_no:
            # Scope the upsert lookup to the requester's own company so a
            # matching order_no in another tenant is never found or overwritten.
            record = ClientDetail.objects.filter(
                order_no=order_no,
                tenant=request.user.company,
            ).first()
        if record is None:
            # The record id is derived from order_no (CD-<order_no>). If that
            # id is already taken by another tenant, fall back to a random id
            # instead of colliding on the primary key.
            candidate_id = f'CD-{order_no}' if order_no else generate_client_detail_id()
            if order_no and ClientDetail.objects.filter(pk=candidate_id).exists():
                candidate_id = generate_client_detail_id()
            record = ClientDetail(
                id=candidate_id,
                order_no=order_no,
                company=company,
                tenant=request.user.company,
            )
            created = True
        serializer = ClientDetailSerializer(record, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        record = serializer.save()
        if created:
            status_code = status.HTTP_201_CREATED
            log_activity(
                request.user,
                request.user.company,
                'recorded client details',
                f'{request.user.name} recorded client details for {record.company}.',
                entity_type='client',
                entity_id=record.id,
            )
        else:
            status_code = status.HTTP_200_OK
            log_activity(
                request.user,
                request.user.company,
                'updated client details',
                f'{request.user.name} updated client details for {record.company}.',
                entity_type='client',
                entity_id=record.id,
            )
        # Only flip the linked lead to the client stage when that lead actually
        # belongs to this caller's company (never mutate another tenant's lead).
        if record.lead_id:
            lead = scoped_queryset(request.user).filter(pk=record.lead_id).first()
            if lead is not None:
                mark_lead_as_client(lead.id)
        return Response(
            ClientDetailSerializer(record).data,
            status=status_code,
        )


class ClientDetailDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_scoped_record(self, request, pk):
        return scoped_client_details(request.user).filter(pk=pk).first()

    def get(self, request, pk):
        if not can(request.user, 'client.view'):
            return Response(
                {'detail': 'You do not have permission to view client details.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        record = self._get_scoped_record(request, pk)
        if record is None:
            return Response({'detail': 'Client detail not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ClientDetailSerializer(record).data)

    def put(self, request, pk):
        if not can(request.user, 'client.create', 'client.edit'):
            return Response(
                {'detail': 'You do not have permission to edit client details.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        record = self._get_scoped_record(request, pk)
        if record is None:
            return Response({'detail': 'Client detail not found.'}, status=status.HTTP_404_NOT_FOUND)
        status_error = validate_client_detail_status(request)
        if status_error is not None:
            return status_error
        serializer = ClientDetailSerializer(record, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        record = serializer.save()
        if record.lead_id:
            mark_lead_as_client(record.lead_id)
        log_activity(
            request.user,
            request.user.company,
            'updated client details',
            f'{request.user.name} updated client details for {record.company}.',
            entity_type='client',
            entity_id=record.id,
        )
        return Response(ClientDetailSerializer(record).data)

    def delete(self, request, pk):
        # Client details are permanent business records: only platform
        # superusers may delete one (e.g. via Django admin cleanup).
        if not request.user.is_superuser:
            return Response(
                {'detail': 'You do not have permission to delete client details.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        record = self._get_scoped_record(request, pk)
        if record is None:
            return Response({'detail': 'Client detail not found.'}, status=status.HTTP_404_NOT_FOUND)
        label = record.id
        record.delete()
        log_activity(
            request.user,
            request.user.company,
            'deleted client details',
            f'{request.user.name} deleted client details {label}.',
            entity_type='client',
            entity_id=label,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrderListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can(request.user, 'order.view'):
            return Response(
                {'detail': 'You do not have permission to view orders.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        orders = scoped_orders(request.user).order_by('-created_at')
        return Response(OrderSerializer(orders, many=True).data)

    def post(self, request):
        if not can(request.user, 'order.create'):
            return Response(
                {'detail': 'You do not have permission to create orders.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        data = dict(request.data)
        order_id = str(data.get('id') or '').strip()
        if not order_id:
            return Response(
                {'detail': 'id: An order number is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        existing = Order.objects.filter(id=order_id).first()
        if existing is not None:
            return Response(
                {'detail': f'An order with the number {order_id} already exists.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = OrderSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        order = serializer.save(tenant=request.user.company)
        log_activity(
            request.user,
            request.user.company,
            'created order',
            f'{request.user.name} created order {order.id} for {order.company}.',
            entity_type='order',
            entity_id=order.id,
        )
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_scoped_order(self, request, pk):
        order = scoped_orders(request.user).filter(pk=pk).first()
        if order is None and not request.user.is_superuser:
            order = Order.objects.filter(
                pk=pk,
                tenant=request.user.company,
            ).first()
        return order

    def get(self, request, pk):
        if not can(request.user, 'order.view'):
            return Response(
                {'detail': 'You do not have permission to view orders.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        order = self._get_scoped_order(request, pk)
        if order is None:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(OrderSerializer(order).data)

    def put(self, request, pk):
        if not can(request.user, 'order.create', 'order.edit'):
            return Response(
                {'detail': 'You do not have permission to create or edit orders.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        order = self._get_scoped_order(request, pk)
        if order is None:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = OrderSerializer(order, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        order = serializer.save()
        if order.status == 'Accepted':
            # An accepted order moves out of Manage Orders and into Client
            # Details: create the client record and convert the lead.
            create_client_detail_from_order(order)
            mark_lead_as_client(order.lead_id)
            log_activity(
                request.user,
                request.user.company,
                'accepted order',
                f'{request.user.name} accepted order {order.id} for {order.company}.',
                entity_type='order',
                entity_id=order.id,
            )
        else:
            log_activity(
                request.user,
                request.user.company,
                'updated order',
                f'{request.user.name} updated order {order.id} for {order.company}.',
                entity_type='order',
                entity_id=order.id,
            )
        return Response(OrderSerializer(order).data)

    def delete(self, request, pk):
        if not can(request.user, 'order.delete'):
            return Response(
                {'detail': 'You do not have permission to delete orders.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        order = self._get_scoped_order(request, pk)
        if order is None:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)
        label = order.id
        order.delete()
        log_activity(
            request.user,
            request.user.company,
            'deleted order',
            f'{request.user.name} deleted order {label}.',
            entity_type='order',
            entity_id=label,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


def order_url(order):
    """Preview URL for a specific order."""
    if order is None:
        return ''
    return f'/orders/preview/{order.id}'


class OrderSendToClientView(APIView):
    """Send an order form to the client via email / WhatsApp / link.

    Generates (or reuses) a one-time signed client token, marks the order
    ``Sent to Client``, and emails the order form (with PDF) when requested.
    The signed page link is returned so the frontend can open WhatsApp or copy
    it. The link is single-use: once the client responds they cannot decide
    again.
    """

    permission_classes = [IsAuthenticated]
    CLIENT_TOKEN_DAYS = 30
    ALLOWED_CHANNELS = ('email', 'whatsapp', 'copy')

    def post(self, request, pk):
        if not (request.user.is_superuser or can(request.user, 'order.edit')):
            return Response(
                {'detail': 'You do not have permission to send orders to clients.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        order = scoped_orders(request.user).filter(pk=pk).first()
        if order is None:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        raw_channels = request.data.get('channels') or []
        if isinstance(raw_channels, str):
            try:
                raw_channels = json.loads(raw_channels)
            except (TypeError, ValueError):
                raw_channels = [raw_channels]
        channels = [c for c in raw_channels if c in self.ALLOWED_CHANNELS]
        channels = list(dict.fromkeys(channels))
        if not channels:
            return Response(
                {'detail': 'Please select at least one way to send the order.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if 'email' in channels and not order.email:
            return Response(
                {'detail': 'This order has no client email address to send to.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if 'whatsapp' in channels and not order.mobile:
            return Response(
                {'detail': 'This order has no client mobile number to send to.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        needs_token = not order.client_token or (
            order.client_token_expires_at
            and order.client_token_expires_at < now
        )
        if needs_token:
            order.client_token = secrets.token_urlsafe(32)
            order.client_token_expires_at = now + timedelta(days=self.CLIENT_TOKEN_DAYS)

        origin = (request.data.get('origin') or '').strip().rstrip('/')
        path = f'/order/{order.client_token}'
        link = f'{origin}{path}' if origin else path

        email_sent = False
        email_error = None
        if 'email' in channels:
            try:
                email = build_order_client_email(
                    order,
                    link,
                    message=(request.data.get('message') or '').strip(),
                )
                email_sent = email.send(fail_silently=False) > 0
            except Exception as exc:  # email failure is reported, never blocks the action
                email_sent = False
                email_error = str(exc) or exc.__class__.__name__
                logger.warning('Failed to email order %s: %s', order.id, exc)

        # Only an actual send marks the order as sent; a failed email is not
        # treated as sent. Copying the link just generates it without changing
        # status.
        is_actual_send = 'email' in channels or 'whatsapp' in channels
        if is_actual_send and (email_sent or 'whatsapp' in channels):
            if order.status != 'Sent to Client':
                order.status = 'Sent to Client'
            order.sent_to_client_at = now
        order.client_status = order.client_status or Order.CLIENT_PENDING
        order.save()

        return Response(
            {
                'link': link,
                'mobile': order.mobile,
                'email': order.email,
                'channels': channels,
                'email_sent': email_sent,
                'email_error': email_error,
            },
            status=status.HTTP_200_OK,
        )


def public_order_payload(order):
    """Safe summary of an order for the public client page."""
    tenant = order.tenant
    logo_url = ''
    if tenant and tenant.logo and tenant.logo.name:
        try:
            logo_url = tenant.logo.url
        except Exception:
            logo_url = ''
    return {
        'id': order.id,
        'proposalNo': order.proposal_no,
        'proposalDate': order.proposal_date,
        'company': order.company,
        'customer': order.customer,
        'category': order.category,
        'city': order.city,
        'date': order.date,
        'total': order.total,
        'discount': order.discount,
        'netAmount': order.net_amount,
        'currency': order.currency,
        'scope': order.scope,
        'details': order.details,
        'companyTerms': (tenant.terms_summary_html or tenant.terms_full_html) if tenant else '',
        'companyName': tenant.name if tenant else '',
        'companyLogo': logo_url,
        'companyAddress': tenant.address if tenant else '',
        'companyEmail': tenant.email if tenant else '',
        'companyPhone': tenant.phone if tenant else '',
        'companyWebsite': tenant.website if tenant else '',
        'status': order.status,
        'clientStatus': order.client_status,
        'clientMessage': order.client_message,
        'clientRespondedAt': order.client_responded_at.isoformat()
        if order.client_responded_at
        else None,
    }


def _get_order_by_client_token(token):
    return Order.objects.filter(client_token=str(token or '')).first()


class ClientOrderDetailView(APIView):
    """Public, unauthenticated read of an order form by signed token."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, token):
        order = _get_order_by_client_token(token)
        if order is None:
            return Response(
                {'detail': 'This order link is not valid.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if order.client_token_expires_at and order.client_token_expires_at < timezone.now():
            return Response(
                {'detail': 'This order link has expired. Please request a fresh one.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(public_order_payload(order))


class DashboardStatsView(APIView):
    """Aggregate dashboard metrics from the current user's scoped lead data.

    Accepts ``group_by`` (``daily`` | ``monthly`` | ``yearly``) and optional
    ``start_date`` / ``end_date`` (``YYYY-MM-DD``). Defaults to the last 31
    days. All date bucketing is based on the lead's ``date`` field.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can(request.user, 'leads.view', 'telecall.view'):
            return Response(
                {'detail': 'You do not have permission to view dashboard data.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            start_date = date.fromisoformat(request.query_params.get('start_date'))
            end_date = date.fromisoformat(request.query_params.get('end_date'))
        except (TypeError, ValueError):
            end_date = date.today()
            start_date = end_date - timedelta(days=30)

        group_by = request.query_params.get('group_by') or 'daily'
        if group_by not in ('daily', 'monthly', 'yearly'):
            group_by = 'daily'

        # Daily bucketing for the trend series unless monthly/yearly requested.
        bucket_fn = {'daily': TruncDay, 'monthly': TruncMonth, 'yearly': TruncYear}[group_by]

        scoped = scoped_queryset(request.user).filter(date__range=(start_date, end_date))
        total_leads = scoped.count()

        # Contacted: a lead counts as contacted if it has call history rows, a
        # non-default call_status, or has progressed past the assigned stage.
        contacted_qs = scoped.filter(
            Q(history__isnull=False)
            | ~Q(call_status='Pending Call')
            | Q(status__in=[Lead.STATUS_QUOTATION, Lead.STATUS_ORDER, Lead.STATUS_CLIENT])
        ).distinct()
        contacted_total = contacted_qs.count()

        # Sources breakdown.
        source_rows = (
            scoped.exclude(source='')
            .values('source')
            .annotate(value=Count('id'))
            .order_by('-value')
        )
        source_data = []
        source_colors = [
            '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981',
            '#f97316', '#64748b', '#ef4444', '#06b6d4',
        ]
        for i, row in enumerate(source_rows):
            source_data.append({
                'name': row['source'],
                'value': row['value'],
                'color': source_colors[i % len(source_colors)],
            })

        # Conversion funnel stages are independent current-stage counts so each
        # bar reflects where leads are right now (no cumulative double counting).
        funnel = {
            'raw': scoped.filter(status=Lead.STATUS_RAW).count(),
            'assigned': scoped.filter(status=Lead.STATUS_ASSIGNED).count(),
            'quotation': scoped.filter(status=Lead.STATUS_QUOTATION).count(),
            'order': scoped.filter(status=Lead.STATUS_ORDER).count(),
            'client': scoped.filter(status=Lead.STATUS_CLIENT).count(),
            'contacted': contacted_total,
            'interested': (
                scoped.filter(
                    Q(call_status__in=['Interested', 'Quotation Requested', 'Considering'])
                    | Q(status__in=[Lead.STATUS_QUOTATION, Lead.STATUS_ORDER, Lead.STATUS_CLIENT])
                ).count()
            ),
            'total': total_leads,
        }

        # KPIs within range.
        hot_leads = scoped.filter(priority__icontains='hot').count()

        # Follow-up due = flagged for follow-up AND the due date is today/past
        # (or no parseable date was stored). Future-dated follow-ups are not due.
        follow_ups_due = 0
        due_leads = scoped.filter(has_follow_up=True).only('next_follow_up_date')
        for lead in due_leads:
            due_date = parse_due_date(lead.next_follow_up_date)
            if due_date is None or due_date <= date.today():
                follow_ups_due += 1

        # Open quotations = leads in the quotation stage that have NOT had a
        # proposal declined (declined proposals are no longer open pipeline).
        declined_lead_ids = Quotation.objects.filter(
            lead_id__in=scoped.filter(status=Lead.STATUS_QUOTATION).values_list('id', flat=True),
            status='Declined',
        ).values_list('lead_id', flat=True)
        open_quotations = scoped.filter(
            status=Lead.STATUS_QUOTATION
        ).exclude(id__in=list(declined_lead_ids)).count()

        # Orders accepted = orders whose client actually accepted, counted by
        # the order date in the period (not by lead status, which includes
        # pending/declined orders).
        orders_accepted = Order.objects.filter(
            lead_id__in=scoped.values_list('id', flat=True),
            client_status=Order.CLIENT_ACCEPTED,
            created_at__date__range=(start_date, end_date),
        ).count()

        # Calls in period are counted by their own call date across the leads
        # the user can see — a call on an older lead still counts.
        scoped_all = scoped_queryset(request.user)
        calls_in_period = CallHistory.objects.filter(
            lead_id__in=scoped_all.values_list('id', flat=True),
            created_at__date__range=(start_date, end_date),
        ).count()

        # Trend series bucketed by the chosen interval.
        # Group leads and contacted leads separately, then merge.
        trend = []
        trend_map = {}
        for row in scoped.annotate(bucket=bucket_fn('date')).values('bucket'):
            key = row['bucket']
            if key is None:
                continue
            trend_map.setdefault(key, {'leads': 0, 'contacted': 0})
            trend_map[key]['leads'] += 1
        for row in contacted_qs.annotate(bucket=bucket_fn('date')).values('bucket'):
            key = row['bucket']
            if key is None:
                continue
            trend_map.setdefault(key, {'leads': 0, 'contacted': 0})
            trend_map[key]['contacted'] += 1

        for key in sorted(trend_map):
            trend.append({
                'label': self._label(key),
                'leads': trend_map[key]['leads'],
                'contacted': trend_map[key]['contacted'],
            })

        # Quotation / order pipeline bucketed the same way (counts by lead status).
        quoted_map = {}
        ordered_map = {}
        for row in scoped.annotate(bucket=bucket_fn('date')).filter(status=Lead.STATUS_QUOTATION).values('bucket'):
            key = row['bucket']
            if key is None:
                continue
            quoted_map[key] = quoted_map.get(key, 0) + 1
        for row in scoped.annotate(bucket=bucket_fn('date')).filter(status__in=[Lead.STATUS_ORDER, Lead.STATUS_CLIENT]).values('bucket'):
            key = row['bucket']
            if key is None:
                continue
            ordered_map[key] = ordered_map.get(key, 0) + 1

        pipeline = []
        for key in sorted(set(trend_map) | set(quoted_map) | set(ordered_map)):
            pipeline.append({
                'label': self._label(key),
                'quotations': quoted_map.get(key, 0),
                'orders': ordered_map.get(key, 0),
            })

        # Team performance: group by assigned_to within range.
        team_rows = (
            scoped.exclude(assigned_to='')
            .values('assigned_to')
            .annotate(quotation_count=Count('id'))
            .order_by('-quotation_count')
        )
        team = []
        for row in team_rows[:8]:
            name = row['assigned_to']
            person_qs = scoped.filter(assigned_to=name)
            team.append({
                'name': name,
                'quotations': person_qs.filter(status=Lead.STATUS_QUOTATION).count(),
                'orders': person_qs.filter(status__in=[Lead.STATUS_ORDER, Lead.STATUS_CLIENT]).count(),
            })

        # Hot leads requiring action (highest priority, most recent).
        hot_leads_list = []
        for lead in scoped.filter(priority__icontains='hot').order_by('-created_at')[:3]:
            status_text = dict(Lead.STATUS_CHOICES).get(lead.status, lead.status)
            hot_leads_list.append({
                'id': lead.id,
                'company': lead.company,
                'category': lead.category,
                'phone': lead.phone,
                'status': status_text,
                'priority': lead.priority or 'Hot',
                'assignedTo': lead.assigned_to,
                'nextAction': 'Send Quotation' if lead.status == Lead.STATUS_QUOTATION else 'Follow Up',
                'due': '',
            })

        return Response({
            'range': {'start_date': start_date.isoformat(), 'end_date': end_date.isoformat()},
            'group_by': group_by,
            'kpis': {
                'total_leads': total_leads,
                'calls_in_period': calls_in_period,
                'hot_leads': hot_leads,
                'follow_ups_due': follow_ups_due,
                'open_quotations': open_quotations,
                'orders_accepted': orders_accepted,
            },
            'trend': trend,
            'sources': source_data,
            'funnel': funnel,
            'pipeline': pipeline,
            'team': team,
            'hot_leads_list': hot_leads_list,
        })

    @staticmethod
    def _label(key):
        if key is None:
            return ''
        return key.strftime('%d %b %Y')


class ClientOrderResponseView(APIView):
    """Public, unauthenticated single-use accept/decline with comments."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, token):
        order = _get_order_by_client_token(token)
        if order is None:
            return Response(
                {'detail': 'This order link is not valid.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if order.client_token_expires_at and order.client_token_expires_at < timezone.now():
            return Response(
                {'detail': 'This order link has expired. Please request a fresh one.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if order.client_status != Order.CLIENT_PENDING:
            return Response(
                {'detail': 'You have already responded to this order.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        decision = str(request.data.get('decision') or '').strip().lower()
        accepted = decision in ('accepted', 'accept', 'yes')
        declined = decision in ('declined', 'decline', 'reject', 'no')
        if not accepted and not declined:
            return Response(
                {'detail': 'Please choose to accept or decline the order.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        message = str(request.data.get('message') or '').strip()
        verb = 'accepted' if accepted else 'declined'
        order.client_status = Order.CLIENT_ACCEPTED if accepted else Order.CLIENT_DECLINED
        order.status = 'Accepted' if accepted else 'Rejected'
        order.client_message = message
        order.client_responded_at = timezone.now()
        # Single-use: revoke the token once a decision is recorded.
        order.client_token = ''
        order.client_token_expires_at = None
        order.save()
        if accepted:
            # An accepted order moves out of Manage Orders and into Client
            # Details: create the client record and convert the lead.
            create_client_detail_from_order(order)
            mark_lead_as_client(order.lead_id)

        staff_member = None
        # Resolve the staff member within this order's own company so an
        # employee with the same name in another tenant is never notified.
        company_filter = {'company': order.tenant_id} if order.tenant_id else {}
        if order.proposal_by:
            staff_member = User.objects.filter(name__iexact=order.proposal_by, **company_filter).first()
        if staff_member is None and order.staff:
            staff_member = User.objects.filter(name__iexact=order.staff, **company_filter).first()
        if staff_member is not None:
            notify(
                staff_member,
                'Client',
                f'Client {verb} the order',
                (
                    f'{order.id} - {order.company} was {verb} by the client'
                    + (f'. Comment: {message}' if message else '.')
                ),
                url=order_url(order),
                entity_type='order',
                entity_id=order.id,
            )

        return Response(public_order_payload(order))