from django.db import migrations


def backfill_assigned_lead_tenants(apps, schema_editor):
    Lead = apps.get_model('transactions', 'Lead')
    User = apps.get_model('accounts', 'User')
    for lead in Lead.objects.filter(tenant__isnull=True).exclude(assigned_to=''):
        users = list(User.objects.filter(name=lead.assigned_to))
        if len(users) == 1:
            lead.tenant = users[0].company
            lead.save(update_fields=['tenant'])


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0006_lead_unify'),
    ]

    operations = [
        migrations.RunPython(backfill_assigned_lead_tenants, migrations.RunPython.noop),
    ]