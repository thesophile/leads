from django.db import migrations


def backfill_staff_view_raw_all(apps, schema_editor):
    """Grant the built-in staff role access to view all raw leads.

    ``seed_default_roles`` only applies template permissions when a role is
    created, so existing companies need this permission appended explicitly.
    """
    Role = apps.get_model('accounts', 'Role')
    for role in Role.objects.filter(code='staff'):
        if 'leads.view_raw_all' not in role.permissions:
            role.permissions = [*role.permissions, 'leads.view_raw_all']
            role.save(update_fields=['permissions'])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_roles_flexible'),
    ]

    operations = [
        migrations.RunPython(backfill_staff_view_raw_all, migrations.RunPython.noop),
    ]