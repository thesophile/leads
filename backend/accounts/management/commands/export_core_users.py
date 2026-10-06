import json

from django.core.management.base import BaseCommand, CommandError

from accounts.models import Company, User


class Command(BaseCommand):
    """Export LEADS identities so they can be imported into SystemSoft Core.

    Writes the raw Django password hash untouched; Core imports it verbatim so
    existing users keep their passwords. Feed the result to Core's
    ``import_leads_users`` command.
    """

    help = 'Export LEADS users/companies to JSON for import into SystemSoft Core.'

    def add_arguments(self, parser):
        parser.add_argument('--output', required=True, help='Path to write the export JSON')

    def handle(self, *args, **options):
        users = []
        for user in User.objects.all().iterator():
            # Django stores unusable passwords with a leading '!'. Copying such a
            # hash into Core would make the account unable to authenticate (and
            # could clobber a real Core password), so export it without one.
            password = user.password or ''
            if password.startswith('!'):
                password = ''
            users.append({
                'email': user.email,
                'name': user.name,
                'phone': user.phone or '',
                'password': password,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
                'is_active': user.is_active,
            })

        companies = []
        for company in Company.objects.all().iterator():
            admin_emails = list(
                User.objects.filter(company=company, role__code='admin').values_list('email', flat=True)
            )
            companies.append({'name': company.name, 'admin_emails': admin_emails})

        payload = {'users': users, 'companies': companies}
        try:
            with open(options['output'], 'w', encoding='utf-8') as fh:
                json.dump(payload, fh, indent=2)
        except OSError as exc:
            raise CommandError(f'Could not write output file: {exc}')

        self.stdout.write(self.style.SUCCESS(
            f'Exported {len(users)} users and {len(companies)} companies to {options["output"]}'
        ))
