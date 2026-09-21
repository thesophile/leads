"""Remove pre-import demo/scaffold data so the DB holds only legacy data.

After ``import_legacy`` runs, the live database may still contain demo records
that predate the import (demo users whose emails are not on legacy staff,
standard seed catalog merged in, demo branches/targets/templates, an unused
demo role). This command deletes them and rebuilds the per-company category /
source catalog strictly from the staging (old_leads.sql) tables.

Run with --dry-run to see what would be changed without writing anything.
"""

import random

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection, connections

from accounts.models import Company, Role, User
from master.models import Branch, Category, Source
from transactions.models import ProposalTemplate
from utilities.models import StaffTarget


def clean_text(value, maxlen=None):
    if value is None:
        return ''
    text = str(value).strip()
    if maxlen:
        text = text[:maxlen]
    return text


class Command(BaseCommand):
    help = 'Purge pre-import demo data; keep only data from old_leads.sql.'

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
            self.old_emails = self.fetch_emails(cursor)
            categories = self.fetch_rows(cursor, 'categories')
            sources = self.fetch_rows(cursor, 'sources', code_col='source_code')
        finally:
            connections[stage].close()

        company = Company.objects.filter(name=tenant_name).first()
        if company is None:
            self.stdout.write(self.style.ERROR(
                f'Tenant "{tenant_name}" not found - nothing to clean.'))
            return

        self.company = company
        self.removed = []
        self.clean_users()
        self.clean_role()
        self.clean_master_rows()
        self.rebuild_catalog(categories, sources)
        self.print_summary()

    def fetch_emails(self, cursor):
        cursor.execute('SELECT DISTINCT LOWER(TRIM(email)) FROM staff WHERE email IS NOT NULL')
        emails = set()
        for (email,) in cursor.fetchall():
            if email and '@' in email:
                emails.add(email)
        return emails

    def fetch_rows(self, cursor, table, code_col='category_code'):
        cursor.execute(f'SELECT id, name, {code_col} AS code FROM {table}')
        cols = [c[0] for c in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]

    # ------------------------------------------------------------------ removals

    def clean_users(self):
        doomed = (
            User.objects.filter(company=self.company, is_superuser=False)
            .exclude(email__in=self.old_emails)
        )
        for user in doomed:
            self.removed.append(f'user: {user.email}')
            if not self.dry_run:
                user.delete()

    def clean_role(self):
        for role in Role.objects.filter(company=self.company).exclude(
                code__in=('admin', 'manager', 'staff')):
            if role.users.exists():
                continue
            self.removed.append(f'role: {role.code}')
            if not self.dry_run:
                role.delete()

    def clean_master_rows(self):
        for model, label in ((Branch, 'branch'), (StaffTarget, 'staff target'),
                             (ProposalTemplate, 'proposal template')):
            count = model.objects.all().count()
            if not count:
                continue
            self.removed.append(f'{label} rows: {count}')
            if not self.dry_run:
                model.objects.all().delete()

    # ------------------------------------------------------------------ catalog rebuild

    @staticmethod
    def _next_code(prefix, used):
        for _ in range(200):
            candidate = f'{prefix}{random.randint(10, 99)}'
            if candidate not in used:
                return candidate
        while True:
            candidate = f'{prefix}{random.randint(100, 999)}'
            if candidate not in used:
                return candidate

    def _rebuild_one(self, model, rows, names):
        existing_lower = set()
        existing_codes = set()
        created = 0
        for row in rows:
            name = clean_text(row['name'], 100)
            if not name or name.lower() in existing_lower:
                continue
            code = clean_text(row['code'], 20)
            prefix = ''.join(c for c in name.upper() if c.isalpha())[:2] or names
            if not code:
                code = self._next_code(prefix, existing_codes)
            while code in existing_codes:
                code = self._next_code(prefix, existing_codes)
            existing_lower.add(name.lower())
            existing_codes.add(code)
            if not self.dry_run:
                model.objects.create(company=self.company, name=name, code=code)
            created += 1
        return created

    def rebuild_catalog(self, categories, sources):
        cat_count = Category.objects.filter(company=self.company).count()
        src_count = Source.objects.filter(company=self.company).count()
        if cat_count:
            self.removed.append(f'categories wiped: {cat_count}')
            if not self.dry_run:
                Category.objects.filter(company=self.company).delete()
        if src_count:
            self.removed.append(f'sources wiped: {src_count}')
            if not self.dry_run:
                Source.objects.filter(company=self.company).delete()

        self.stats_cat = self._rebuild_one(Category, categories, 'CT')
        self.stats_src = self._rebuild_one(Source, sources, 'SC')

    # ------------------------------------------------------------------ output

    def print_summary(self):
        mode = 'DRY RUN (no writes)' if self.dry_run else 'CLEANUP COMPLETE'
        self.stdout.write(self.style.SUCCESS(f'\n== {mode} =='))
        for line in self.removed:
            self.stdout.write(f'removed  {line}')
        if not self.removed:
            self.stdout.write('nothing to remove')
        self.stdout.write(f'categories rebuilt:   {self.stats_cat}')
        self.stdout.write(f'sources rebuilt:      {self.stats_src}')