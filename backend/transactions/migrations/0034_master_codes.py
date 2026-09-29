"""Add master-code identity columns and backfill them from stored names.

Every lead/quotation/order/client snapshots its master values as name text.
These new ``*_code`` columns carry the owning company's master *code* for that
name as a stable identity, so records keep their group even when a master is
renamed. The data migration resolves each stored name against the row's tenant
company's masters (case-insensitive); names with no matching master row (free
text, legacy rows without a tenant) keep an empty code.
"""

from django.db import migrations, models


def _master_code(model, tenant_id, name):
    if not tenant_id or not name:
        return ''
    row = model.objects.filter(company_id=tenant_id, name__iexact=name).values('code').first()
    return row['code'] if row else ''


def backfill_master_codes(apps, schema_editor):
    Category = apps.get_model('master', 'Category')
    Source = apps.get_model('master', 'Source')
    Location = apps.get_model('master', 'Location')
    Lead = apps.get_model('transactions', 'Lead')
    Quotation = apps.get_model('transactions', 'Quotation')
    Order = apps.get_model('transactions', 'Order')
    ClientDetail = apps.get_model('transactions', 'ClientDetail')

    def backfill(model, fields):
        for row in model.objects.all().iterator():
            updates = {}
            for name_field, code_field, master in fields:
                code = _master_code(master, row.tenant_id, getattr(row, name_field) or '')
                if code:
                    updates[code_field] = code
            if updates:
                model.objects.filter(pk=row.pk).update(**updates)

    backfill(Lead, (
        ('category', 'category_code', Category),
        ('source', 'source_code', Source),
        ('city', 'location_code', Location),
    ))
    backfill(Quotation, (
        ('category', 'category_code', Category),
        ('source', 'source_code', Source),
        ('city', 'location_code', Location),
    ))
    backfill(Order, (
        ('category', 'category_code', Category),
        ('city', 'location_code', Location),
    ))
    backfill(ClientDetail, (
        ('category', 'category_code', Category),
    ))


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0033_lead_sublocation'),
    ]

    operations = [
        migrations.AddField(
            model_name='lead',
            name='category_code',
            field=models.CharField(blank=True, db_index=True, max_length=20),
        ),
        migrations.AddField(
            model_name='lead',
            name='source_code',
            field=models.CharField(blank=True, db_index=True, max_length=20),
        ),
        migrations.AddField(
            model_name='lead',
            name='location_code',
            field=models.CharField(blank=True, db_index=True, max_length=20),
        ),
        migrations.AddField(
            model_name='quotation',
            name='category_code',
            field=models.CharField(blank=True, db_index=True, max_length=20),
        ),
        migrations.AddField(
            model_name='quotation',
            name='source_code',
            field=models.CharField(blank=True, db_index=True, max_length=20),
        ),
        migrations.AddField(
            model_name='quotation',
            name='location_code',
            field=models.CharField(blank=True, db_index=True, max_length=20),
        ),
        migrations.AddField(
            model_name='order',
            name='category_code',
            field=models.CharField(blank=True, db_index=True, max_length=20),
        ),
        migrations.AddField(
            model_name='order',
            name='location_code',
            field=models.CharField(blank=True, db_index=True, max_length=20),
        ),
        migrations.AddField(
            model_name='clientdetail',
            name='category_code',
            field=models.CharField(blank=True, db_index=True, max_length=20),
        ),
        migrations.RunPython(backfill_master_codes, migrations.RunPython.noop),
    ]