"""One-shot migration of the legacy CodeIgniter database into the Django app.

Reads the staging database (created by importing ``old_leads.sql``) over a
temporary DB alias and replays categories, sources, staff/users, leads, call
history, quotations and orders into the live ``leadsdb``.

Run with --dry-run to validate without writing anything.
"""

import html
import random
from datetime import datetime

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection, connections

from accounts.models import Company, Role, User
from master.models import Category, Source, Staff
from transactions.models import (
    Attachment,
    CallHistory,
    ClientDetail,
    Lead,
    LeadContactHistory,
    Order,
    ProposalDraft,
    Quotation,
    QuotationApproval,
)
from utilities.models import ActivityLog, Notification

STAGE_SELECTS = {
    'staff': """
        SELECT id, staff_code, name, email, phone, role, status FROM staff
    """,
    'categories': """
        SELECT id, name, category_code FROM categories
    """,
    'sources': """
        SELECT id, name, source_code FROM sources
    """,
    'statuses': """
        SELECT id, name FROM statuses
    """,
    'teledata': """
        SELECT id, company_name, mobile, mobile_2, email, location,
               contact_person, category, staff, assign, source, status,
               CAST(created_at AS CHAR) AS created_at,
               CAST(updated_at AS CHAR) AS updated_at
        FROM teledata
    """,
    'assign_staff': """
        SELECT id, staff_id, tele_id, staff_email,
               CAST(assigned_at AS CHAR) AS assigned_at
        FROM assign_staff
    """,
    'tele_reports': """
        SELECT id, tele_id, status, report,
               CAST(follow_up_date AS CHAR) AS follow_up_date,
               CAST(created_at AS CHAR) AS created_at
        FROM tele_reports
    """,
    'quotation_history': """
        SELECT id, quatation_Code, tele_id, amount, messege, message1,
               discount, source, currency, remarks, qtn_by, bdm, status,
               action, order_status, bdo,
               CAST(delivery_date AS CHAR) AS delivery_date, order_no,
               CAST(created_at AS CHAR) AS created_at,
               CAST(updated_at AS CHAR) AS updated_at,
               reject_status, reject_remarks
        FROM quotation_history
    """,
}

OLD_STATUS_TO_CALL = {
    0: 'Pending Call',
    1: 'Pending Call',
    2: 'Interested',
    3: 'Not Interested',
    4: 'For Future',
    5: 'Quotation Requested',
}

ROLE_MAP = {
    'admin': 'admin',
    'manager': 'manager',
    'marketing-manager': 'manager',
    'general manager': 'manager',
    'department-head': 'manager',
    'telecaller': 'staff',
    'staff': 'staff',
}


def clean_text(value, maxlen=None):
    if value is None:
        return ''
    text = str(value).strip()
    if maxlen:
        text = text[:maxlen]
    return text


