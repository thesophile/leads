"""Remap legacy call statuses to the new call outcome options.

'Considering' merges into 'Follow Up / Call Back' (stored as 'Follow Up') and
'Not Reachable' / 'Busy / Meeting' (stored as 'Not Reachable' / 'Busy') both
become 'Called'. Lead rows and their call-history entries are migrated so no
stored status refers to a removed dropdown option.
"""

from django.db import migrations

STATUS_REMAP = {
    'Considering': 'Follow Up',
    'Not Reachable': 'Called',
    'Busy': 'Called',
}


def migrate_call_statuses(apps, schema_editor):
    Lead = apps.get_model('transactions', 'Lead')
    CallHistory = apps.get_model('transactions', 'CallHistory')
    for old_status, new_status in STATUS_REMAP.items():
        Lead.objects.filter(call_status=old_status).update(call_status=new_status)
        CallHistory.objects.filter(status=old_status).update(status=new_status)


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0027_clientdetail_clientdetail_tenant_created_and_more'),
    ]

    operations = [
        migrations.RunPython(migrate_call_statuses, migrations.RunPython.noop),
    ]