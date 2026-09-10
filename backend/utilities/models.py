from datetime import date

from django.db import models


class StaffTarget(models.Model):
    """Monthly KPI targets for a staff member of a tenant organisation.

    ``name`` and ``role`` are free text (a name may pre-date a user account);
    the achieved counts are computed on the fly from transaction data and are
    never persisted here.
    """

    tenant = models.ForeignKey(
        'accounts.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='staff_targets',
    )
    name = models.CharField(max_length=120)
    role = models.CharField(max_length=120, blank=True)
    month = models.PositiveSmallIntegerField(default=date.today().month)
    year = models.PositiveSmallIntegerField(default=date.today().year)
    raw_leads_target = models.IntegerField(default=0)
    calls_target = models.IntegerField(default=0)
    quotation_target = models.IntegerField(default=0)
    sales_target = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'name', 'month', 'year'],
                name='uniq_staff_target_tenant_name_month_year',
            ),
        ]

    def __str__(self):
        return f'{self.name} / {self.month}-{self.year}'


class Notification(models.Model):
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
    )
    type = models.CharField(max_length=50, blank=True)
    title = models.CharField(max_length=200, blank=True)
    message = models.TextField(blank=True)
    time = models.CharField(max_length=80, blank=True)
    url = models.CharField(max_length=300, blank=True)
    entity_type = models.CharField(max_length=60, blank=True)
    entity_id = models.CharField(max_length=60, blank=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class ActivityLog(models.Model):
    """System-wide audit trail: who did what, when.

    ``actor_name`` is denormalised at write time so renames never rewrite the
    history. Rows are pruned to a bounded recent window per tenant by
    :func:`log_activity`.
    """

    tenant = models.ForeignKey(
        'accounts.Company',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='activity_logs',
    )
    actor = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_logs',
    )
    actor_name = models.CharField(max_length=120, blank=True)
    action = models.CharField(max_length=80, blank=True)
    summary = models.TextField(blank=True)
    entity_type = models.CharField(max_length=60, blank=True)
    entity_id = models.CharField(max_length=60, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', '-created_at']),
        ]

    def __str__(self):
        return self.summary or f'{self.actor_name} {self.action}'


ACTIVITY_RETAINED_PER_TENANT = 200


def log_activity(actor, tenant, action, summary='', entity_type='', entity_id=''):
    """Record a system activity entry (no-op without a tenant or actor).

    Only keeps the newest ``ACTIVITY_RETAINED_PER_TENANT`` rows per tenant so
    the table never grows without bound.
    """
    if tenant is None:
        return None
    user = actor if actor is not None and getattr(actor, 'pk', None) else None
    entry = ActivityLog.objects.create(
        tenant=tenant,
        actor=user,
        actor_name=getattr(user, 'name', '') or '',
        action=action,
        summary=summary,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    stale_ids = list(
        ActivityLog.objects.filter(tenant=tenant)
        .order_by('-created_at')
        .values_list('id', flat=True)[ACTIVITY_RETAINED_PER_TENANT:]
    )
    if stale_ids:
        ActivityLog.objects.filter(id__in=stale_ids).delete()
    return entry