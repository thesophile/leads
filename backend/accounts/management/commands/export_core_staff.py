import json

from django.core.management.base import BaseCommand, CommandError

from master.models import Staff


class Command(BaseCommand):
    """Export LEADS master staff so they can be imported into SystemSoft Core.

    Each staff row is turned into the employee/identity payload Core needs.
    Staff without a linked login (no ``user``/``email``) are skipped, since Core
    matches identities by email. Feed the result to Core's
    ``import_leads_staff`` command.
    """

    help = 'Export LEADS master staff to JSON for import into SystemSoft Core.'

    def add_arguments(self, parser):
        parser.add_argument('--output', required=True, help='Path to write the export JSON')

    def handle(self, *args, **options):
        staff = []
        skipped = 0
        rows = (
            Staff.objects
            .select_related('user', 'user__company', 'branch')
            .order_by('code')
        )
        for row in rows.iterator():
            user = row.user
            email = (row.email or (user.email if user else '') or '').strip()
            company = user.company.name if user and user.company_id else ''
            if user is None or not email or not company:
                skipped += 1
                continue
            staff.append({
                'code': row.code,
                'name': row.name,
                'role': row.role or '',
                'mobile': row.mobile or '',
                'email': email,
                'branch': row.branch.name if row.branch_id else '',
                'company': company,
                'user_email': user.email,
                'is_active': bool(user.is_active),
            })

        payload = {'staff': staff}
        try:
            with open(options['output'], 'w', encoding='utf-8') as fh:
                json.dump(payload, fh, indent=2)
        except OSError as exc:
            raise CommandError(f'Could not write output file: {exc}')

        self.stdout.write(self.style.SUCCESS(
            f'Exported {len(staff)} staff to {options["output"]}'
        ))
        if skipped:
            self.stdout.write(self.style.WARNING(
                f'{skipped} staff without a linked login/company were skipped.'
            ))
