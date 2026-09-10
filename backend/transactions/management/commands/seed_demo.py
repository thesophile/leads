"""Seed a full demo environment for one company.

Usage::

    python manage.py seed_demo                 # first company, 90 leads
    python manage.py seed_demo --tenant 6 --leads 120

Creates admin/manager/staff logins, branches, leads across every pipeline
stage (raw / assigned / quotation / order / client), call history,
quotations, orders, client details, proposal templates, KPI targets,
notifications and activity-log entries.

Safe to re-run: every row it previously created is removed first, so the
demo set is deterministic and never duplicates.
"""

import random
from datetime import date, datetime, time, timedelta, timezone as dt_timezone

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Company, Role, User
from master.models import Branch, Category, Source
from transactions.models import (
    CallHistory,
    ClientDetail,
    Lead,
    Order,
    ProposalTemplate,
    Quotation,
)
from transactions.views import format_display_date
from utilities.models import Notification, StaffTarget, log_activity

LEAD_PREFIX = 'DEMO-'
QTN_PREFIX = 'QTN-DEMO-'
ORDER_PREFIX = 'ORD-DEMO-'
CLIENT_PREFIX = 'CD-DEMO-'
DEMO_PASSWORD = 'Programers@123'

BRANCHES = [
    ('BR001', 'Head Office', 'MG Road, Kochi, Kerala'),
    ('BR002', 'Calicut Branch', 'Mavoor Road, Calicut, Kerala'),
    ('BR003', 'Trivandrum Branch', 'Vazhuthacaud, Trivandrum, Kerala'),
]

TEAM = [
    {'name': 'Shanu VR', 'email': 'shanu@programers.in', 'role': 'manager', 'branch': 'Head Office'},
    {'name': 'Husna', 'email': 'husna@programers.in', 'role': 'manager', 'branch': 'Head Office'},
    {'name': 'Ajoy', 'email': 'ajoy@programers.in', 'role': 'manager', 'branch': 'Calicut Branch'},
    {'name': 'Sandra', 'email': 'sandra@programers.in', 'role': 'staff', 'branch': 'Head Office'},
    {'name': 'Vishnu', 'email': 'vishnu@programers.in', 'role': 'staff', 'branch': 'Trivandrum Branch'},
    {'name': 'Fathima', 'email': 'fathima@programers.in', 'role': 'staff', 'branch': 'Calicut Branch'},
]
TEAM_NAMES = [member['name'] for member in TEAM]

TEMPLATES = [
    {
        'name': 'Demo - Business Website',
        'category': 'Website',
        'default_total': '75000',
        'default_discount': '5000',
        'scope_html': '<p>Responsive corporate website with up to 10 pages, CMS, '
                      'contact forms and basic SEO.</p>',
        'detail_html': '<p>50% advance on confirmation, balance before go-live. '
                       'Two rounds of revisions included.</p>',
    },
    {
        'name': 'Demo - E-commerce Store',
        'category': 'E-commerce',
        'default_total': '150000',
        'default_discount': '15000',
        'scope_html': '<p>Online store with product catalogue, cart, payment '
                      'gateway, order tracking and admin dashboard.</p>',
        'detail_html': '<p>50% advance, 25% on milestone, 25% before go-live. '
                       'Payment gateway charges billed separately.</p>',
    },
    {
        'name': 'Demo - Mobile App',
        'category': 'App',
        'default_total': '220000',
        'default_discount': '20000',
        'scope_html': '<p>Cross-platform mobile app with authentication, push '
                      'notifications and admin panel.</p>',
        'detail_html': '<p>40% advance, 30% on prototype approval, 30% on '
                       'final delivery. Store submission included.</p>',
    },
]

CITIES = [
    'Kochi', 'Calicut', 'Trivandrum', 'Thrissur', 'Kannur',
    'Alleppey', 'Kozhikode', 'Palakkad', 'Kottayam', 'Malappuram',
]

