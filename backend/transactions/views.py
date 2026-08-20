import random
from datetime import date

from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import RawLead
from .serializers import RawLeadSerializer


def is_admin(user):
    return bool(
        user
        and user.is_authenticated
        and (user.is_superuser or getattr(user, 'role', '') == 'admin')
    )


def is_manager_or_admin(user):
    return bool(
        user
        and user.is_authenticated
        and (user.is_superuser or getattr(user, 'role', '') in ('admin', 'manager'))
    )


def generate_raw_id():
    existing = set(RawLead.objects.values_list('id', flat=True))
    for _ in range(200):
        candidate = f'RAW-{random.randint(100000, 999999)}'
        if candidate not in existing:
            return candidate
    return f'RAW-{random.randint(1000000, 9999999)}'


def scoped_queryset(user):
    if user.is_superuser:
        return RawLead.objects.all()
    if is_manager_or_admin(user):
        # Managers/admins see their company's records plus legacy unassigned rows.
        return RawLead.objects.filter(
            Q(tenant=user.company) | Q(tenant__isnull=True)
        )
    # Regular staff only see the records they added themselves.
    return RawLead.objects.filter(added_by=user.name)


def format_display_date(value):
    return value.strftime('%d %b %Y') if value else ''


class RawLeadListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        leads = scoped_queryset(request.user)
        return Response(RawLeadSerializer(leads.order_by('-created_at'), many=True).data)

    def post(self, request):
        company = request.data.get('company', '').strip()
        if not company:
            return Response(
                {'detail': 'company: This field is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        lead_date = date.today()
        lead = RawLead.objects.create(
            id=generate_raw_id(),
            company=company,
            tenant=request.user.company,
            contact=request.data.get('contact', '').strip(),
            phone=request.data.get('phone', '').strip(),
            email=request.data.get('email', '').strip(),
            category=request.data.get('category', '').strip(),
            source=request.data.get('source', '').strip(),
            city=request.data.get('city', '').strip(),
            date=lead_date,
            display_date=format_display_date(lead_date),
            added_by=request.user.name,
        )
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
        for field in ('company', 'contact', 'phone', 'category', 'source', 'city'):
            if field in request.data:
                value = request.data.get(field)
                if isinstance(value, str):
                    value = value.strip()
                setattr(lead, field, value)
        if 'email' in request.data:
            lead.email = request.data.get('email', '').strip()
        lead.save()
        return Response(RawLeadSerializer(lead).data)

    def delete(self, request, pk):
        lead = self.get_object(pk)
        if lead is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        lead.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)