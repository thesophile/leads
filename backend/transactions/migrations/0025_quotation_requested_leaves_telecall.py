"""Promote tele-call leads with 'Quotation Requested' to the quotation stage.

A lead whose call_status is 'Quotation Requested' belongs in the Manage
Quotation screen (status='quotation'). Any assigned (tele-call) lead left with
that call status is legacy or seed data that bypassed the edit transition, so
it is moved to the quotation stage here.
"""

from django.db import migrations


def promote_quotation_requested(apps, schema_editor):
    Lead = apps.get_model('transactions', 'Lead')
    updated = Lead.objects.filter(
        status='assigned',
        call_status='Quotation Requested',
    ).update(status='quotation')


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0024_lead_lock'),
    ]

    operations = [
        migrations.RunPython(promote_quotation_requested, migrations.RunPython.noop),
    ]