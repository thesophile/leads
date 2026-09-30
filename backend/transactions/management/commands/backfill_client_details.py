"""Backfill the shared customers master (``transactions_clientdetail``) from orders.

Production shipped with the external orders feed already returning records
while the shared customer master stayed empty, so the Account Soft Customers
section had nothing to show. This command derives one client record per order
using the same idempotent logic the app runs when an order is accepted
(``create_client_detail_from_order``) and then enriches ``client_name`` from
the linked lead's contact name when the order itself has no customer name.

Run with ``--dry-run`` to preview what would be created without writing
anything to the database.
"""

from django.core.management.base import BaseCommand

from transactions.models import ClientDetail, Lead, Order
from transactions.services import create_client_detail_from_order


def clean_text(value, maxlen=None):
    if value is None:
        return ''
    text = str(value).strip()
    if maxlen:
        text = text[:maxlen]
    return text


class Command(BaseCommand):
    help = 'Backfill ClientDetail (customers master) rows from orders.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Report what would be created without writing anything.')

    def handle(self, *args, **options):
        self.dry_run = options['dry_run']

        orders = list(Order.objects.order_by('id'))
        lead_ids = [order.lead_id for order in orders if order.lead_id]
        leads = {
            lead.id: lead
            for lead in Lead.objects.filter(id__in=lead_ids)
        }

        created = existing = 0
        self.lines = []
        for order in orders:
            if ClientDetail.objects.filter(order_no=order.id).exists():
                existing += 1
                continue
            lead = leads.get(order.lead_id)
            client_name = clean_text(order.customer) or (
                clean_text(lead.contact) if lead else ''
            )
            self.lines.append(
                f'{order.id}: {clean_text(order.company)} '
                f'(client_name={client_name or "-"}, mobile={clean_text(order.mobile) or "-"}, '
                f'email={clean_text(order.email) or "-"}, category={clean_text(order.category) or "-"})'
            )
            if self.dry_run:
                continue
            client = create_client_detail_from_order(order)
            if client_name and client.client_name != client_name:
                client.client_name = client_name
                client.save(update_fields=['client_name'])
            created += 1

        self.stats = {
            'orders': len(orders),
            'created': created,
            'already_existed': existing,
        }
        self.print_summary()

    def print_summary(self):
        mode = 'DRY RUN (no writes)' if self.dry_run else 'BACKFILL COMPLETE'
        self.stdout.write(self.style.SUCCESS(f'\n== {mode} =='))
        if self.lines:
            self.stdout.write('Records to create:')
            for line in self.lines:
                self.stdout.write(f'  {line}')
        rows = [
            ('Orders scanned', self.stats['orders']),
            ('Client records created', self.stats['created']),
            ('Already existed (skipped)', self.stats['already_existed']),
        ]
        for label, value in rows:
            self.stdout.write(f'{label:<32} {value}')