"""Monthly achieved (done) KPI counts for staff targets.

The Targets & KPIs settings tab stores only the *target* values. The achieved
counts are derived at read time from the transaction tables, keyed on the
staff member's name (case-insensitive) and the target month/year.
"""

import re
from datetime import date, timedelta

from django.db.models import Q

from transactions.models import CallHistory, Lead, Order, Quotation

CURRENCY_SYMBOLS = set('₹$,€£¥৳₦₨')

# Quotation statuses representing a draft that has not been generated/sent yet.
NOT_GENERATED_STATUSES = {'', 'Not Sent', 'Quotation Requested'}


def _parse_amount(value):
    text = str(value or '0').strip()
    for symbol in CURRENCY_SYMBOLS:
        text = text.replace(symbol, '')
    text = re.sub(r'[,\s()\-]+', '', text)
    try:
        return float(text)
    except ValueError:
        return 0.0


def _month_range(month, year):
    """Return ``(first_day, last_day)`` of the month, clamped to today for the
    current calendar month so future-dated rows do not inflate the totals."""
    first = date(year, month, 1)
    if month == 12:
        last = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        last = date(year, month + 1, 1) - timedelta(days=1)
    today = date.today()
    if year == today.year and month == today.month and last > today:
        last = today
    return first, last


def _attrib_lead_qs(name, tenant):
    qs = Lead.objects.filter(
        Q(added_by__iexact=name) | Q(assigned_to__iexact=name)
    )
    if tenant is not None:
        qs = qs.filter(tenant=tenant)
    return qs


def compute_staff_done(target, metric):
    """Return the achieved count of ``metric`` for a ``StaffTarget`` row.

    ``metric`` is one of ``raw_leads`` | ``calls`` | ``quotations`` | ``sales``.
    """
    name = target.name
    tenant = target.tenant
    first, last = _month_range(target.month, target.year)

    if metric == 'raw_leads':
        return _attrib_lead_qs(name, tenant).filter(date__range=(first, last)).count()

    if metric == 'calls':
        qs = CallHistory.objects.filter(caller__iexact=name, created_at__date__range=(first, last))
        if tenant is not None:
            qs = qs.filter(lead__tenant=tenant)
        return qs.count()

    if metric == 'quotations':
        qs = Quotation.objects.filter(
            Q(bdm__iexact=name) | Q(qtn_by__iexact=name) | Q(staff__iexact=name),
            created_at__date__range=(first, last),
        ).exclude(status__in=NOT_GENERATED_STATUSES)
        if tenant is not None:
            qs = qs.filter(tenant=tenant)
        return qs.count()

    if metric == 'sales':
        qs = Order.objects.filter(
            Q(bdm__iexact=name) | Q(proposal_by__iexact=name) | Q(staff__iexact=name),
            client_status=Order.CLIENT_ACCEPTED,
            created_at__date__range=(first, last),
        )
        if tenant is not None:
            qs = qs.filter(tenant=tenant)
        total = 0.0
        for order in qs.values_list('net_amount', flat=True):
            total += _parse_amount(order)
        return int(round(total))

    return 0