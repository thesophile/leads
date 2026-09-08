from django.db import models

# Default category/source catalog provisioned for every company (used by the
# per-company migration backfill and by Company.save for freshly created tenants).
STANDARD_CATEGORIES = [
    'COSMETICS STORE',
    'AUTO WASH',
    'DECOR STORES',
    'INTERIOR DESIGNERS',
    'FANCY SHOPS',
    'PERFUME SHOPE',
    'SHOPPING MALL',
    'GLASS SHOP',
    'PLYWOOD&HARDWARE',
    'ENTERTAINMENT PARK',
    'Hospital',
    'CAFES&REASTURANT',
    'REASTURANT',
    'CONVENTION CENTER',
    'THEATER',
    'EDUCATION & SCHOOL',
    'CLINIC & HEALTHCARE',
    'SALON & SPA',
]

STANDARD_SOURCES = [
    'Google Search & SEO',
    'Official Website',
    'Customer Referral',
    'Facebook Ads',
    'Instagram Campaign',
    'Existing Customer',
    'Internal Database',
    'Print & Billboard Advertisement',
    'Business Exhibition & Expo',
    'Manual Walk-in Entry',
    'LinkedIn B2B Outreach',
    'WhatsApp Business API',
    'Email Marketing Campaign',
    'Trade Show Conference',
    'Channel Partner Network',
]


def seed_default_master_catalog(company):
    """Provision the standard category/source catalog for ``company``."""
    for i, name in enumerate(STANDARD_CATEGORIES):
        Category.objects.get_or_create(
            company=company,
            name=name,
            defaults={'code': f'CT{i:03d}'},
        )
    for i, name in enumerate(STANDARD_SOURCES):
        Source.objects.get_or_create(
            company=company,
            name=name,
            defaults={'code': f'SR{i:03d}'},
        )


class CommonMaster(models.Model):
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=200)
    company = models.ForeignKey(
        'accounts.Company',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='%(class)ss',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'name'],
                name='uniq_%(app_label)s_%(class)ss_company_name',
            ),
            models.UniqueConstraint(
                fields=['company', 'code'],
                name='uniq_%(app_label)s_%(class)ss_company_code',
            ),
        ]

    def __str__(self):
        return self.name


class Category(CommonMaster):
    pass


class Source(CommonMaster):
    pass


class Branch(CommonMaster):
    name = models.CharField(max_length=50)
    address = models.CharField(max_length=200, blank=True)


class Staff(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=120)
    role = models.CharField(max_length=120, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_members')
    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='staff_profile',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name