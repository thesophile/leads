from django.db import migrations

from accounts.defaults import DEFAULT_TERMS_FULL, DEFAULT_TERMS_SUMMARY


def seed_terms(apps, schema_editor):
    Company = apps.get_model('accounts', 'Company')
    for company in Company.objects.all().iterator():
        changed = False
        if not company.terms_summary_html:
            company.terms_summary_html = DEFAULT_TERMS_SUMMARY
            changed = True
        if not company.terms_full_html:
            company.terms_full_html = DEFAULT_TERMS_FULL
            changed = True
        if changed:
            company.save(update_fields=['terms_summary_html', 'terms_full_html'])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0020_alter_company_base_currency'),
    ]

    operations = [
        migrations.RunPython(seed_terms, migrations.RunPython.noop),
    ]
