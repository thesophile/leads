from datetime import date

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import can, require_permission

from .models import Notification, StaffTarget
from .serializers import (
    NotificationWriteSerializer,
    NotificationSerializer,
    StaffTargetSerializer,
    StaffTargetWriteSerializer,
)


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user).order_by('-created_at')[:100]
        return Response(NotificationSerializer(notifications, many=True).data)


class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, read=False).count()
        return Response({'count': count})


class NotificationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        return Notification.objects.filter(pk=pk, user=request.user).first()

    def patch(self, request, pk):
        notification = self.get_object(request, pk)
        if notification is None:
            return Response({'detail': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = NotificationWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        notification.read = serializer.validated_data['read']
        notification.save(update_fields=['read'])
        return Response(NotificationSerializer(notification).data)


class NotificationReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, read=False).update(read=True)
        return Response({'detail': 'All notifications marked as read.'})


def _target_scope_filter(queryset, user):
    """Scope target rows to the caller's tenant (superusers see all)."""
    if user.is_superuser:
        return queryset
    return queryset.filter(Q(tenant=user.company) | Q(tenant__isnull=True))


def _int_param(request, key):
    try:
        return int(request.query_params.get(key))
    except (TypeError, ValueError):
        return None


def _available_months(user):
    """Distinct (month, year) with saved targets, plus the current month,
    sorted by most recent first."""
    rows = _target_scope_filter(StaffTarget.objects.all(), user)
    months = set(rows.values_list('year', 'month'))
    today = date.today()
    months.add((today.year, today.month))
    return [
        {'month': m, 'year': y}
        for y, m in sorted(months, reverse=True)
    ]


def _employee_options(user):
    """Deduplicated dropdown of team members: names already tracked in target
    rows (any month) plus company user accounts."""
    employees = []
    seen = set()

    rows = _target_scope_filter(StaffTarget.objects.all(), user).order_by('name')
    for row in rows:
        key = row.name.lower()
        if key not in seen:
            seen.add(key)
            employees.append({'name': row.name, 'role': row.role})

    company = user.company if not user.is_superuser else getattr(user, 'company', None)
    if company is not None:
        for account in get_user_model().objects.filter(company=company).exclude(is_superuser=True).order_by('name'):
            key = account.name.lower()
            if key not in seen:
                seen.add(key)
                employees.append({'name': account.name, 'role': account.role.name if account.role_id else ''})

    return employees


class StaffTargetListCreateView(APIView):
    """Read monthly staff targets (view) or add a new member's targets (edit)."""

    permission_classes = [require_permission('company.view')]

    def get(self, request):
        today = date.today()
        month = _int_param(request, 'month') or today.month
        year = _int_param(request, 'year') or today.year

        queryset = _target_scope_filter(
            StaffTarget.objects.filter(month=month, year=year),
            request.user,
        ).order_by('name')

        return Response({
            'month': month,
            'year': year,
            'availableMonths': _available_months(request.user),
            'employees': _employee_options(request.user),
            'results': StaffTargetSerializer(queryset, many=True).data,
        })

    def post(self, request):
        if not can(request.user, 'company.edit'):
            return Response(
                {'detail': 'You do not have permission to manage staff targets.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = StaffTargetWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        today = date.today()
        month = data.get('month', today.month)
        year = data.get('year', today.year)

        existing = StaffTarget.objects.filter(
            tenant=request.user.company,
            name__iexact=data['name'],
            month=month,
            year=year,
        ).first()
        if existing is not None:
            return Response(
                {'name': ['This employee already has targets for this month.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target = StaffTarget.objects.create(
            tenant=request.user.company,
            name=data['name'],
            role=data.get('role', ''),
            month=month,
            year=year,
            raw_leads_target=data.get('raw_leads_target', 0),
            calls_target=data.get('calls_target', 0),
            quotation_target=data.get('quotation_target', 0),
            sales_target=data.get('sales_target', 0),
        )
        return Response(StaffTargetSerializer(target).data, status=status.HTTP_201_CREATED)


class StaffTargetDetailView(APIView):
    """Update or delete a single staff member's monthly target."""

    permission_classes = [IsAuthenticated]

    def _get_object(self, request, pk):
        target = StaffTarget.objects.filter(pk=pk).first()
        if target is None:
            return None
        if not request.user.is_superuser and target.tenant_id != getattr(request.user.company, 'id', None):
            return None
        return target

    def _update(self, request, pk):
        if not can(request.user, 'company.edit'):
            return Response(
                {'detail': 'You do not have permission to manage staff targets.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        target = self._get_object(request, pk)
        if target is None:
            return Response({'detail': 'Target not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = StaffTargetWriteSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        for field, value in serializer.validated_data.items():
            setattr(target, field, value)
        target.save()
        return Response(StaffTargetSerializer(target).data)

    def patch(self, request, pk):
        return self._update(request, pk)

    def delete(self, request, pk):
        if not can(request.user, 'company.edit'):
            return Response(
                {'detail': 'You do not have permission to manage staff targets.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        target = self._get_object(request, pk)
        if target is None:
            return Response({'detail': 'Target not found.'}, status=status.HTTP_404_NOT_FOUND)
        target.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class StaffTargetBulkAdjustView(APIView):
    """Scale one target type (raw leads or calls) for every row of a month."""

    permission_classes = [require_permission('company.edit')]

    def post(self, request):
        target_type = request.data.get('type')
        if target_type not in ('raw', 'calls'):
            return Response(
                {'type': 'Must be "raw" or "calls".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            multiplier = float(request.data.get('multiplier'))
        except (TypeError, ValueError):
            return Response(
                {'multiplier': 'A numeric multiplier is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        today = date.today()
        try:
            month = int(request.data.get('month')) if request.data.get('month') else today.month
        except (TypeError, ValueError):
            month = today.month
        try:
            year = int(request.data.get('year')) if request.data.get('year') else today.year
        except (TypeError, ValueError):
            year = today.year

        queryset = _target_scope_filter(
            StaffTarget.objects.filter(month=month, year=year),
            request.user,
        )
        for target in queryset:
            if target_type == 'raw':
                target.raw_leads_target = int(round(target.raw_leads_target * multiplier))
            else:
                target.calls_target = int(round(target.calls_target * multiplier))
            target.save(update_fields=['raw_leads_target', 'calls_target', 'updated_at'])

        return Response(StaffTargetSerializer(queryset, many=True).data)
