"""Add 8 Manage Quotation leads (status='quotation') with matching quotes."""

from datetime import date

from django.db import migrations

QUOTATION_LEADS = [
    {
        'id': 'RAW-030001',
        'lead': {
            'company': 'TECHNOFAB WEBDESIGN STUDIO', 'contact': 'Nithin K',
            'phone': '9894003110', 'email': 'projects@technofab.in',
            'category': 'Others', 'source': 'Customer Referral', 'city': 'Kochi',
            'date': date(2026, 8, 15), 'display_date': '15 Aug 2026',
            'added_by': 'Abhinav', 'assigned_to': 'Shanu', 'priority': 'High',
            'remarks': 'Portfolio with CMS.',
        },
        'qtn': {
            'id': 'QTN-030001', 'customer': 'Nithin K', 'bdm': 'Shanu',
            'qtn_by': 'Abhinav', 'staff': 'Shanu', 'date': '15 Aug 2026',
            'status': 'Pending Approval', 'total': '85000', 'discount': '5000',
            'net_amount': '80000', 'currency': 'INR (Rs)',
            'source': 'Customer Referral',
            'proposal_scope': 'Company website with content management system, 10 pages.',
            'terms_conditions': '50% advance, balance before go-live.',
        },
    },
    {
        'id': 'RAW-030002',
        'lead': {
            'company': 'PINNACLE AUTO DEALERS', 'contact': 'Suresh Nair',
            'phone': '9845103111', 'email': 'sales@pinnacleauto.in',
            'category': 'Automobile Dealership', 'source': 'Official Website',
            'city': 'Calicut', 'date': date(2026, 8, 15), 'display_date': '15 Aug 2026',
            'added_by': 'Husna', 'assigned_to': 'Abhinav', 'priority': 'High',
            'remarks': 'Vehicle catalogue + enquiry form.',
        },
        'qtn': {
            'id': 'QTN-030002', 'customer': 'Suresh Nair', 'bdm': 'Abhinav',
            'qtn_by': 'Husna', 'staff': 'Abhinav', 'date': '15 Aug 2026',
            'status': 'Approved', 'total': '120000', 'discount': '10000',
            'net_amount': '110000', 'currency': 'INR (Rs)',
            'source': 'Official Website',
            'proposal_scope': 'Dealership website with vehicle catalogue, enquiry forms and gallery.',
            'terms_conditions': '40% advance, 60% on delivery.',
        },
    },
    {
        'id': 'RAW-030003',
        'lead': {
            'company': 'CELESTIAL EVENTS MANAGEMENT', 'contact': 'Arun Prakash',
            'phone': '9876203112', 'email': 'bookings@celestialeventz.in',
            'category': 'Event Management', 'source': 'Instagram Campaign',
            'city': 'Kochi', 'date': date(2026, 8, 14), 'display_date': '14 Aug 2026',
            'added_by': 'Sandra', 'assigned_to': 'Husna', 'priority': 'Medium',
            'remarks': 'Booking + portfolio site.',
        },
        'qtn': {
            'id': 'QTN-030003', 'customer': 'Arun Prakash', 'bdm': 'Husna',
            'qtn_by': 'Sandra', 'staff': 'Husna', 'date': '14 Aug 2026',
            'status': 'Sent to Client', 'total': '65000', 'discount': '0',
            'net_amount': '65000', 'currency': 'INR (Rs)',
            'source': 'Instagram Campaign',
            'proposal_scope': 'Event booking website with gallery and enquiry.',
            'terms_conditions': 'Full payment on confirmation.',
        },
    },
    {
        'id': 'RAW-030004',
        'lead': {
            'company': 'ORANGE DIGITAL MARKETING', 'contact': 'Femy George',
            'phone': '9846303113', 'email': 'hello@orangedigital.in',
            'category': 'Others', 'source': 'Facebook Ads', 'city': 'Trivandrum',
            'date': date(2026, 8, 13), 'display_date': '13 Aug 2026',
            'added_by': 'Fairooz', 'assigned_to': 'Malavika', 'priority': 'Medium',
            'remarks': 'Landing pages and blog.',
        },
        'qtn': {
            'id': 'QTN-030004', 'customer': 'Femy George', 'bdm': 'Malavika',
            'qtn_by': 'Fairooz', 'staff': 'Malavika', 'date': '13 Aug 2026',
            'status': 'Not Sent', 'total': '45000', 'discount': '5000',
            'net_amount': '40000', 'currency': 'INR (Rs)',
            'source': 'Facebook Ads',
            'proposal_scope': 'Marketing site with blog, landing pages and lead capture.',
            'terms_conditions': '50% advance, balance on delivery.',
        },
    },
    {
        'id': 'RAW-030005',
        'lead': {
            'company': 'GREEN BANANA ORGANIC FOODS', 'contact': 'Leena Nambiar',
            'phone': '9986403114', 'email': 'care@greenbananaorganic.com',
            'category': 'Fancy Shops', 'source': 'Google Search', 'city': 'Kannur',
            'date': date(2026, 8, 12), 'display_date': '12 Aug 2026',
            'added_by': 'Vishnu', 'assigned_to': 'Sandra', 'priority': 'High',
            'remarks': 'E-commerce store with payments.',
        },
        'qtn': {
            'id': 'QTN-030005', 'customer': 'Leena Nambiar', 'bdm': 'Sandra',
            'qtn_by': 'Vishnu', 'staff': 'Sandra', 'date': '12 Aug 2026',
            'status': 'Pending Approval', 'total': '150000', 'discount': '15000',
            'net_amount': '135000', 'currency': 'INR (Rs)',
            'source': 'Google Search',
            'proposal_scope': 'Full e-commerce store with online payments and delivery tracking.',
            'terms_conditions': '50% advance, 25% milestone, 25% on go-live.',
        },
    },
    {
        'id': 'RAW-030006',
        'lead': {
            'company': "ST PETER'S COLLEGE", 'contact': 'Prof. K. S. Menon',
            'phone': '9856503115', 'email': 'office@stpeterscollege.ac.in',
            'category': 'School', 'source': 'Official Website', 'city': 'Kochi',
            'date': date(2026, 8, 11), 'display_date': '11 Aug 2026',
            'added_by': 'Rinshad', 'assigned_to': 'Ajoy', 'priority': 'High',
            'remarks': 'Campus site with admission portal.',
        },
        'qtn': {
            'id': 'QTN-030006', 'customer': 'Prof. K. S. Menon', 'bdm': 'Ajoy',
            'qtn_by': 'Rinshad', 'staff': 'Ajoy', 'date': '11 Aug 2026',
            'status': 'Rejected', 'total': '95000', 'discount': '5000',
            'net_amount': '90000', 'currency': 'INR (Rs)',
            'source': 'Official Website',
            'proposal_scope': 'College website with admission portal, faculty directory and events.',
            'terms_conditions': '40% advance, 60% on completion.',
        },
    },
    {
        'id': 'RAW-030007',
        'lead': {
            'company': 'LAKEVIEW RESIDENCY', 'contact': 'Vimal Raj',
            'phone': '9846603116', 'email': 'stays@lakeviewresidency.com',
            'category': 'Hotel & Resorts', 'source': 'Customer Referral',
            'city': 'Alleppey', 'date': date(2026, 8, 10), 'display_date': '10 Aug 2026',
            'added_by': 'Shanu', 'assigned_to': 'Shahal', 'priority': 'Medium',
            'remarks': 'Room booking website.',
        },
        'qtn': {
            'id': 'QTN-030007', 'customer': 'Vimal Raj', 'bdm': 'Shahal',
            'qtn_by': 'Shanu', 'staff': 'Shahal', 'date': '10 Aug 2026',
            'status': 'Not Sent', 'total': '75000', 'discount': '7500',
            'net_amount': '67500', 'currency': 'INR (Rs)',
            'source': 'Customer Referral',
            'proposal_scope': 'Resort website with room booking, gallery and tariff page.',
            'terms_conditions': '50% advance, balance at launch.',
        },
    },
    {
        'id': 'RAW-030008',
        'lead': {
            'company': 'MERIDIAN MEDICAL CENTRE', 'contact': 'Dr. Ashraf Ali',
            'phone': '9786703117', 'email': 'info@meridianmedcentre.in',
            'category': 'Hospital', 'source': 'Google Search', 'city': 'Kochi',
            'date': date(2026, 8, 9), 'display_date': '09 Aug 2026',
            'added_by': 'Malavika', 'assigned_to': 'Azeem', 'priority': 'High',
            'remarks': 'Appointment + doctor listing.',
        },
        'qtn': {
            'id': 'QTN-030008', 'customer': 'Dr. Ashraf Ali', 'bdm': 'Azeem',
            'qtn_by': 'Malavika', 'staff': 'Azeem', 'date': '09 Aug 2026',
            'status': 'Approved', 'total': '110000', 'discount': '10000',
            'net_amount': '100000', 'currency': 'INR (Rs)',
            'source': 'Google Search',
            'proposal_scope': 'Medical centre website with doctor listing and appointment booking.',
            'terms_conditions': '45% advance, balance on go-live.',
        },
    },
]

LEAD_IDS = [row['id'] for row in QUOTATION_LEADS]
QTN_IDS = [row['qtn']['id'] for row in QUOTATION_LEADS]


def seed(apps, schema_editor):
    Lead = apps.get_model('transactions', 'Lead')
    Quotation = apps.get_model('transactions', 'Quotation')
    for row in QUOTATION_LEADS:
        Lead.objects.get_or_create(id=row['id'], defaults={**row['lead'], 'status': 'quotation'})
        Quotation.objects.get_or_create(
            id=row['qtn']['id'],
            defaults={**row['qtn'], 'lead_id': row['id'], 'company': row['lead']['company']},
        )


def unseed(apps, schema_editor):
    Lead = apps.get_model('transactions', 'Lead')
    Quotation = apps.get_model('transactions', 'Quotation')
    Quotation.objects.filter(id__in=QTN_IDS).delete()
    Lead.objects.filter(id__in=LEAD_IDS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0010_seed_more_telecall'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]