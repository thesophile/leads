"""Normalize legacy priority values to the Hot / Warm / Cold set.

Older seeds and imports stored 'High', 'Medium' and 'Low' while the Telecall
page only offers Hot / Warm / Cold. Remap them so the rating UI, filter pills
and KPI counts all agree.
"""

from django.db import migrations

PRIORITY_REMAP = {
    'High': 'Hot',
    'Medium': 'Warm',
    'Low': 'Cold',
}


def normalize_priorities(apps, schema_editor):
    Lead = apps.get_model('transactions', 'Lead')
    for old_value, new_value in PRIORITY_REMAP.items():
        Lead.objects.filter(priority=old_value).update(priority=new_value)


def revert_priorities(apps, schema_editor):
    Lead = apps.get_model('transactions', 'Lead')
    for new_value, old_value in PRIORITY_REMAP.items():
        Lead.objects.filter(priority=new_value).update(priority=old_value)


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0028_migrate_call_statuses'),
    ]

    operations = [
        migrations.RunPython(normalize_priorities, revert_priorities),
    ]