import random
from datetime import date

from django.db import IntegrityError
from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import can

from .models import RawLead, TelecallLead
from .serializers import RawLeadSerializer, TelecallLeadSerializer


def generate_raw_id():
    existing = set(RawLead.objects.values_list('id', flat=True))
    for _ in range(200):
        candidate = f'RAW-{random.randint(100000, 999999)}'
        if candidate not in existing:
            return candidate
    return f'RAW-{random.randint(1000000, 9999999)}'


def generate_telecall_id():
    existing = set(TelecallLead.objects.values_list('id', flat=True))
    for _ in range(200):
        candidate = f'TC-{random.randint(10000, 99999)}'
        if candidate not in existing:
            return candidate
    return f'TC-{random.randint(100000, 999999)}'


def scoped_queryset(user):
    if user.is_superuser:
        return RawLead.objects.all()
    if user.has_permission('leads.view_all'):
        # Managers/admins see their company's records plus legacy unassigned rows.
        return RawLead.objects.filter(
            Q(tenant=user.company) | Q(tenant__isnull=True)
        )
    # Regular staff only see the records they added themselves.
    return RawLead.objects.filter(added_by=user.name)


def telecall_scoped_queryset(user):
    """Return the TelecallLead queryset visible to ``user``.

    Managers/admins/superusers (holding ``leads.view_all``) see every assigned
    lead for their company (plus legacy unassigned rows); regular staff only see
    the leads assigned to them. Everything is scoped to the user's company.
    """
    qs = TelecallLead.objects.filter(Q(tenant=user.company) | Q(tenant__isnull=True))
    if not user.is_superuser and not user.has_permission('leads.view_all'):
        qs = qs.filter(assigned_to=user.name)
    return qs


def format_display_date(value):
    return value.strftime('%d %b %Y') if value else ''


def find_duplicate_lead(user, company):
    """Return an existing RawLead with the same normalized company name, from
    across the org (not just the current user's own records)."""
    queryset = RawLead.objects.all()
    if not user.is_superuser:
        queryset = queryset.filter(Q(tenant=user.company) | Q(tenant__isnull=True))
    return queryset.filter(company__iexact=company).only(
        'id', 'company', 'contact', 'phone', 'category', 'city', 'added_by',
        'display_date', 'date',
    ).first()


def duplicate_response(existing):
    added_by = existing.added_by or 'another user'
    when = existing.display_date or (format_display_date(existing.date) if existing.date else '')
    when_text = f' on {when}' if when else ''
    return Response(
        {
            'detail': f'This lead was already entered by {added_by}{when_text}. '
                      f'Please use the existing record.',
            'existing': RawLeadSerializer(existing).data,
        },
        status=status.HTTP_409_CONFLICT,
    )


class RawLeadListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can(request.user, 'leads.view'):
            return Response(
                {'detail': 'You do not have permission to view leads.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        leads = scoped_queryset(request.user)
        return Response(RawLeadSerializer(leads.order_by('-created_at'), many=True).data)

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
            lead = RawLead.objects.create(
                id=generate_raw_id(),
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
            )
        except IntegrityError:
            # Concurrent duplicate insert lost the race at the DB level:
            # return the existing record as a clean 409 instead of a 500.
            existing = find_duplicate_lead(request.user, company)
            if existing is not None:
                return duplicate_response(existing)
            raise
        return Response(RawLeadSerializer(lead).data, status=status.HTTP_201_CREATED)


class RawLeadDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return scoped_queryset(self.request.user).get(pk=pk)
        except RawLead.DoesNotExist:
            return None

    def patch(self, request, pk):
        lead = self.get_object(pk)
        if lead is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        user = request.user
        is_own = lead.added_by == user.name
        if not (user.has_permission('leads.edit_own') and is_own) and not user.has_permission('leads.edit_all'):
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
        try:
            lead.save()
        except IntegrityError:
            conflict = find_duplicate_lead(request.user, lead.company)
            if conflict is not None and conflict.id != lead.id:
                return duplicate_response(conflict)
            raise
        return Response(RawLeadSerializer(lead).data)

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


class RawLeadAssignView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not can(request.user, 'leads.assign'):
            return Response(
                {'detail': 'You do not have permission to assign leads to staff.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        assigned_to = (request.data.get('assigned_to') or '').strip()
        if not assigned_to:
            return Response(
                {'detail': 'assigned_to: This field is required.'},
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

        queryset = scoped_queryset(request.user).filter(assigned_to='')
        if category and category != 'All Categories':
            queryset = queryset.filter(category=category)
        if from_date:
            queryset = queryset.filter(date__gte=from_date)
        if to_date:
            queryset = queryset.filter(date__lte=to_date)

        raw_leads = list(queryset.order_by('-created_at')[:count])

        created = []
        for raw in raw_leads:
            try:
                lead = TelecallLead.objects.create(
                    id=generate_telecall_id(),
                    company=raw.company,
                    tenant=raw.tenant,
                    contact=raw.contact,
                    phone=raw.phone,
                    email=raw.email,
                    category=raw.category,
                    city=raw.city,
                    assigned_to=assigned_to,
                    call_status='Pending Call',
                    remarks='Newly assigned from raw data.',
                )
            except IntegrityError:
                continue
            created.append(lead)
            raw.assigned_to = assigned_to
            raw.save(update_fields=['assigned_to', 'updated_at'])

        return Response(
            {
                'assigned': len(created),
                'assigned_to': assigned_to,
                'leads': TelecallLeadSerializer(created, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )


class TelecallLeadListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can(request.user, 'telecall.view'):
            return Response(
                {'detail': 'You do not have permission to view tele-call leads.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        leads = telecall_scoped_queryset(request.user)
        return Response(TelecallLeadSerializer(leads.order_by('-created_at'), many=True).data)


class TelecallLeadDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return telecall_scoped_queryset(self.request.user).get(pk=pk)
        except TelecallLead.DoesNotExist:
            return None

    def patch(self, request, pk):
        lead = self.get_object(pk)
        if lead is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        user = request.user
        is_own = lead.assigned_to == user.name
        can_edit = user.has_permission('telecall.edit') or is_own
        if not can_edit:
            return Response(
                {'detail': 'You do not have permission to edit this lead.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        for field in ('company', 'contact', 'phone', 'email', 'category', 'city'):
            if field in request.data:
                value = request.data.get(field)
                if isinstance(value, str):
                    value = value.strip()
                setattr(lead, field, value)
        for field in ('assigned_to', 'call_status', 'priority', 'remarks',
                      'last_call_date', 'next_follow_up_date', 'next_follow_up_time'):
            if field in request.data:
                value = request.data.get(field)
                if isinstance(value, str):
                    value = value.strip()
                setattr(lead, field, value)
        if 'has_follow_up' in request.data:
            lead.has_follow_up = bool(request.data.get('has_follow_up'))
        lead.save()
        return Response(TelecallLeadSerializer(lead).data)

    def delete(self, request, pk):
        lead = self.get_object(pk)
        if lead is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        user = request.user
        is_own = lead.assigned_to == user.name
        if not user.has_permission('leads.delete_all') and not (
            user.has_permission('leads.delete') and is_own
        ):
            return Response(
                {'detail': 'You do not have permission to delete this lead.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        lead.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)