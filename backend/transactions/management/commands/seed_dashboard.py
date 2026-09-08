import random
from datetime import date, datetime, timedelta

from django.core.management.base import BaseCommand

from accounts.models import Company
from master.models import Category, Source
from transactions.models import CallHistory, Lead
from transactions.views import format_display_date

SOURCES = [
    'Google Search',
    'Customer Referral',
    'Instagram Campaign',
    'Facebook Ads',
    'Official Website',
    'Manual Walk-in Entry',
    'WhatsApp Business API',
    'LinkedIn B2B Outreach',
]

CATEGORIES = [
    'Hospital',
    'REASTURANT',
    'SHOPPING MALL',
    'EDUCATION & SCHOOL',
    'SALON & SPA',
    'INTERIOR DESIGNERS',
    'COSMETICS STORE',
    'CLINIC & HEALTHCARE',
]

CITIES = [
    'Kochi', 'Thrissur', 'Trivandrum', 'Kannur', 'Alleppey',
    'Kozhikode', 'Palakkad', 'Chalakudy', 'Thriprayar',
]

STAFF = [
    'Abhinav', 'Ajoy', 'Amitha', 'Azeem', 'Darsana',
    'Fairooz', 'Fathima', 'Husna', 'Malavika', 'Nabeel',
    'Rinshad', 'Sajiv', 'Sandra', 'Shahal', 'Shanu',
    'Sreelakshmi', 'Vishnu',
]

CALL_STATUSES = [
    'Pending Call',
    'Interested',
    'Quotation Requested',
    'Follow Up',
    'Not Interested',
    'Considering',
]

STATUS_WEIGHTS = [
    (Lead.STATUS_RAW, 5),
    (Lead.STATUS_ASSIGNED, 3),
    (Lead.STATUS_QUOTATION, 2),
    (Lead.STATUS_ORDER, 1),
    (Lead.STATUS_CLIENT, 1),
]

REPORT_SNIPPETS = [
    'Website redesign enquiry.',
    'E-commerce store with payments.',
    'Landing pages and blog.',
    'Mobile app for bookings.',
    'Digital marketing campaign.',
    'POS and billing system.',
    'Social media management.',
    'SEO and performance audit.',
]


class Command(BaseCommand):
    help = 'Seed demo dashboard leads spread across the last N months.'

    def add_arguments(self, parser):
        parser.add_argument('--months', type=int, default=12)
        parser.add_argument('--per-month', type=int, default=3)
        parser.add_argument('--tenant', type=int, default=0,
                            help='Company pk to attach seeds to (0 = mix of existing companies + legacy).')

    def handle(self, *args, **options):
        months = max(options['months'], 1)
        per_month = max(options['per_month'], 1)

        # Clean up any previously seeded rows so re-running stays idempotent.
        existing = Lead.objects.filter(id__startswith='SEED-')
        deleted = existing.count()
        CallHistory.objects.filter(lead__id__startswith='SEED-').delete()
        existing.delete()
        self.stdout.write(self.style.WARNING(f'Removed {deleted} previous seed leads.'))

        tenant_pks = list(Company.objects.values_list('pk', flat=True))
        if not tenant_pks:
            self.stdout.write(self.style.ERROR('No companies exist. Create one first.'))
            return

        used_ids = set(Lead.objects.values_list('id', flat=True))
        used_companies = set(
            Lead.objects.values_list('company', flat=True)
        )

        today = date.today()
        total = 0
        rng = random.Random(20260908)  # Deterministic across runs.

        for month_offset in range(months - 1, -1, -1):
            # Target a date in this month, clamped to today for the current month.
            year = today.year
            month = today.month - month_offset
            while month < 1:
                month += 12
                year -= 1
            month_start = date(year, month, 1)
            if month_offset == 0:
                month_end = today
            else:
                next_month = month + 1
                next_year = year
                if next_month > 12:
                    next_month = 1
                    next_year += 1
                month_end = date(next_year, next_month, 1) - timedelta(days=1)

            for i in range(per_month):
                day = min(month_start.day + rng.choice([0, 2, 4, 7, 9, 12, 15, 18, 22, -1]), month_end.day)
                day = max(day, month_start.day)
                lead_date = date(month_start.year, month_start.month, day)

                company = f'SEED - {rng.choice(CITIES)} {month_offset:02d}-{i}'
                while company in used_companies:
                    company += f'-{rng.randint(100, 999)}'
                used_companies.add(company)

                lead_id = self._unique_id(used_ids)

                if options['tenant']:
                    tenant_id = options['tenant']
                else:
                    tenant_id = None if rng.random() < 0.4 else rng.choice(tenant_pks)

                added_by = rng.choice(STAFF)
                is_past_raw = rng.random() < 0.55
                status = rng.choices(
                    [s for s, _ in STATUS_WEIGHTS],
                    weights=[w for _, w in STATUS_WEIGHTS],
                )[0]
                call_status = rng.choice(CALL_STATUSES)
                if not is_past_raw:
                    status = Lead.STATUS_RAW
                    call_status = 'Pending Call'

                priority = ''
                if is_past_raw:
                    priority = rng.choices(
                        ['Hot', 'High', 'Medium', 'Low'],
                        weights=[1, 3, 4, 2],
                    )[0]

                has_follow_up = is_past_raw and rng.random() < 0.5

                lead = Lead.objects.create(
                    id=lead_id,
                    company=company,
                    tenant_id=tenant_id,
                    contact=rng.choice(['Sunil Kumar', 'Rahul Menon', 'Asha Pillai', 'Vipin Das', 'Divya Nair']),
                    phone=f'9{rng.randint(000000000, 999999999):09d}',
                    email=f'seed{lead_id[-4:]}@example.com',
                    category=rng.choice(CATEGORIES),
                    source=rng.choice(SOURCES),
                    city=rng.choice(CITIES),
                    date=lead_date,
                    display_date=format_display_date(lead_date),
                    added_by=added_by,
                    assigned_to=rng.choice(STAFF) if is_past_raw else '',
                    status=status,
                    call_status=call_status,
                    priority=priority,
                    remarks=rng.choice(REPORT_SNIPPETS),
                    last_call_date=lead_date.strftime('%d-%m-%Y') if is_past_raw and rng.random() < 0.7 else '',
                    next_follow_up_date='',
                    next_follow_up_time='10:00 AM',
                    has_follow_up=has_follow_up,
                )

                # A call history entry for most non-raw leads sustains the
                # contacted/calls metrics across the seeded period.
                if is_past_raw and rng.random() < 0.6:
                    call_dt = datetime.combine(lead_date, datetime.min.time()).replace(
                        hour=rng.randint(9, 18), minute=rng.randint(0, 59)
                    )
                    CallHistory.objects.create(
                        lead=lead,
                        date_time=call_dt.strftime('%d-%m-%Y %I:%M %p'),
                        caller=added_by,
                        report=rng.choice(REPORT_SNIPPETS),
                        follow_up='',
                        status=call_status,
                        created_at=call_dt,
                    )

                total += 1

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {total} dashboard leads across the last {months} months.'
        ))

    @staticmethod
    def _unique_id(used_ids):
        for _ in range(300):
            candidate = f'SEED-{random.randint(100000, 999999)}'
            if candidate not in used_ids:
                used_ids.add(candidate)
                return candidate
        raise RuntimeError('Could not generate a unique seed lead id.')