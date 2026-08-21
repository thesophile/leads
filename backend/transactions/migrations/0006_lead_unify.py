"""Unify RawLead + TelecallLead into a single status-driven Lead.

- Renames the RawLead model/table to Lead.
- Adds the status field plus the Telecall fields (call_status, priority,
  remarks, follow-up dates, ...) onto Lead.
- Repoints CallHistory from TelecallLead to Lead, preserving the rows.
- Merges existing TelecallLead rows into their matching Lead (matched by the
  unique company_key) and labels assigned leads with status='assigned'.
- Drops the TelecallLead model/table.
"""

import django.db.models.deletion
from django.db import migrations, models


def merge_telecall_into_lead(apps, schema_editor):
    """Fold every TelecallLead into its matching Lead and label statuses."""
    Lead = apps.get_model('transactions', 'Lead')
    TelecallLead = apps.get_model('transactions', 'TelecallLead')
    CallHistory = apps.get_model('transactions', 'CallHistory')

    mapping = {}
    for tc in TelecallLead.objects.all():
        lead = (
            Lead.objects.filter(company_key=tc.company.strip().lower()).first()
        )
        if lead is None:
            lead = Lead.objects.create(
                id=tc.id,
                company=tc.company,
                tenant_id=tc.tenant_id,
                contact=tc.contact,
                phone=tc.phone,
                email=tc.email,
                category=tc.category,
                city=tc.city,
                source='',
                date=None,
                display_date='',
                added_by='',
                assigned_to=tc.assigned_to,
                status='assigned',
                call_status=tc.call_status,
                priority=tc.priority,
                remarks=tc.remarks,
                last_call_date=tc.last_call_date,
                next_follow_up_date=tc.next_follow_up_date,
                next_follow_up_time=tc.next_follow_up_time,
                has_follow_up=tc.has_follow_up,
            )
        else:
            lead.assigned_to = tc.assigned_to or lead.assigned_to
            lead.status = 'assigned'
            lead.call_status = tc.call_status
            lead.priority = tc.priority
            lead.remarks = tc.remarks
            lead.last_call_date = tc.last_call_date
            lead.next_follow_up_date = tc.next_follow_up_date
            lead.next_follow_up_time = tc.next_follow_up_time
            lead.has_follow_up = tc.has_follow_up
            lead.save(update_fields=[
                'assigned_to', 'status', 'call_status', 'priority', 'remarks',
                'last_call_date', 'next_follow_up_date', 'next_follow_up_time',
                'has_follow_up',
            ])
        mapping[tc.id] = lead.id

    # Repoint call histories to the surviving lead id.
    for tc_id, lead_id in mapping.items():
        CallHistory.objects.filter(lead_id=tc_id).exclude(lead_id=lead_id) \
            .update(lead_id=lead_id)

    # Any previously-assigned leads that have no Telecall counterpart still
    # count as assigned (the old code marked assigned_to on the raw record).
    Lead.objects.exclude(assigned_to='').filter(status='raw') \
        .update(status='assigned')


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0005_rawlead_assigned_to'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='RawLead',
            new_name='Lead',
        ),
        migrations.RemoveConstraint(
            model_name='lead',
            name='uniq_rawlead_company_key',
        ),
        migrations.AddConstraint(
            model_name='lead',
            constraint=models.UniqueConstraint(
                fields=('company_key',),
                name='uniq_lead_company_key',
            ),
        ),
        migrations.AddField(
            model_name='lead',
            name='status',
            field=models.CharField(
                choices=[
                    ('raw', 'Raw'),
                    ('assigned', 'Assigned'),
                    ('quotation', 'Quotation'),
                    ('order', 'Order'),
                    ('client', 'Client'),
                ],
                default='raw',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='lead',
            name='call_status',
            field=models.CharField(default='Pending Call', max_length=40),
        ),
        migrations.AddField(
            model_name='lead',
            name='priority',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='lead',
            name='remarks',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='lead',
            name='last_call_date',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='lead',
            name='next_follow_up_date',
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name='lead',
            name='next_follow_up_time',
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name='lead',
            name='has_follow_up',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='callhistory',
            name='lead',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='history',
                to='transactions.lead',
            ),
        ),
        migrations.RunPython(
            merge_telecall_into_lead,
            migrations.RunPython.noop,
        ),
        migrations.DeleteModel(
            name='TelecallLead',
        ),
    ]