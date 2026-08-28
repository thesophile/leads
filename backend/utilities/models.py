from django.db import models


class StaffTarget(models.Model):
    name = models.CharField(max_length=120)
    role = models.CharField(max_length=120, blank=True)
    raw_leads_target = models.IntegerField(default=0)
    calls_target = models.IntegerField(default=0)
    quotation_target = models.IntegerField(default=0)
    sales_target = models.IntegerField(default=0)
    raw_leads_done = models.IntegerField(default=0)
    calls_done = models.IntegerField(default=0)
    quotation_done = models.IntegerField(default=0)
    sales_done = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


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