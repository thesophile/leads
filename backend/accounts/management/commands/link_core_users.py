import json

from django.core.management.base import BaseCommand, CommandError

from accounts.models import Company, User


class Command(BaseCommand):
    """Link local LEADS accounts to their SystemSoft Core identities.

    Consumes the ``email -> core user id`` and (optional)
    ``company name -> core org id`` maps produced by Core's
    ``import_leads_users`` command.
    """

    help = 'Link LEADS accounts to Core users (and companies to Core organizations).'

    def add_arguments(self, parser):
        parser.add_argument('--users-map', required=True, help='Path to the email -> core user id JSON map')
        parser.add_argument('--orgs-map', default='', help='Path to the company name -> core org id JSON map')

    def handle(self, *args, **options):
        try:
            with open(options['users_map'], encoding='utf-8') as fh:
                user_map = json.load(fh)
        except (OSError, ValueError) as exc:
            raise CommandError(f'Could not read users map: {exc}')

        linked = 0
        missing = 0
        for email, core_id in user_map.items():
            updated = User.objects.filter(email__iexact=email).update(core_user_id=core_id)
            if updated:
                linked += updated
            else:
                missing += 1

        self.stdout.write(self.style.SUCCESS(f'Linked {linked} local accounts.'))

        if options['orgs_map']:
            try:
                with open(options['orgs_map'], encoding='utf-8') as fh:
                    org_map = json.load(fh)
            except (OSError, ValueError) as exc:
                raise CommandError(f'Could not read orgs map: {exc}')

            org_linked = 0
            for name, core_org_id in org_map.items():
                org_linked += Company.objects.filter(name=name).update(core_org_id=core_org_id)
            self.stdout.write(self.style.SUCCESS(f'Linked {org_linked} companies to Core organizations.'))

        if missing:
            self.stdout.write(self.style.WARNING(
                f'{missing} Core users had no matching local LEADS account (skipped).'
            ))
