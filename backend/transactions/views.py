import random
from datetime import date, datetime

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import can

from .models import CallHistory, Lead, Quotation
from .serializers import LeadSerializer, QuotationSerializer

User = get_user_model()


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
        leads = scoped_queryset(request.user, status_filter)
        return Response(LeadSerializer(leads.order_by('-created_at'), many=True).data)

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
        phone = request.data.get('phone', '').strip()
        lead_date = date.today()
        try:
            lead = Lead.objects.create(
                id=generate_lead_id(),
                company=company,
                tenant=request.user.company,
                contact=request.data.get('contact', '').strip(),
                phone=phone,
                email=request.data.get('email', '').strip(),
                category=request.data.get('category', '').strip(),
                source=request.data.get('source', '').strip(),
                city=request.data.get('city', '').strip(),
                date=lead_date,
                display_date=format_display_date(lead_date),
                added_by=request.user.name,
                status=Lead.STATUS_RAW,
            )
        except IntegrityError:
            # Concurrent duplicate insert lost the race at the DB level:
            # return the existing record as a clean 409 instead of a 500.
            existing = find_duplicate_lead(request.user, company)
            if existing is not None:
                return duplicate_response(existing)
            raise
        return Response(LeadSerializer(lead).data, status=status.HTTP_201_CREATED)


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
            # Assigned leads are edited by the assigned staff or telecall editors.
            can_edit = user.has_permission('telecall.edit') or lead.assigned_to == user.name
        if not can_edit:
            return Response(
                {'detail': 'You do not have permission to edit this lead.'},
                status=status.HTTP_403_FORBIDDEN,
            )
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
        if lead.call_status == 'Quotation Requested' and lead.status != Lead.STATUS_QUOTATION:
            lead.status = Lead.STATUS_QUOTATION
            lead.save(update_fields=['status', 'updated_at'])
        if 'call_status' in request.data and lead.call_status != 'Pending Call':
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
        return Response(LeadSerializer(lead).data)

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
        lead.delete()
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

    def put(self, request, lead_id):
        if not can(request.user, 'quotation.view'):
            return Response(
                {'detail': 'You do not have permission to manage quotations.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        lead = scoped_queryset(request.user).filter(pk=lead_id).first()
        if lead is None:
            return Response(
                {'detail': 'Lead not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        quotation = Quotation.objects.filter(lead_id=lead_id).first()
        if quotation is None:
            quotation = Quotation(id=lead_id, lead_id=lead_id, tenant=request.user.company, company=lead.company)
        for camel, field in self.QUOTATION_FIELDS.items():
            if camel in request.data:
                value = request.data.get(camel)
                setattr(quotation, field, value if value is not None else '')
        quotation.save()
        return Response(QuotationSerializer(quotation).data)

    def delete(self, request, lead_id):
        if not can(request.user, 'quotation.view'):
            return Response(
                {'detail': 'You do not have permission to manage quotations.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        Quotation.objects.filter(lead_id=lead_id).delete()
        lead = scoped_queryset(request.user).filter(pk=lead_id).first()
        if lead is not None:
            lead.status = Lead.STATUS_ASSIGNED
            lead.call_status = 'Pending Call'
            lead.save(update_fields=['status', 'call_status', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class LeadAssignView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not can(request.user, 'leads.assign'):
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
            valid_names = set(
                User.objects
                .filter(company=request.user.company)
                .exclude(is_superuser=True)
                .values_list('name', flat=True)
            )
            unknown = [name for name in assigned_to if name not in valid_names]
            if unknown:
                return Response(
                    {'detail': f'assigned_to: Unknown staff member(s): {", ".join(unknown)}.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
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

        return Response(
            {
                'assigned': len(updated),
                'assigned_to': assigned_to,
                'leads': LeadSerializer(updated, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )