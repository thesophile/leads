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