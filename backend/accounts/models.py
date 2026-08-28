from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

from .rbac import FLAT_PERMISSIONS


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('The email address must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        if extra_fields.get('role') is None:
            company = extra_fields.get('company')
            role = None
            if company is not None:
                role = Role.objects.filter(company=company, code='staff').first()
            extra_fields['role'] = role
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        # Platform superusers get no company role; they implicitely hold every
        # permission through is_superuser.
        extra_fields['role'] = None
        return self._create_user(email, password, **extra_fields)


class Company(models.Model):
    name = models.CharField(max_length=200, unique=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    website = models.URLField(blank=True)
    logo = models.ImageField(upload_to='company_logos/', blank=True, null=True)
    terms_html = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'companies'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            from .rbac import seed_default_roles

            seed_default_roles(self)


class Role(models.Model):
    """A company-scoped, fully editable role carrying a set of permission keys.

    Each company gets its own seeded admin/manager/staff roles; company admins
    can edit those or add new ones. One company's roles never affect another's.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='roles',
    )
    code = models.CharField(max_length=50)
    name = models.CharField(max_length=50)
    permissions = models.JSONField(default=list)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(fields=['company', 'code'], name='uniq_role_company_code'),
        ]

    def __str__(self):
        return f'{self.name} @ {self.company}'

    @property
    def permission_names(self):
        if self.is_system:
            return set(FLAT_PERMISSIONS)
        return set(self.permissions or [])


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20, blank=True)
    company = models.ForeignKey(
        'accounts.Company',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='users',
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='users',
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} <{self.email}>'

    @property
    def initials(self):
        parts = self.name.strip().split()
        return ''.join(p[0].upper() for p in parts[:2]) or 'U'

    def get_permissions(self):
        """Return the set of permission keys this user currently holds."""
        if self.is_superuser:
            return set(FLAT_PERMISSIONS)
        if self.role_id:
            return set(self.role.permissions or [])
        return set()

    def has_permission(self, key):
        """Check a single permission key (company-scoped role permissions)."""
        return bool(self.is_superuser or key in self.get_permissions())

    @property
    def permissions(self):
        return sorted(self.get_permissions())
