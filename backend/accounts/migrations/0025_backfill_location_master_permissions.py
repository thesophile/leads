"""Backfill master/location permissions into roles created before the location master.

The location master (b9eee1e) added ``location.view`` / ``location.manage`` to the
catalog and manager template, but did not update roles that already existed.
Anyone who already held master permissions should also see Location by default,
and managers should be able to view and edit every master by default.
"""

from django.db import migrations

MASTER_VIEWS = {'branch.view', 'category.view', 'source.view', 'location.view'}
MASTER_MANAGES = {'branch.manage', 'category.manage', 'source.manage', 'location.manage'}


def backfill_master_permissions(apps, schema_editor):
    Role = apps.get_model('accounts', 'Role')
    for role in Role.objects.all():
        perms = set(role.permissions or [])
        if role.code == 'manager':
            perms |= MASTER_VIEWS | MASTER_MANAGES
        else:
            if perms & (MASTER_VIEWS | MASTER_MANAGES):
                perms.add('location.view')
            if perms & MASTER_MANAGES:
                perms.add('location.manage')
        role.permissions = sorted(perms)
        role.save(update_fields=['permissions'])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0024_remove_staff_delete_own_leads'),
    ]

    operations = [
        migrations.RunPython(backfill_master_permissions, migrations.RunPython.noop),
    ]