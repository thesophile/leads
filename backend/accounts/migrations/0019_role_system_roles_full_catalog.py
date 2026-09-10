# Backfill: system roles (the company Admin role) hold the full permission
# catalog in their stored permission list, matching their implicit effective
# access. Keeps the stored JSON in step with new permissions added to the
# catalog over time; already-applied systems are idempotent.

from django.db import migrations

from accounts.rbac import FLAT_PERMISSIONS


def grant_full_catalog_to_system_roles(apps, schema_editor):
    Role = apps.get_model('accounts', 'Role')
    for role in Role.objects.filter(is_system=True):
        if set(role.permissions or []) != set(FLAT_PERMISSIONS):
            role.permissions = FLAT_PERMISSIONS
            role.save(update_fields=['permissions'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0018_quotation_send_without_approval_permission'),
    ]

    operations = [
        migrations.RunPython(grant_full_catalog_to_system_roles, noop),
    ]