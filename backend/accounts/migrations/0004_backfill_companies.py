from django.db import migrations


def backfill_company(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    Company = apps.get_model('accounts', 'Company')
    names = (
        User.objects.exclude(company='')
        .exclude(company=None)
        .values_list('company', flat=True)
        .distinct()
    )
    for name in names:
        company, _ = Company.objects.get_or_create(name=name)
        User.objects.filter(company=name, company_ref__isnull=True).update(company_ref=company)


def reverse_backfill_company(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    for user in User.objects.exclude(company_ref=None).select_related('company_ref'):
        User.objects.filter(pk=user.pk).update(company=user.company_ref.name)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_company_add_company_ref'),
    ]

    operations = [
        migrations.RunPython(backfill_company, reverse_backfill_company),
    ]
