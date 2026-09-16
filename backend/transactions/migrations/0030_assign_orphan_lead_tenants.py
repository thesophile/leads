from django.db import migrations


def assign_orphan_lead_tenants(apps, schema_editor):
    """Attach orphaned (tenant-less) rows to the company that entered/owns them.

    Legacy imports produced rows without a tenant, which were previously shown
    to every company. Rows are matched to a company by their ``assigned_to``
    then ``added_by`` name when that name maps to exactly one company. Anything
    that cannot be tied to a single company stays tenant-less and is therefore
    visible only to platform superusers, so no organisation ever sees another
    tenant's data.
    """
    Lead = apps.get_model('transactions', 'Lead')
    Quotation = apps.get_model('transactions', 'Quotation')
    Order = apps.get_model('transactions', 'Order')
    ClientDetail = apps.get_model('transactions', 'ClientDetail')
    User = apps.get_model('accounts', 'User')

    # Build a name -> company_id map, dropping names shared by several companies.
    name_to_company = {}
    ambiguous = set()
    for name, company_id in User.objects.filter(company__isnull=False).values_list('name', 'company_id'):
        if name in name_to_company and name_to_company[name] != company_id:
            ambiguous.add(name)
        name_to_company[name] = company_id
    for name in ambiguous:
        name_to_company.pop(name, None)

    def company_id_for(name):
        if not name:
            return None
        return name_to_company.get(name)

    for lead in Lead.objects.filter(tenant__isnull=True):
        company_id = company_id_for(lead.assigned_to) or company_id_for(lead.added_by)
        if company_id is not None:
            lead.tenant_id = company_id
            lead.save(update_fields=['tenant'])

    # Derived records follow the tenant of the lead they belong to.
    for model in (Quotation, Order, ClientDetail):
        for row in model.objects.filter(tenant__isnull=True):
            if not row.lead_id:
                continue
            tenant_id = (
                Lead.objects.filter(pk=row.lead_id)
                .values_list('tenant_id', flat=True)
                .first()
            )
            if tenant_id is not None:
                row.tenant_id = tenant_id
                row.save(update_fields=['tenant'])


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0029_normalize_priorities'),
    ]

    operations = [
        migrations.RunPython(assign_orphan_lead_tenants, migrations.RunPython.noop),
    ]
