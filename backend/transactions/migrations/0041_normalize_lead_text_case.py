"""Normalize stored lead customer details to a consistent case.

Company, contact and sublocation are stored upper case; email is stored lower
case. The ``Lead.save`` override applies this to new writes, and this migration
brings existing rows in line so the Raw Data and Tele Call tables look uniform.
"""

from django.db import migrations

UPPER_FIELDS = ('company', 'contact', 'sublocation')


def normalize_lead_text(apps, schema_editor):
    Lead = apps.get_model('transactions', 'Lead')
    for lead in Lead.objects.all().iterator():
        changed = []
        for field in UPPER_FIELDS:
            value = getattr(lead, field) or ''
            new_value = value.strip().upper()
            if new_value != value:
                setattr(lead, field, new_value)
                changed.append(field)
        email = lead.email or ''
        new_email = email.strip().lower()
        if new_email != email:
            lead.email = new_email
            changed.append('email')
        if changed:
            lead.save(update_fields=changed)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0040_quotation_client_timezone'),
    ]

    operations = [
        migrations.RunPython(normalize_lead_text, noop),
    ]
