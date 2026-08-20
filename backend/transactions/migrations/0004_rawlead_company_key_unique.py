from django.db import migrations, models
from django.db.models.functions import Lower


def dedupe_company_names(apps, schema_editor):
    """Remove duplicate company names (case-insensitive), keeping the earliest
    record so the unique index added afterwards can be created."""
    RawLead = apps.get_model('transactions', 'RawLead')
    seen = set()
    for lead in RawLead.objects.order_by('created_at', 'id'):
        key = lead.company.strip().lower()
        if key in seen:
            lead.delete()
        else:
            seen.add(key)


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0003_seed_raw_leads'),
    ]

    operations = [
        migrations.RunPython(dedupe_company_names, migrations.RunPython.noop),
        migrations.AddField(
            model_name='rawlead',
            name='company_key',
            field=models.GeneratedField(
                db_persist=True,
                expression=Lower('company'),
                output_field=models.CharField(max_length=200),
            ),
        ),
        migrations.AddConstraint(
            model_name='rawlead',
            constraint=models.UniqueConstraint(
                fields=('company_key',),
                name='uniq_rawlead_company_key',
            ),
        ),
    ]