CONTACTS = [
    'Sunil Kumar', 'Rahul Menon', 'Asha Pillai', 'Vipin Das', 'Divya Nair',
    'Arun Prakash', 'Femy George', 'Leena Nambiar', 'Nithin K', 'Suresh Nair',
    'Vimal Raj', 'Dr. Ashraf Ali', 'Kabeer Khan', 'Farzana K', 'Deepak Varma',
    'Prof. K. S. Menon', 'Ananya Nair', 'Dr. Sarah Ahmed',
]

BUSINESS_BASES = [
    'Green Valley', 'Blue Ocean', 'Sunrise', 'Apex', 'Zenith', 'Royal',
    'Golden', 'Silver Oak', 'Crescent', 'Everest', 'Pinnacle', 'Horizon',
    'Rainbow', 'Emerald', 'Sapphire', 'Pearl', 'Coral', 'Maple',
    'Orchid', 'Crystal', 'Heritage', 'Metro', 'Grand', 'Elite',
    'Prime', 'Star', 'Unity', 'Victory', 'Diamond', 'Falcon',
]
BUSINESS_TYPES = [
    'Hospital', 'Restaurant', 'Supermarket', 'Salon', 'Boutique',
    'Academy', 'Clinic', 'Resorts', 'Interiors', 'Motors',
    'Builders', 'Pharmacy', 'Gym', 'Cafe', 'Hotel',
    'Institute', 'Traders', 'Textiles', 'Jewellers', 'Opticals',
]

SCOPES = [
    'Company website with content management system.',
    'E-commerce store with online payments.',
    'Mobile app for bookings and payments.',
    'Landing pages, blog and lead capture forms.',
    'Digital marketing campaign and SEO setup.',
    'POS and billing system integration.',
    'Room booking website with gallery and tariff.',
    'Admission portal with online enquiry.',
    'Appointment booking and doctor listing.',
    'Product catalogue with enquiry and WhatsApp.',
]

CALL_REPORTS = [
    'Discussed requirement, sending proposal.',
    'Call back requested for next week.',
    'Interested, wants a demo session.',
    'Asked for pricing details over WhatsApp.',
    'Not reachable, will try again.',
    'Budget not finalised yet.',
    'Decision pending with management.',
    'Ready to move ahead, schedule kickoff.',
]

QUOTE_STATUSES = ['Not Sent', 'Pending Approval', 'Approved', 'Sent to Client', 'Rejected']
QUOTE_WEIGHTS = [30, 25, 20, 15, 10]
CALL_STATUSES = [
    'Interested', 'Follow Up', 'Considering', 'Not Reachable',
    'Busy', 'Not Interested', 'For Future', 'Quotation Requested',
]
CLIENT_STATUSES = [
    ClientDetail.STATUS_PENDING,
    ClientDetail.STATUS_COMPLETE,
    ClientDetail.STATUS_IN_PROGRESS,
    ClientDetail.STATUS_COMPLETED,
    ClientDetail.STATUS_PAID,
]


