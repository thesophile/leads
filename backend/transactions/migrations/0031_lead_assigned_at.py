"""Add Lead.assigned_at and stamp leads that already have an owner.

Existing assigned leads predate the field, so the exact assignment moment is
not stored anywhere. ``updated_at`` is the closest available proxy: for leads
that were assigned and never touched it matches the assignment time, and for
actively worked leads it reflects the latest activity, which is a conservative
estimate of ownership age.
"""

from django.db import migrations, models


def backfill_assigned_at(apps, schema_editor):
    Lead = apps.get_model('transactions', 'Lead')
    assigned = Lead.objects.exclude(assigned_to='').filter(assigned_at__isnull=True)
    for lead in assigned.iterator():
        lead.assigned_at = lead.updated_at
        lead.save(update_fields=['assigned_at'])


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0030_assign_orphan_lead_tenants'),
    ]

    operations = [
        migrations.AddField(
            model_name='lead',
            name='assigned_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_assigned_at, migrations.RunPython.noop),
    ]