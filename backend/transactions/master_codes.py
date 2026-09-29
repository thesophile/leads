"""Shared helpers for linking transaction rows to their company's masters.

Every lead/quotation/order/client stores the master *name* it was saved with
(dropdown values are snapshotted as text so free-text entries like "Other"
work, and reports/search read those strings). To keep records associated with
their master even when the master is later renamed, each row additionally
carries the master's per-company unique *code* as a stable identity. These
helpers stamp the codes whenever a row is written and propagate a rename to
every row holding the renamed master's code so the stored name text stays
consistent with search and display.
"""

# (stored name field, code field, master model) triples per record shape.
_MASTER_FIELDS = (
    ('category', 'category_code', 'Category'),
    ('source', 'source_code', 'Source'),
    ('city', 'location_code', 'Location'),
)

# (model, stored name field, code field) to rewrite when each master renames.
_RENAME_TARGETS = {
    'Category': (
        ('Lead', 'category', 'category_code'),
        ('Quotation', 'category', 'category_code'),
        ('Order', 'category', 'category_code'),
        ('ClientDetail', 'category', 'category_code'),
    ),
    'Source': (
        ('Lead', 'source', 'source_code'),
        ('Quotation', 'source', 'source_code'),
    ),
    'Location': (
        ('Lead', 'city', 'location_code'),
        ('Quotation', 'city', 'location_code'),
        ('Order', 'city', 'location_code'),
    ),
}


def _master_model(name):
    from master.models import Category, Location, Source

    return {'Category': Category, 'Source': Source, 'Location': Location}[name]


def _transaction_model(name):
    from .models import ClientDetail, Lead, Order, Quotation

    return {'Lead': Lead, 'Quotation': Quotation, 'Order': Order, 'ClientDetail': ClientDetail}[name]


def master_code(master_name, tenant, name):
    """Resolve a stored master ``name`` to the company's row ``code`` ('').

    Matching is case-insensitive against the owning company's master rows so
    CSV values like ``kochi`` map onto a master stored as ``KOCHI``.
    """
    if not name:
        return ''
    row = _master_model(master_name).objects.filter(
        company=tenant, name__iexact=name
    ).first()
    return row.code if row else ''


def stamp_codes(row, tenant):
    """Fill the ``*_code`` identity columns from the row's stored master names.

    Returns the list of code field names that changed (empty when nothing did).
    Free-text names with no matching master row leave their code empty.
    """
    fields = {f.name for f in row._meta.fields}
    changed = []
    for name_field, code_field, master_name in _MASTER_FIELDS:
        if name_field not in fields or code_field not in fields:
            continue
        code = master_code(master_name, tenant, getattr(row, name_field) or '')
        if getattr(row, code_field) != code:
            setattr(row, code_field, code)
            changed.append(code_field)
    return changed


def codes_for(tenant, category='', source='', city=''):
    """Resolve all three master codes at once (for ``objects.create`` calls)."""
    return {
        'category_code': master_code('Category', tenant, category),
        'source_code': master_code('Source', tenant, source),
        'location_code': master_code('Location', tenant, city),
    }


def propagate_master_rename(master_name, tenant, old_name, new_name):
    """Rewrite the stored name on every row that references the renamed master.

    Called from the master edit views after a rename. Rows stamped with the
    renamed master's code are updated; rows that still carry an empty code but
    hold the exact old name (legacy data that predates the code columns) are
    matched too so the whole history follows the rename.
    """
    if not old_name or old_name == new_name:
        return
    row = _master_model(master_name).objects.filter(
        company=tenant, name__iexact=new_name
    ).first()
    code = row.code if row else ''
    for model_name, name_field, code_field in _RENAME_TARGETS.get(master_name, ()):
        model = _transaction_model(model_name)
        qs = model.objects.filter(tenant=tenant)
        update = {name_field: new_name}
        qs.filter(**{code_field: code}).exclude(**{name_field: new_name}).update(**update)
        # Legacy fallback: rows matched purely by the old name text.
        qs.filter(**{code_field: ''}, **{name_field: old_name}).update(**update)