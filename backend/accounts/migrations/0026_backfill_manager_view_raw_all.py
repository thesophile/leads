"""Grant the built-in manager role permission to view all raw leads.

``seed_default_roles`` only applies template permissions when a role is
created, so existing companies need this permission appended explicitly.
"""

from django.db import migrations


def backfill_manager_view_raw_all(apps, schema_editor):
    Role = apps.get_model('accounts', 'Role')
    for role in Role.objects.filter(code='manager'):
        if 'leads.view_raw_all' not in role.permissions:
            role.permissions = [*role.permissions, 'leads.view_raw_all']
            role.save(update_fields=['permissions'])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0025_backfill_location_master_permissions'),
    ]

    operations = [
        migrations.RunPython(backfill_manager_view_raw_all, migrations.RunPython.noop),
    ]