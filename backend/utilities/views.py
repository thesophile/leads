import json
import logging
import os
import tempfile
from datetime import date
from io import StringIO

from django.apps import apps
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.management import call_command
from django.core.serializers.json import Deserializer as JSONDeserializer
from django.db.models import Q
from django.db.models.signals import post_save, pre_save
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts import signals as account_signals
from accounts.models import Role, User as AuthUser

from accounts.permissions import can, require_permission

from .models import ActivityLog, Notification, StaffTarget, log_activity
from .serializers import (
    NotificationWriteSerializer,
    NotificationSerializer,
    StaffTargetSerializer,
    StaffTargetWriteSerializer,
)

logger = logging.getLogger(__name__)


def _model_is_registered(label):
    if not isinstance(label, str):
        return False
    app_label, _, model = label.partition('.')
    return bool(
        model
        and app_label in apps.app_configs
        and model in apps.all_models.get(app_label, {})
    )


def _contenttype_natural_refs(objects):
    """Every 2-string list value that points at a registered app (content types)."""
    refs = set()
    for obj in objects:
        fields = obj.get('fields') if isinstance(obj, dict) else None
        if not isinstance(fields, dict):
            continue
        for value in fields.values():
            if (
                isinstance(value, (list, tuple))
                and len(value) == 2
                and all(isinstance(v, str) for v in value)
                and value[0] in apps.app_configs
            ):
                refs.add((value[0], value[1]))
    return refs


def _ensure_content_types(objects):
    """Create content types referenced by the backup that the live DB lacks.

    Returns the ids of rows created here (legacy references only, e.g. a model
    removed by a migration). They are removed again after a successful load.
    """
    created = []
    for app_label, model in sorted(_contenttype_natural_refs(objects)):
        ct, was_created = ContentType.objects.get_or_create(
            app_label=app_label, model=model,
        )
        if was_created:
            created.append(ct.pk)
    return created


