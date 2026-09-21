"""Fix pre-import demo identities kept during the legacy import.

A few accounts (Abhinav, Husna, Sandra) existed as demo data before the import
and were kept because their email matched a legacy staff member. This command
renames them to the legacy staff name and aligns their system role, while
preserving the original legacy role label on the linked staff profile.
"""

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection, connections

from accounts.models import Company, Role, User
from master.models import Staff

ROLE_MAP = {
    'admin': 'admin',
    'manager': 'manager',
    'marketing-manager': 'manager',
    'general manager': 'manager',
    'department-head': 'manager',
    'telecaller': 'staff',
    'staff': 'staff',
}


class Command(BaseCommand):
    help = 'Rename kept accounts to their legacy staff names and roles.'

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
            cursor.execute(
                'SELECT id, name, email, role FROM staff WHERE email IS NOT NULL '
                "AND email <> ''"
            )
            cols = [c[0] for c in cursor.description]
            legacy = [dict(zip(cols, row)) for row in cursor.fetchall()]
        finally:
            connections[stage].close()

        company = Company.objects.filter(name=tenant_name).first()
        if company is None:
            self.stdout.write(self.style.ERROR(f'Tenant "{tenant_name}" not found.'))
            return

        roles = {r.code: r for r in Role.objects.filter(company=company)}
        legacy_by_email = {}
        for row in legacy:
            email = str(row['email']).strip().lower()
            if '@' in email:
                legacy_by_email.setdefault(email, []).append(row)

        self.changes = []
        for user in User.objects.filter(company=company, is_superuser=False):
            if not user.email:
                continue
            rows = legacy_by_email.get(user.email.lower())
            if not rows:
                continue
            legacy_row = rows[0]
            old_name = str(legacy_row['name']).strip()
            old_role_label = str(legacy_row['role']).strip() or 'staff'
            mapped_code = ROLE_MAP.get(old_role_label.lower(), 'staff')
            target_role = roles.get(mapped_code, user.role)

            should_rename = old_name and old_name != user.name
            should_reassign = target_role is not None and user.role_id != target_role.id

            if not should_rename and not should_reassign:
                self.preserve_label(user, old_role_label)
                continue

            reason = []
            if should_rename:
                reason.append(f'name {user.name!r} -> {old_name!r}')
            if should_reassign:
                reason.append(f'role {user.role.name if user.role else "?"} -> {target_role.name}')
            self.changes.append(f'{user.email}: {"; ".join(reason)}')

            if self.dry_run:
                continue

            if should_rename:
                user.name = old_name
            if should_reassign:
                user.role = target_role
            user.save(update_fields=['name', 'role'])

            self.preserve_label(user, old_role_label)

        self.print_summary()

    def preserve_label(self, user, old_role_label):
        profile = Staff.objects.filter(user=user).first()
        if profile is None:
            return
        if not self.dry_run and profile.role != old_role_label:
            profile.role = old_role_label
            profile.save(update_fields=['role'])
        if old_role_label and profile.role != old_role_label:
            self.changes.append(f'{user.email}: staff label -> {old_role_label!r}')
        elif self.dry_run and profile.role != old_role_label:
            self.changes.append(f'{user.email}: staff label -> {old_role_label!r}')

    def print_summary(self):
        mode = 'DRY RUN (no writes)' if self.dry_run else 'FIX COMPLETE'
        self.stdout.write(self.style.SUCCESS(f'\n== {mode} =='))
        if not self.changes:
            self.stdout.write('no changes needed')
        for line in self.changes:
            self.stdout.write(f'{line}')