def parse_dt(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.startswith('0000-00-00') or text.startswith('1970-01-01'):
        return None
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d'):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def fmt_display(dt):
    if dt is None:
        return ''
    return f'{dt.day} {dt.strftime("%b")} {dt.year}'


def clean_phone(value):
    text = ''.join(ch for ch in clean_text(value, 30) if not ch.isspace())
    return text[:20]


def clean_email(value):
    text = clean_text(value, 150).lower()
    if '@' not in text:
        return ''
    return text


def normalize_currency(value):
    text = clean_text(value, 30)
    low = text.lower()
    if low in ('inr', 'inr (₹)', 'rs', 'rupee', 'rupees', 'rup', '₹'):
        return 'INR (₹)'
    if low in ('$', 'usd', 'us $', 'usd $', 'dollar'):
        return '$'
    if low in ('€', 'eur', 'euro'):
        return '€'
    return text


def unescape_once(value):
    text = clean_text(value)
    if '&lt;' in text or '&amp;' in text:
        return html.unescape(text)
    return text


class Command(BaseCommand):
    help = 'Import legacy (old_leads.sql) data into the current schema.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Validate and report without writing anything.')
        parser.add_argument('--no-reset', action='store_true',
                            help='Skip wiping current transaction data.')
        parser.add_argument('--stage', default='leads_old_stage',
                            help='Staging database that holds the legacy dump.')
        parser.add_argument('--tenant', default='Programers',
                            help='Company (tenant) name to import under.')

    def handle(self, *args, **options):
        self.dry_run = options['dry_run']
        self.no_reset = options['no_reset']
        stage = options['stage']
        tenant_name = options['tenant']

        settings.DATABASES[stage] = {**settings.DATABASES[connection.alias], 'NAME': stage}
        self.stage = connections[stage].cursor()

        self.stats = {
            'categories': 0, 'sources': 0, 'users': 0, 'staff': 0,
            'leads': 0, 'duplicate_leads': 0, 'empty_company_leads': 0,
            'call_history': 0, 'call_history_skipped': 0,
            'quotations': 0, 'quotations_skipped': 0,
            'orders': 0, 'orders_skipped': 0,
            'follow_ups': 0,
        }

        try:
            self.read_stage()
            self.company = self.resolve_company(tenant_name)
            if not self.dry_run:
                self.reset_transactions()
            self.import_catalog()
            self.import_staff_and_users()
            self.import_leads()
            self.import_call_history()
            self.import_quotations()
            if not self.dry_run:
                self.promote_lead_statuses()
        finally:
            connections[stage].close()

        self.print_summary()

    def read_stage(self):
        self.data = {}
        for name, query in STAGE_SELECTS.items():
            self.stage.execute(query)
            cols = [c[0] for c in self.stage.description]
            self.data[name] = [dict(zip(cols, row)) for row in self.stage.fetchall()]

        staff_names = {}
        for row in self.data['staff']:
            staff_names[row['id']] = clean_text(row['name'], 120)
        self.old_staff_names = staff_names
        self.old_category_names = {
            row['id']: clean_text(row['name'], 100) for row in self.data['categories']
        }
        self.old_status_names = {
            row['id']: clean_text(row['name']) for row in self.data['statuses']
        }

        assign_map = {}
        for row in self.data['assign_staff']:
            name = staff_names.get(row['staff_id'])
            if name:
                assign_map[row['tele_id']] = name
        self.assign_map = assign_map

    def resolve_company(self, tenant_name):
        company = Company.objects.filter(name=tenant_name).first()
        if company is None and not self.dry_run:
            company = Company.objects.create(name=tenant_name)
        if company is None:
            company = Company(name=tenant_name, id=-1)
        return company

    # ------------------------------------------------------------------ reset

    def reset_transactions(self):
        if self.no_reset:
            return
        Attachment.objects.all().delete()
        ClientDetail.objects.all().delete()
        Order.objects.all().delete()
        QuotationApproval.objects.all().delete()
        Quotation.objects.all().delete()
        LeadContactHistory.objects.all().delete()
        CallHistory.objects.all().delete()
        Lead.objects.all().delete()
        Notification.objects.all().delete()
        ActivityLog.objects.all().delete()
        ProposalDraft.objects.all().delete()

    # ------------------------------------------------------------------ catalog

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

    def import_catalog(self):
        cat_lower = {n.lower() for n in
                     Category.objects.filter(company=self.company).values_list('name', flat=True)}
        cat_codes = set(Category.objects.filter(company=self.company).values_list('code', flat=True))
        to_create = []
        for row in self.data['categories']:
            name = clean_text(row['name'], 100)
            if not name or name.lower() in cat_lower:
                continue
            code = clean_text(row['category_code'], 20)
            prefix = ''.join(c for c in name.upper() if c.isalpha())[:2] or 'CT'
            if not code:
                code = self._next_code(prefix, cat_codes)
            while code in cat_codes:
                code = self._next_code(prefix, cat_codes)
            cat_lower.add(name.lower())
            cat_codes.add(code)
            to_create.append(Category(company=self.company, name=name, code=code))

        src_lower = {n.lower() for n in
                     Source.objects.filter(company=self.company).values_list('name', flat=True)}
        src_codes = set(Source.objects.filter(company=self.company).values_list('code', flat=True))
        src_to_create = []
        for row in self.data['sources']:
            name = clean_text(row['name'], 100)
            if not name or name.lower() in src_lower:
                continue
            code = clean_text(row['source_code'], 20)
            prefix = ''.join(c for c in name.upper() if c.isalpha())[:2] or 'SC'
            if not code:
                code = self._next_code(prefix, src_codes)
            while code in src_codes:
                code = self._next_code(prefix, src_codes)
            src_lower.add(name.lower())
            src_codes.add(code)
            src_to_create.append(Source(company=self.company, name=name, code=code))

        self.stats['categories'] += len(to_create)
        self.stats['sources'] += len(src_to_create)
        if not self.dry_run:
            Category.objects.bulk_create(to_create)
            Source.objects.bulk_create(src_to_create)

    # ------------------------------------------------------------------ staff/users

    def import_staff_and_users(self):
        existing_emails = {u.email.lower(): u for u in User.objects.all()}
        roles = {r.code: r for r in Role.objects.filter(company=self.company)}
        default_role = roles.get('staff')

        for row in self.data['staff']:
            name = clean_text(row['name'], 120)
            if not name:
                continue
            email = clean_email(row['email'])
            phone = clean_phone(row['phone'])
            role_label = clean_text(row['role'], 120) or 'staff'
            role = roles.get(ROLE_MAP.get(role_label.lower(), 'staff'), default_role)

            user = existing_emails.get(email) if email else None
            if user is None and email:
                self.stats['users'] += 1
                if not self.dry_run:
                    user = User(email=email, name=name, phone=phone,
                                company=self.company, role=role, is_active=True)
                    user.set_unusable_password()
                    user.save()
                    existing_emails[email] = user

            profile = Staff.objects.filter(user=user).first() if user else None
            if profile is not None:
                changed = {}
                if profile.role != role_label:
                    changed['role'] = role_label
                if not profile.mobile and phone:
                    changed['mobile'] = phone
                if not profile.user_id:
                    changed['user'] = user
                if changed:
                    self.stats['staff'] += 1
                    if not self.dry_run:
                        for key, value in changed.items():
                            setattr(profile, key, value)
                        profile.save(update_fields=list(changed))
                continue

            self.stats['staff'] += 1
            if self.dry_run:
                continue
            if Staff.objects.filter(name=name, user=None).exists():
                continue
            Staff.objects.create(
                code=self._staff_code(),
                name=name,
                email=email or '',
                role=role_label,
                mobile=phone,
                branch=None,
                user=user,
            )

    @staticmethod
    def _staff_code():
        used = set(Staff.objects.values_list('code', flat=True))
        num = 1
        while f'ST{num:03d}' in used:
            num += 1
        return f'ST{num:03d}'

    @staticmethod
    def _next_auto(table):
        cur = connections['default'].cursor()
        cur.execute(
            'SELECT AUTO_INCREMENT FROM information_schema.tables '
            'WHERE table_schema = DATABASE() AND table_name = %s',
            [table],
        )
        row = cur.fetchone()
        return int(row[0]) if row and row[0] else 1

    @staticmethod
    def preserve_timestamps(table, columns, params):
        """Run UPDATE ... SET <columns> WHERE id=... for preserved timestamps.

        ``columns`` is a list of column names; each row in ``params`` is the
        column values followed by the primary key.
        """
        if not params:
            return
        sets = ', '.join(f'{col} = %s' for col in columns)
        cur = connections['default'].cursor()
        for i in range(0, len(params), 500):
            cur.executemany(
                f'UPDATE {table} SET {sets} WHERE id = %s',
                params[i:i + 500],
            )

    # ------------------------------------------------------------------ leads

    def import_leads(self):
        report_groups = {}
        for row in self.data['tele_reports']:
            report_groups.setdefault(row['tele_id'], []).append({
                'dt': parse_dt(row['created_at']),
                'follow_up': parse_dt(row['follow_up_date']),
            })

        seen = set()
        rows_by_status = {}
        lead_ts = []
        for row in self.data['teledata']:
            old_id = row['id']
            company_name = clean_text(row['company_name'], 200)
            if not company_name:
                self.stats['empty_company_leads'] += 1
                continue
            key = (self.company.id, company_name.lower())
            if key in seen:
                self.stats['duplicate_leads'] += 1
                continue
            seen.add(key)

            staff_name = self.old_staff_names.get(row['staff']) or self.assign_map.get(old_id, '')
            created = parse_dt(row['created_at'])
            updated = parse_dt(row['updated_at'])

            reports = sorted(report_groups.get(old_id, []),
                             key=lambda r: r['dt'] or datetime.min, reverse=True)
            last_call = ''
            follow_up_date = ''
            has_follow_up = False
            for rep in reports:
                if not last_call and rep['dt']:
                    last_call = fmt_display(rep['dt'])
                if not follow_up_date and rep['follow_up']:
                    follow_up_date = fmt_display(rep['follow_up'])
                    has_follow_up = True

            lead = Lead(
                id=f'LD-{old_id:06d}',
                company=company_name,
                tenant=self.company,
                contact=clean_text(row['contact_person'], 120),
                phone=clean_phone(row['mobile']),
                email=clean_email(row['email']),
                category=self.old_category_names.get(row['category'], '') or '',
                source=clean_text(row['source'], 120),
                city=clean_text(row['location'], 100),
                date=created.date() if created else None,
                display_date=fmt_display(created),
                added_by='',
                assigned_to=staff_name,
                status='assigned' if staff_name else Lead.STATUS_RAW,
                call_status=OLD_STATUS_TO_CALL.get(row['status'], 'Pending Call'),
                priority='',
                remarks='',
                last_call_date=last_call,
                next_follow_up_date=follow_up_date,
                next_follow_up_time='',
                has_follow_up=has_follow_up,
                created_at=created,
                updated_at=updated,
            )
            if has_follow_up:
                self.stats['follow_ups'] += 1
            rows_by_status[old_id] = lead
            lead_ts.append((lead.id, created, updated))
            self.stats['leads'] += 1

        self.lead_objects = rows_by_status
        self.tele_to_lead = {t_id: lead.id for t_id, lead in rows_by_status.items()}
        self.tele_to_assign = {t_id: lead.assigned_to for t_id, lead in rows_by_status.items()}

        if self.dry_run:
            return
        objs = list(rows_by_status.values())
        for i in range(0, len(objs), 500):
            chunk = objs[i:i + 500]
            Lead.objects.bulk_create(chunk)
        self.preserve_timestamps(
            'transactions_lead',
            ['created_at', 'updated_at'],
            [(c or u, u or c, pid) for pid, c, u in lead_ts if c or u],
        )

    # ------------------------------------------------------------------ call history

    def import_call_history(self):
        objs = []
        ts = []
        next_id = self._next_auto('transactions_callhistory')
        for row in self.data['tele_reports']:
            new_lead_id = self.tele_to_lead.get(row['tele_id'])
            if not new_lead_id:
                self.stats['call_history_skipped'] += 1
                continue
            dt = parse_dt(row['created_at'])
            obj = CallHistory(
                pk=next_id,
                lead_id=new_lead_id,
                date_time=str(dt)[:16] if dt else '',
                caller=self.tele_to_assign.get(row['tele_id'], ''),
                report=clean_text(row['report']),
                follow_up=fmt_display(parse_dt(row['follow_up_date'])),
                status=self.old_status_names.get(row['status'], ''),
                created_at=dt,
            )
            next_id += 1
            objs.append(obj)
            ts.append((dt, obj.pk))

        self.stats['call_history'] += len(objs)
        if self.dry_run:
            return
        for i in range(0, len(objs), 500):
            CallHistory.objects.bulk_create(objs[i:i + 500])
            first, last = i, min(i + 500, len(ts))
            self.preserve_timestamps(
                'transactions_callhistory',
                ['created_at'],
                [(d, pk) for d, pk in ts[first:last] if d],
            )

    # ------------------------------------------------------------------ quotations/orders

    def import_quotations(self):
        seq = {}
        quote_objs = []
        quote_ts = []
        order_objs = []
        order_ts = []
        for row in self.data['quotation_history']:
            new_lead_id = self.tele_to_lead.get(row['tele_id'])
            if not new_lead_id:
                self.stats['quotations_skipped'] += 1
                continue
            lead_obj = self.lead_objects.get(row['tele_id'])
            seq[new_lead_id] = seq.get(new_lead_id, 0) + 1

            code = clean_text(row['quatation_Code'], 30) or f'QTN{row["id"]}'
            created = parse_dt(row['created_at'])
            updated = parse_dt(row['updated_at'])
            amount = int(row['amount'] or 0)
            discount = int(row['discount'] or 0)
            net = max(0, amount - discount)
            category_name = lead_obj.category if lead_obj else ''
            company_name = lead_obj.company if lead_obj else ''
            order_marker = bool(
                row['order_no']
                or (row['order_status'] or 0) >= 2
                or parse_dt(row['delivery_date']) is not None
            )

            quote_objs.append(Quotation(
                id=code,
                lead_id=new_lead_id,
                customer='',
                company=company_name,
                tenant=self.company,
                mobile=lead_obj.phone if lead_obj else '',
                email=lead_obj.email if lead_obj else '',
                category=category_name,
                city=lead_obj.city if lead_obj else '',
                bdm=clean_text(row['bdm'], 120),
                qtn_by=clean_text(row['qtn_by'], 120),
                staff='',
                date=fmt_display(created),
                revision_no='',
                version_no=seq[new_lead_id],
                status='Approved' if order_marker else 'Not Sent',
                total=str(amount),
                discount=str(discount),
                net_amount=str(net),
                currency=normalize_currency(row['currency']),
                source=clean_text(row['source'], 120),
                proposal_scope=unescape_once(row['messege']),
                terms_conditions=unescape_once(row['message1']),
                remarks=clean_text(row['remarks'], 200),
                created_at=created,
                updated_at=updated,
            ))
            self.stats['quotations'] += 1
            quote_ts.append((code, created, updated))

            if order_marker:
                order_objs.append(Order(
                    id=f'ORD{code}',
                    lead_id=new_lead_id,
                    proposal_no=code,
                    proposal_date=fmt_display(created),
                    customer='',
                    company=company_name,
                    tenant=self.company,
                    mobile=lead_obj.phone if lead_obj else '',
                    email=lead_obj.email if lead_obj else '',
                    city=lead_obj.city if lead_obj else '',
                    bdm=clean_text(row['bdm'], 120),
                    proposal_by=clean_text(row['qtn_by'], 120),
                    staff='',
                    date=fmt_display(created),
                    status='Pending',
                    total=str(amount),
                    discount=str(discount),
                    net_amount=str(net),
                    currency=normalize_currency(row['currency']),
                    category=category_name,
                    remarks=clean_text(row['remarks'], 200),
                    scope=unescape_once(row['messege']),
                    details='',
                    created_at=created,
                    updated_at=updated,
                ))
                self.stats['orders'] += 1
                order_ts.append((f'ORD{code}', created, updated))
            else:
                self.stats['orders_skipped'] += 1

        if self.dry_run:
            return
        for i in range(0, len(quote_objs), 500):
            chunk = quote_objs[i:i + 500]
            Quotation.objects.bulk_create(chunk)
            first, last = i, min(i + 500, len(quote_ts))
            self.preserve_timestamps(
                'transactions_quotation',
                ['created_at', 'updated_at'],
                [(c or u, u or c, pid) for pid, c, u in quote_ts[first:last] if c or u],
            )
        for i in range(0, len(order_objs), 500):
            chunk = order_objs[i:i + 500]
            Order.objects.bulk_create(chunk)
            first, last = i, min(i + 500, len(order_ts))
            self.preserve_timestamps(
                'transactions_order',
                ['created_at', 'updated_at'],
                [(c or u, u or c, pid) for pid, c, u in order_ts[first:last] if c or u],
            )

    # ------------------------------------------------------------------ post-pass

    def promote_lead_statuses(self):
        quote_ids = set(
            Quotation.objects.filter(lead_id__startswith='LD-')
            .values_list('lead_id', flat=True)
        )
        order_ids = set(
            Order.objects.filter(lead_id__startswith='LD-')
            .values_list('lead_id', flat=True)
        )
        if quote_ids:
            Lead.objects.filter(id__in=quote_ids).update(status=Lead.STATUS_QUOTATION)
        if order_ids:
            Lead.objects.filter(id__in=order_ids).update(status=Lead.STATUS_ORDER)

    # ------------------------------------------------------------------ output

    def print_summary(self):
        mode = 'DRY RUN (no writes)' if self.dry_run else 'IMPORT COMPLETE'
        self.stdout.write(self.style.SUCCESS(f'\n== {mode} =='))
        lines = [
            ('Categories created', self.stats['categories']),
            ('Sources created', self.stats['sources']),
            ('User accounts created', self.stats['users']),
            ('Staff entries added', self.stats['staff']),
            ('Leads imported', self.stats['leads']),
            ('  duplicate company leads skipped', self.stats['duplicate_leads']),
            ('  empty-company leads skipped', self.stats['empty_company_leads']),
            ('Follow-up leads flagged', self.stats['follow_ups']),
            ('Call history imported', self.stats['call_history']),
            ('  call history skipped (no lead)', self.stats['call_history_skipped']),
            ('Quotations imported', self.stats['quotations']),
            ('  quotations skipped (no lead)', self.stats['quotations_skipped']),
            ('Orders created', self.stats['orders']),
            ('  quotations without order marker', self.stats['orders_skipped']),
        ]
        for label, value in lines:
            self.stdout.write(f'{label:<42} {value}')