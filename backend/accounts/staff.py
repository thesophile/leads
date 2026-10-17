"""Shared helpers for choosing which staff names belong in a dropdown.

Two rules drive every staff picker in the app:

* **State pickers** (assign leads, raw data, telecall, targets, order/client
  selectors) may only offer *active* staff, because they decide who will do
  new work.
* **History pickers** (quotations, orders, client details, reports) list every
  active staff member plus any inactive staff member who has an entry in the
  current dataset, so historical work stays filterable.
"""

from .models import User


def active_staff_qs(company):
    """Active, non-superuser staff for a company."""
    if company is None:
        return User.objects.none()
    return (
        User.objects
        .filter(company=company, is_active=True, deny_leads_access=False)
        .exclude(is_superuser=True)
        .order_by('name')
    )


def active_staff_names(company):
    """Set of active staff names for a company."""
    return set(active_staff_qs(company).values_list('name', flat=True))


def staff_names_with_entries(company, names):
    """Sorted union of active staff names and the given entry names."""
    return sorted(active_staff_names(company) | {n for n in names if n})
