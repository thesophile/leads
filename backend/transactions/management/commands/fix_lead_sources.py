"""Replace legacy numeric lead-source codes with their real channel names.

Leads imported from the old system keep the old ``teledata.source`` value
verbatim, which is a bare number (e.g. ``7``, ``4``) referencing the old
system's source table. The current master catalog stores channel names
(``Facebook Ads``, ``Internal Database``, ...), so numeric codes show up as-is
in dashboards, registers, exports and filters.

This command rewrites ``Lead.source`` codes to names using the mapping below
(derived from the legacy standard source table, whose indexes are embedded in
the old source codes ``GO01..PT15`` from the ``0006_seed_sources`` migration)
and provisions any missing name in the company's master ``Source`` catalog so
future edits still pass master-value validation.

Run with --dry-run to see what would change without writing anything.
"""

import hashlib
from collections import Counter

from django.core.management.base import BaseCommand

from accounts.models import Company
from master.models import Source
from transactions.models import Lead


LEGACY_LEAD_SOURCES = {
    '4': 'Facebook Ads',
    '5': 'Instagram Campaign',
    '6': 'Existing Customer',
    '7': 'Internal Database',
    '8': 'Print & Billboard Advertisement',
    '10': 'Manual Walk-in Entry',
}


def _fallback_code(existing_codes):
    for i in range(1, 1000):
        code = 'LG{0:03d}'.format(i)
        if code not in existing_codes:
            return code
    return 'SR-{0}'.format(hashlib.md5(str(existing_codes).encode()).hexdigest()[:6])


class Command(BaseCommand):
    help = 'Replace legacy numeric lead-source codes with real channel names.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Report changes without writing anything.')
        parser.add_argument('--tenant', default='Programers',
                            help='Company (tenant) whose leads carry the numeric codes.')

    def handle(self, *args, **options):
        self.dry_run = options['dry_run']
        company = Company.objects.filter(name=options['tenant']).first()
        if company is None:
            self.stdout.write(self.style.ERROR(
                'Tenant "{0}" not found - nothing to fix.'.format(options['tenant'])))
            return

        codes = list(LEGACY_LEAD_SOURCES)
        affected = Lead.objects.filter(tenant=company, source__in=codes)
        counts = Counter(affected.values_list('source', flat=True))

        if not counts:
            self.stdout.write(self.style.SUCCESS(
                'No leads in "{0}" carry legacy numeric sources.'.format(company.name)))
            return

        # Provision each target name in the company's master source catalog.
        existing_codes = set(
            Source.objects.filter(company=company).values_list('code', flat=True)
        )
        existing_names = set(
            src.lower()
            for src in Source.objects.filter(company=company).values_list('name', flat=True)
        )
        would_create = []
        for code in counts:
            name = LEGACY_LEAD_SOURCES[code]
            if name.lower() in existing_names:
                continue
            new_code = _fallback_code(existing_codes)
            existing_codes.add(new_code)
            existing_names.add(name.lower())
            would_create.append((name, new_code))

        if not self.dry_run:
            if would_create:
                Source.objects.bulk_create([
                    Source(company=company, name=name, code=code)
                    for name, code in would_create
                ])
            pairs = [
                (lid, LEGACY_LEAD_SOURCES[src])
                for lid, src in affected.values_list('id', 'source').iterator()
            ]
            for i in range(0, len(pairs), 500):
                Lead.objects.bulk_update(
                    [Lead(id=lid, source=name) for lid, name in pairs[i:i + 500]],
                    ['source'],
                )

        self._print_summary(counts, [name for name, _ in would_create])

    def _print_summary(self, counts, created_sources):
        mode = 'DRY RUN (no writes)' if self.dry_run else 'FIX COMPLETE'
        self.stdout.write(self.style.SUCCESS('\n== {0} =='.format(mode)))
        for code, n in sorted(counts.items(), key=lambda kv: -kv[1]):
            self.stdout.write(
                'code {0:<3} -> {1:<30} {2} lead(s)'.format(
                    code, LEGACY_LEAD_SOURCES[code], n))
        if created_sources:
            verb = 'Would add' if self.dry_run else 'Added'
            self.stdout.write('{0} to master Sources catalog: {1}'.format(
                verb, ', '.join(created_sources)))