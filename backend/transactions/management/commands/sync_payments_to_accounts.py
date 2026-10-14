from django.core.management.base import BaseCommand
from transactions.models import ClientPayment, Order
from transactions.services import sync_payment_to_accounts_soft


class Command(BaseCommand):
    help = 'Syncs payments from Leads to Account Soft.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Sync all payments, including those already marked synced.',
        )

    def handle(self, *args, **options):
        sync_all = options.get('all', False)
        qs = ClientPayment.objects.select_related('client_detail', 'client_detail__tenant')
        if not sync_all:
            qs = qs.filter(synced_to_accounts=False)

        payments = list(qs.order_by('created_at'))
        if not payments:
            self.stdout.write(self.style.SUCCESS('No unsynced payments found.'))
            return

        self.stdout.write(f'Found {len(payments)} payment(s) to sync.')
        success_count = 0
        fail_count = 0

        for p in payments:
            record = p.client_detail
            order_id = p.order_no or (f'ORD-{record.id}' if record else f'PAY-{p.id}')
            customer = (record.company or record.client_name) if record else ''
            order_obj = Order.objects.filter(id=p.order_no).first() if p.order_no else None
            order_val = (order_obj.net_amount or order_obj.total or None) if order_obj else None

            ok = sync_payment_to_accounts_soft(
                order_id=order_id,
                customer=customer,
                amount=float(p.amount),
                date=str(p.date),
                method=p.method,
                reference=p.reference,
                received_by=p.received_by,
                notes=p.notes,
                tenant=record.tenant if record else None,
                order_value=order_val,
            )

            if ok:
                p.synced_to_accounts = True
                p.save(update_fields=['synced_to_accounts', 'updated_at'])
                success_count += 1
                self.stdout.write(self.style.SUCCESS(f'  [OK] Payment {p.id} ({order_id} - {p.amount}) synced.'))
            else:
                fail_count += 1
                self.stdout.write(self.style.ERROR(f'  [FAIL] Payment {p.id} ({order_id} - {p.amount}) failed.'))

        self.stdout.write(
            self.style.SUCCESS(f'Done. {success_count} synced successfully, {fail_count} failed.')
        )