def _cleanup_content_types(ids):
    ContentType.objects.filter(id__in=ids).delete()


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
        log_activity(
            request.user,
            request.user.company,
            'set target',
            f"{request.user.name} set {target.name}'s targets for {target.month}/{target.year}.",
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
        log_activity(
            request.user,
            request.user.company,
            'updated target',
            f"{request.user.name} updated {target.name}'s targets for {target.month}/{target.year}.",
        )
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
        label = f"{target.name}'s targets for {target.month}/{target.year}"
        target.delete()
        log_activity(
            request.user,
            request.user.company,
            'deleted target',
            f'{request.user.name} deleted {label}.',
        )
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

        log_activity(
            request.user,
            request.user.company,
            'adjusted targets',
            f"{request.user.name} scaled all {target_type} targets by {multiplier}x for {month}/{year}.",
        )
        return Response(StaffTargetSerializer(queryset, many=True).data)


BACKUP_EXCLUDED_MODELS = [
    'sessions.session',
    'admin.logentry',
    'contenttypes.contenttype',
    'auth.permission',
    'auth.group',
    'token_blacklist.outstandingtoken',
    'token_blacklist.blacklistedtoken',
]
BACKUP_MAX_BYTES = 100 * 1024 * 1024  # 100MB


class ActivityLogListView(APIView):
    """Recent system activity, newest first (tenant-scoped; superusers see all)."""

    permission_classes = [require_permission('company.edit')]

    def get(self, request):
        queryset = ActivityLog.objects.all()
        if not request.user.is_superuser:
            company = getattr(request.user, 'company', None)
            if company is None:
                return Response([])
            queryset = queryset.filter(tenant=company)
        limit = _int_param(request, 'limit') or 50
        limit = max(1, min(limit, 200))
        return Response([
            {
                'id': row.id,
                'time': row.created_at.isoformat(),
                'actor': row.actor_name,
                'action': row.action,
                'summary': row.summary,
                'entityType': row.entity_type,
                'entityId': row.entity_id,
            }
            for row in queryset[:limit]
        ])


class BackupExportView(APIView):
    """Download a full data snapshot (dumpdata JSON) of every table."""

    permission_classes = [require_permission('company.edit')]

    def get(self, request):
        out = StringIO()
        call_command(
            'dumpdata',
            exclude=BACKUP_EXCLUDED_MODELS,
            natural_foreign=True,
            stdout=out,
        )
        data = json.loads(out.getvalue())
        log_activity(
            request.user,
            getattr(request.user, 'company', None),
            'downloaded backup',
            f'{request.user.name} downloaded a database backup.',
        )
        response = Response(data)
        response['Cache-Control'] = 'no-store'
        return response


class BackupRestoreView(APIView):
    """Replace all current data with the contents of an uploaded dumpdata file.

    The file is validated (JSON + dumpdata shape) *before* the database is
    touched. On success the existing rows are flushed and the backup is loaded.
    """

    permission_classes = [require_permission('company.edit')]
    max_bytes = BACKUP_MAX_BYTES

    def _suppress_sync_signals(self, suppress):
        receivers = [
            (pre_save, account_signals.capture_old_name, AuthUser),
            (post_save, account_signals.keep_staff_profile_in_sync, AuthUser),
            (post_save, account_signals.keep_staff_role_label_in_sync, Role),
        ]
        for signal, receiver, sender in receivers:
            if suppress:
                signal.disconnect(receiver=receiver, sender=sender)
            else:
                signal.connect(receiver=receiver, sender=sender)

    def post(self, request):
        upload = request.FILES.get('file')
        if upload is None:
            return Response(
                {'detail': 'Please attach a backup file to restore.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if upload.size > self.max_bytes:
            return Response(
                {'detail': 'Backup file exceeds the 100MB size limit.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            content = upload.read().decode('utf-8')
        except UnicodeDecodeError:
            return Response(
                {'detail': 'Backup file must be valid UTF-8 JSON.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            objects = json.loads(content)
        except json.JSONDecodeError:
            return Response(
                {'detail': 'Backup file is not valid JSON.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(objects, list):
            return Response(
                {'detail': 'Backup file is not a valid dumpdata export (expected a list).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not objects:
            return Response(
                {'detail': 'Backup file contains no data to restore.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        def invalid_backup(exc):
            logger.warning('Backup restore rejected (%s): %s', request.user.email, exc)
            return Response(
                {
                    'detail': (
                        'This backup file cannot be restored. It appears to be from an older or '
                        'incompatible version of the app. Download a fresh backup and try again.'
                    ),
                    'technical': str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        synthesized = []
        try:
            list(JSONDeserializer(content))
        except Exception as exc:
            structurally_ok = all(
                isinstance(o, dict)
                and isinstance(o.get('model'), str)
                and _model_is_registered(o['model'])
                and isinstance(o.get('fields'), dict)
                for o in objects
            )
            if not structurally_ok:
                return invalid_backup(exc)
            # Legacy backups may reference content types that no longer exist
            # (e.g. a model removed by a migration). Create the missing ones and
            # re-validate before touching the database.
            synth_for_validation = _ensure_content_types(objects)
            try:
                list(JSONDeserializer(content))
            except Exception as exc2:
                _cleanup_content_types(synth_for_validation)
                return invalid_backup(exc2)

        tmp = tempfile.NamedTemporaryFile(
            mode='w', suffix='.json', delete=False, encoding='utf-8',
        )
        try:
            tmp.write(content)
            tmp.close()
            self._suppress_sync_signals(suppress=True)
            try:
                call_command('flush', interactive=False)
                # flush wiped every content-type row; recreate the ones the file
                # references so loaddata can resolve its foreign keys.
                synthesized = _ensure_content_types(objects)
                call_command('loaddata', tmp.name)
            finally:
                self._suppress_sync_signals(suppress=False)
        finally:
            os.unlink(tmp.name)

        if synthesized:
            _cleanup_content_types(synthesized)

        log_activity(
            request.user,
            getattr(request.user, 'company', None),
            'restored backup',
            f'{request.user.name} restored the system from a backup.',
        )
        return Response({'detail': 'Backup restored successfully.'})
