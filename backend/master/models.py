from django.db import models


class CommonMaster(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['name']

    def __str__(self):
        return self.name


class Category(CommonMaster):
    pass


class Source(CommonMaster):
    pass


class Branch(CommonMaster):
    company = models.ForeignKey(
        'accounts.Company',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='branches',
    )
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