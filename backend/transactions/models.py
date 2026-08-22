from django.db import models
from django.db.models.functions import Lower


class ProposalTemplate(models.Model):
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100, blank=True)
    default_total = models.CharField(max_length=30, blank=True)
    default_discount = models.CharField(max_length=30, blank=True)
    currency = models.CharField(max_length=30, default='INR (₹)')
    scope_html = models.TextField(blank=True)
    detail_html = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Lead(models.Model):
    """A single lead that progresses through the pipeline via its ``status``.

    ``raw`` leads appear in the Raw Data screen; ``assigned`` leads appear in the
    Tele Call screen. Later stages (quotation / order / client) reserve the same
    lifecycle: frontends render by status, so nothing is copied or deleted.
    """

    STATUS_RAW = 'raw'
    STATUS_ASSIGNED = 'assigned'
    STATUS_QUOTATION = 'quotation'
    STATUS_ORDER = 'order'
    STATUS_CLIENT = 'client'
    STATUS_CHOICES = [
        (STATUS_RAW, 'Raw'),
        (STATUS_ASSIGNED, 'Assigned'),
        (STATUS_QUOTATION, 'Quotation'),
        (STATUS_ORDER, 'Order'),
        (STATUS_CLIENT, 'Client'),
    ]

    id = models.CharField(max_length=20, primary_key=True)
    company = models.CharField(max_length=200)
    # Stored MySQL generated column of LOWER(company), used to enforce
    # case-insensitive company-name uniqueness at the database level.
    company_key = models.GeneratedField(
        expression=Lower('company'),
        output_field=models.CharField(max_length=200),
        db_persist=True,
    )
    tenant = models.ForeignKey(
        'accounts.Company',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='+',
    )
    contact = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    source = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=100, blank=True)
    date = models.DateField(null=True, blank=True)
    display_date = models.CharField(max_length=50, blank=True)
    added_by = models.CharField(max_length=120, blank=True)
    assigned_to = models.CharField(max_length=120, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_RAW,
    )
    call_status = models.CharField(max_length=40, default='Pending Call')
    priority = models.CharField(max_length=20, blank=True)
    remarks = models.TextField(blank=True)
    last_call_date = models.CharField(max_length=50, blank=True)
    next_follow_up_date = models.CharField(max_length=30, blank=True)
    next_follow_up_time = models.CharField(max_length=30, blank=True)
    has_follow_up = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'company_key'],
                name='uniq_lead_tenant_company_key',
            ),
        ]
    def __str__(self):
        return f'{self.id} - {self.company}'


class CallHistory(models.Model):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='history')
    date_time = models.CharField(max_length=50, blank=True)
    caller = models.CharField(max_length=120, blank=True)
    report = models.TextField(blank=True)
    follow_up = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'call histories'

    def __str__(self):
        return f'{self.lead_id} - {self.date_time}'


class Quotation(models.Model):
    id = models.CharField(max_length=30, primary_key=True)
    lead_id = models.CharField(max_length=30, blank=True, db_index=True)
    customer = models.CharField(max_length=120, blank=True)
    company = models.CharField(max_length=200)
    tenant = models.ForeignKey(
        'accounts.Company',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='+',
    )
    mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    bdm = models.CharField(max_length=120, blank=True)
    qtn_by = models.CharField(max_length=120, blank=True)
    staff = models.CharField(max_length=120, blank=True)
    date = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=50, default='Not Sent')
    total = models.CharField(max_length=30, blank=True)
    discount = models.CharField(max_length=30, blank=True)
    net_amount = models.CharField(max_length=40, blank=True)
    currency = models.CharField(max_length=30, default='INR (₹)')
    source = models.CharField(max_length=120, blank=True)
    proposal_scope = models.TextField(blank=True)
    terms_conditions = models.TextField(blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.id} - {self.company}'


class Order(models.Model):
    id = models.CharField(max_length=30, primary_key=True)
    lead_id = models.CharField(max_length=30, blank=True)
    proposal_no = models.CharField(max_length=30, blank=True)
    proposal_date = models.CharField(max_length=30, blank=True)
    customer = models.CharField(max_length=120, blank=True)
    company = models.CharField(max_length=200)
    tenant = models.ForeignKey(
        'accounts.Company',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='+',
    )
    mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    city = models.CharField(max_length=150, blank=True)
    bdm = models.CharField(max_length=120, blank=True)
    proposal_by = models.CharField(max_length=120, blank=True)
    staff = models.CharField(max_length=120, blank=True)
    date = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=50, default='Pending')
    total = models.CharField(max_length=40, blank=True)
    discount = models.CharField(max_length=40, blank=True)
    net_amount = models.CharField(max_length=40, blank=True)
    currency = models.CharField(max_length=30, default='INR (₹)')
    category = models.CharField(max_length=100, blank=True)
    remarks = models.TextField(blank=True)
    scope = models.TextField(blank=True)
    details = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.id} - {self.company}'


class ClientDetail(models.Model):
    id = models.CharField(max_length=20, primary_key=True)
    order_no = models.CharField(max_length=30, blank=True)
    lead_id = models.CharField(max_length=30, blank=True)
    client_name = models.CharField(max_length=120, blank=True)
    company = models.CharField(max_length=200)
    tenant = models.ForeignKey(
        'accounts.Company',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='+',
    )
    mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    accepted_date = models.CharField(max_length=30, blank=True)
    collected_by = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=50, default='Details Pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.id} - {self.company}'


class Attachment(models.Model):
    client_detail = models.ForeignKey(ClientDetail, on_delete=models.CASCADE, related_name='attachments')
    type = models.CharField(max_length=50, blank=True)
    name = models.CharField(max_length=200, blank=True)
    mime = models.CharField(max_length=100, blank=True)
    size = models.CharField(max_length=30, blank=True)
    url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name