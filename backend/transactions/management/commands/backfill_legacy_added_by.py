"""Backfill legacy ``added_by`` ownership onto imported leads.

After ``import_legacy`` runs, every imported lead has an empty ``added_by``
(the import only mapped ``assigned_to``). The legacy ``teledata`` table records
who entered each row in ``rowdata_staff`` (falling back to ``staff``), so this
command copies that person's name onto ``Lead.added_by`` where it is still
empty. Rows with no recorded entrant (mostly raw leads whose old staff records
were deleted long ago) are intentionally left untouched and stay org-wide.

Run with --dry-run to see what would change without writing anything.
"""

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection, connections
from django.db.models import Q

from accounts.models import Company
from transactions.models import Lead


def clean_text(value, maxlen=None):
    if value is None:
        return ''
    text = str(value).strip()
    if maxlen:
        text = text[:maxlen]
    return text


class Command(BaseCommand):
    help = 'Backfill added_by on imported leads from legacy teledata ownership.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Report changes without writing anything.')
        parser.add_argument('--stage', default='leads_old_stage',
                            help='Staging database that holds the legacy dump.')
        parser.add_argument('--tenant', default='Programers',
                            help='Company (tenant) name the legacy data lives under.')

    def handle(self, *args, **options):
        self.dry_run = options['dry_run']
        stage = options['stage']
        tenant_name = options['tenant']

        settings.DATABASES[stage] = {**settings.DATABASES[connection.alias], 'NAME': stage}
        cursor = connections[stage].cursor()
        try:
            cursor.execute('SELECT id, name FROM staff')
            staff_names = {
                row[0]: clean_text(row[1], 120) for row in cursor.fetchall()
            }
            cursor.execute('SELECT id, rowdata_staff, staff FROM teledata')
            teledata_rows = cursor.fetchall()
        finally:
            connections[stage].close()

        company = Company.objects.filter(name=tenant_name).first()
        if company is None:
            self.stdout.write(self.style.ERROR(
                f'Tenant "{tenant_name}" not found - nothing to backfill.'))
            return

        # lead id -> entrant name (rowdata_staff first, staff as fallback).
        owner_by_id = {}
        for raw_id, rowdata_staff, staff in teledata_rows:
            try:
                old_id = int(raw_id)
            except (TypeError, ValueError):
                continue
            name = staff_names.get(int(rowdata_staff) if rowdata_staff else None) \
                or staff_names.get(int(staff) if staff else None) \
                or ''
            if name:
                owner_by_id[f'LD-{old_id:06d}'] = name

        target = (
            Lead.objects
            .filter(Q(tenant=company) | Q(tenant__isnull=True), added_by='')
            .filter(id__in=list(owner_by_id))
        )
        # Only the empty-added_by leads that actually exist get an owner.
        existing = set(target.values_list('id', flat=True))
        to_update = [(owner_by_id[lid], lid) for lid in existing]

        if not self.dry_run and to_update:
            objs = [Lead(id=lid, added_by=name) for name, lid in to_update]
            Lead.objects.bulk_update(objs, ['added_by'], batch_size=500)

        self.stats = {
            'legacy_leads': len(owner_by_id),
            'backfilled': len(to_update),
            'unchanged': self._count_unowned(),
        }

        self.print_summary()

    def _count_unowned(self):
        """Number of imported leads with no entrant (kept visible org-wide)."""
        return Lead.objects.filter(id__startswith='LD-', added_by='').count()

    def print_summary(self):
        mode = 'DRY RUN (no writes)' if self.dry_run else 'BACKFILL COMPLETE'
        self.stdout.write(self.style.SUCCESS(f'\n== {mode} =='))
        lines = [
            ('Legacy leads with a recorded entrant', self.stats['legacy_leads']),
            ('added_by backfilled', self.stats['backfilled']),
            ('Leads with no entrant (left org-wide)', self.stats['unchanged']),
        ]
        for label, value in lines:
            self.stdout.write(f'{label:<38} {value}')