class Command(BaseCommand):
    help = 'Seed a full demo environment (staff, leads, quotations, orders, clients).'

    def add_arguments(self, parser):
        parser.add_argument('--tenant', type=int, default=0,
                            help='Company pk to seed (0 = first company).')
        parser.add_argument('--leads', type=int, default=90,
                            help='Number of demo leads to create.')

    def handle(self, *args, **options):
        company = self._resolve_company(options['tenant'])
        if company is None:
            self.stdout.write(self.style.ERROR('No company exists. Create one first.'))
            return

        count = max(options['leads'], 5)
        rng = random.Random(20260910)

        with transaction.atomic():
            self._cleanup(company)
            branches = self._seed_branches(company)
            roles = {role.code: role for role in Role.objects.filter(company=company)}
            users = self._seed_team(company, roles, branches)
            self._seed_leads(company, users, rng, count)
            self._seed_templates(company, users)
            self._seed_targets(company)
            self._seed_notifications(company, users)
            log_activity(
                users['admin'], company, 'seed',
                'Seeded the demo environment (leads, quotations, orders, clients).',
            )

        self.stdout.write(self.style.SUCCESS(
            f'Seeded demo data for "{company.name}" ({count} leads).'
        ))

    # -- helpers -----------------------------------------------------------

    @staticmethod
    def _resolve_company(tenant):
        if tenant:
            return Company.objects.filter(pk=tenant).first()
        return Company.objects.order_by('id').first()

    def _cleanup(self, company):
        """Remove everything a previous run of this command created."""
        demo_emails = [member['email'] for member in TEAM]
        Quotation.objects.filter(id__startswith=QTN_PREFIX).delete()
        Order.objects.filter(id__startswith=ORDER_PREFIX).delete()
        ClientDetail.objects.filter(id__startswith=CLIENT_PREFIX).delete()
        Lead.objects.filter(id__startswith=LEAD_PREFIX).delete()
        ProposalTemplate.objects.filter(owner__email__in=demo_emails).delete()
        ProposalTemplate.objects.filter(name__startswith='Demo - ').delete()
        StaffTarget.objects.filter(tenant=company, name__in=TEAM_NAMES).delete()
        Notification.objects.filter(type='demo').delete()
        User.objects.filter(email__in=demo_emails, is_superuser=False).delete()

    def _seed_branches(self, company):
        branches = {}
        for code, name, address in BRANCHES:
            branch, _ = Branch.objects.get_or_create(
                company=company, code=code,
                defaults={'name': name, 'address': address},
            )
            branches[name] = branch
        return branches

    def _seed_team(self, company, roles, branches):
        users = {}
        for member in TEAM:
            user = User.objects.filter(email=member['email']).first()
            if user is None:
                user = User(email=member['email'])
            user.name = member['name']
            user.company = company
            user.role = roles.get(member['role'])
            user.phone = f'9{rand_phone()}'
            user.is_staff = True
            user.is_active = True
            user.set_password(DEMO_PASSWORD)
            user.save()

            branch = branches.get(member['branch'])
            profile = getattr(user, 'staff_profile', None)
            if profile is not None and branch is not None:
                profile.branch = branch
                profile.save(update_fields=['branch'])

            users[member['role']] = users.get(member['role'], user)

        admin = User.objects.filter(company=company, role__code='admin').first()
        users['admin'] = admin
        users['all'] = list(User.objects.filter(email__in=[m['email'] for m in TEAM]))
        return users

    def _seed_leads(self, company, users, rng, count):
        categories = list(Category.objects.filter(company=company).values_list('name', flat=True))
        sources = list(Source.objects.filter(company=company).values_list('name', flat=True))
        if not categories:
            categories = ['Others']
        if not sources:
            sources = ['Customer Referral']

        team_names = TEAM_NAMES
        admin_name = users['admin'].name if users.get('admin') else 'Admin'

        used_names = set(
            name.lower() for name in
            Lead.objects.filter(tenant=company).values_list('company', flat=True)
        )

        for index in range(1, count + 1):
            status = rng.choices(
                [Lead.STATUS_RAW, Lead.STATUS_ASSIGNED, Lead.STATUS_QUOTATION,
                 Lead.STATUS_ORDER, Lead.STATUS_CLIENT],
                weights=[34, 25, 18, 13, 10],
            )[0]

            days_ago = self._pick_days_ago(rng, recent=status in (Lead.STATUS_ORDER, Lead.STATUS_CLIENT))
            lead_date = date.today() - timedelta(days=days_ago)

            name = self._unique_company(rng, used_names)
            contact = rng.choice(CONTACTS)
            phone = f'9{rng.randint(100000000, 999999999)}'
            email = f'contact@{abs(hash(name)) % 100000}demo.com'
            category = rng.choice(categories)
            source = rng.choice(sources)
            city = rng.choice(CITIES)
            added_by = rng.choice(team_names + [admin_name])
            assigned_to = '' if status == Lead.STATUS_RAW else rng.choice(team_names)
            is_past_raw = status != Lead.STATUS_RAW

            if status == Lead.STATUS_RAW:
                call_status = 'Pending Call'
                priority = ''
            elif status in (Lead.STATUS_QUOTATION, Lead.STATUS_ORDER, Lead.STATUS_CLIENT):
                call_status = rng.choice(['Interested', 'Quotation Requested', 'Considering'])
                priority = rng.choices(['Hot', 'High', 'Medium', 'Low'], weights=[1, 3, 4, 2])[0]
            else:
                call_status = rng.choice(CALL_STATUSES)
                priority = rng.choices(['Hot', 'High', 'Medium', 'Low'], weights=[1, 3, 4, 2])[0]

            has_follow_up = is_past_raw and rng.random() < 0.45
            follow_up_date = ''
            if has_follow_up:
                due = date.today() + timedelta(days=rng.randint(-18, 7))
                follow_up_date = due.strftime('%d-%m-%Y')

            lead = Lead.objects.create(
                id=f'{LEAD_PREFIX}{index:04d}',
                company=name,
                tenant=company,
                contact=contact,
                phone=phone,
                email=email,
                category=category,
                source=source,
                city=city,
                date=lead_date,
                display_date=format_display_date(lead_date),
                added_by=added_by,
                assigned_to=assigned_to,
                status=status,
                call_status=call_status,
                priority=priority,
                remarks=rng.choice(SCOPES),
                last_call_date=lead_date.strftime('%d-%m-%Y') if is_past_raw else '',
                next_follow_up_date=follow_up_date,
                next_follow_up_time='10:00 AM' if has_follow_up else '',
                has_follow_up=has_follow_up,
            )

            if is_past_raw:
                self._seed_calls(lead, rng, assigned_to or added_by, call_status)

            if status in (Lead.STATUS_QUOTATION, Lead.STATUS_ORDER, Lead.STATUS_CLIENT):
                quotation = self._seed_quotation(index, lead, rng, assigned_to, added_by, status)
                if status in (Lead.STATUS_ORDER, Lead.STATUS_CLIENT):
                    self._seed_order(index, lead, quotation, rng, status)

    @staticmethod
    def _pick_days_ago(rng, recent=False):
        if recent:
            return rng.randint(0, 44)
        roll = rng.random()
        if roll < 0.45:
            return rng.randint(0, 30)
        if roll < 0.75:
            return rng.randint(31, 75)
        return rng.randint(76, 150)

    @staticmethod
    def _unique_company(rng, used_names):
        for _ in range(50):
            name = f'{rng.choice(BUSINESS_BASES)} {rng.choice(BUSINESS_TYPES)} {rng.choice(CITIES)}'
            if name.lower() not in used_names:
                used_names.add(name.lower())
                return name
        fallback = f'Demo Business {rng.randint(1000, 9999)}'
        used_names.add(fallback.lower())
        return fallback

    def _seed_calls(self, lead, rng, caller, call_status):
        span = max(0, min(30, (date.today() - lead.date).days))
        for _ in range(rng.randint(1, 3)):
            offset = rng.randint(0, span) if span else 0
            call_date = lead.date + timedelta(days=offset)
            when = datetime.combine(
                call_date, time(rng.randint(9, 18), rng.randint(0, 59)),
                tzinfo=dt_timezone.utc,
            )
            history = CallHistory.objects.create(
                lead=lead,
                date_time=when.strftime('%d-%m-%Y %I:%M %p'),
                caller=caller,
                report=rng.choice(CALL_REPORTS),
                follow_up='',
                status=call_status,
            )
            CallHistory.objects.filter(pk=history.pk).update(created_at=when)

    def _seed_quotation(self, index, lead, rng, assigned_to, added_by, status):
        total = rng.choice([25000, 45000, 65000, 85000, 100000, 120000, 150000, 180000])
        discount = rng.choice([0, 2500, 5000, 7500, 10000, 15000])
        if discount >= total:
            discount = 0
        if status == Lead.STATUS_QUOTATION:
            qtn_status = rng.choices(QUOTE_STATUSES, weights=QUOTE_WEIGHTS)[0]
        else:
            qtn_status = 'Approved'
        quotation = Quotation.objects.create(
            id=f'{QTN_PREFIX}{index:04d}',
            lead_id=lead.id,
            customer=lead.contact,
            company=lead.company,
            tenant=lead.tenant,
            mobile=lead.phone,
            email=lead.email,
            category=lead.category,
            city=lead.city,
            bdm=assigned_to,
            qtn_by=added_by,
            staff=assigned_to,
            date=lead.display_date,
            status=qtn_status,
            total=str(total),
            discount=str(discount),
            net_amount=str(total - discount),
            currency='INR (₹)',
            source=lead.source,
            proposal_scope=rng.choice(SCOPES),
            terms_conditions='50% advance on confirmation, balance before go-live.',
            client_status='Pending',
        )
        return quotation

    def _seed_order(self, index, lead, quotation, rng, status):
        if status == Lead.STATUS_CLIENT:
            order_status = 'Accepted'
            client_status = 'Accepted'
        else:
            order_status = rng.choices(['Pending', 'Sent to Client'], weights=[55, 45])[0]
            client_status = 'Pending'

        order = Order.objects.create(
            id=f'{ORDER_PREFIX}{index:04d}',
            lead_id=lead.id,
            proposal_no=quotation.id,
            proposal_date=quotation.date,
            customer=lead.contact,
            company=lead.company,
            tenant=lead.tenant,
            mobile=lead.phone,
            email=lead.email,
            city=lead.city,
            bdm=quotation.bdm,
            proposal_by=quotation.qtn_by,
            staff=quotation.staff,
            date=lead.display_date,
            status=order_status,
            total=quotation.total,
            discount=quotation.discount,
            net_amount=quotation.net_amount,
            currency='INR (₹)',
            category=lead.category,
            remarks=lead.remarks,
            scope=quotation.proposal_scope,
            details=quotation.terms_conditions,
            client_status=client_status,
        )

        when = datetime.combine(
            lead.date, time(rng.randint(9, 18), rng.randint(0, 59)),
            tzinfo=dt_timezone.utc,
        )
        Order.objects.filter(pk=order.pk).update(created_at=when)

        if status == Lead.STATUS_CLIENT:
            ClientDetail.objects.create(
                id=f'{CLIENT_PREFIX}{index:04d}',
                order_no=order.id,
                lead_id=lead.id,
                client_name=lead.contact,
                company=lead.company,
                tenant=lead.tenant,
                mobile=lead.phone,
                email=lead.email,
                category=lead.category,
                accepted_date=lead.date.strftime('%Y-%m-%d'),
                collected_by=quotation.staff or quotation.qtn_by,
                notes='Auto-created from an accepted demo order.',
                status=rng.choice(CLIENT_STATUSES),
            )
        return order

    def _seed_templates(self, company, users):
        owner = users.get('admin') or next(iter(users.get('all', []) or [None]), None)
        for template in TEMPLATES:
            ProposalTemplate.objects.get_or_create(
                name=template['name'],
                defaults={
                    'category': template['category'],
                    'default_total': template['default_total'],
                    'default_discount': template['default_discount'],
                    'currency': 'INR (₹)',
                    'scope_html': template['scope_html'],
                    'detail_html': template['detail_html'],
                    'owner': owner,
                },
            )

    def _seed_targets(self, company):
        today = date.today()
        roles = {member['name']: member['role'] for member in TEAM}
        for name in TEAM_NAMES:
            StaffTarget.objects.get_or_create(
                tenant=company, name=name, month=today.month, year=today.year,
                defaults={
                    'role': roles[name].title(),
                    'raw_leads_target': 120,
                    'calls_target': 90,
                    'quotation_target': 25,
                    'sales_target': 8,
                },
            )

    def _seed_notifications(self, company, users):
        recipients = []
        admin = users.get('admin')
        if admin is not None:
            recipients.append(admin)
        superuser = User.objects.filter(is_superuser=True).first()
        if superuser is not None:
            recipients.append(superuser)

        notes = [
            ('Follow-up due', '3 follow-ups are due today.', '/tele-calling'),
            ('Quotation awaiting approval', 'A quotation is pending your approval.', '/quotations'),
            ('New order accepted', 'A client accepted an order — moved to Client Details.', '/client-details'),
        ]
        for recipient in recipients:
            for title, message, url in notes:
                Notification.objects.create(
                    user=recipient,
                    type='demo',
                    title=title,
                    message=message,
                    time='just now',
                    url=url,
                    read=False,
                )


def rand_phone():
    return random.randint(100000000, 999999999)
