"""Add 8 more Tele Call (status='assigned') leads."""

from datetime import date

from django.db import migrations

MORE_ASSIGNED_LEADS = [
    {
        'id': 'RAW-020009', 'company': 'SANTA CRUZ FROZEN FOODS',
        'contact': 'Joseph Varghese', 'phone': '9894122001',
        'email': 'sales@santacruzfoods.in', 'category': 'Restaurant',
        'source': 'Google Search', 'city': 'Kochi',
        'date': date(2026, 8, 15), 'display_date': '15 Aug 2026',
        'added_by': 'Abhinav', 'assigned_to': 'Azeem',
        'call_status': 'Pending Call', 'priority': 'High',
        'remarks': 'Distribution portal with catalogue.',
    },
    {
        'id': 'RAW-020010', 'company': 'GOLD STAR PHARMACY',
        'contact': 'Beena Mathew', 'phone': '9845222002',
        'email': 'goldstar@gmail.com', 'category': 'Pharmacy',
        'source': 'Customer Referral', 'city': 'Thrissur',
        'date': date(2026, 8, 15), 'display_date': '15 Aug 2026',
        'added_by': 'Husna', 'assigned_to': 'Ajoy',
        'call_status': 'Follow Up', 'priority': 'Medium',
        'remarks': 'Needs booking + stock page.',
        'last_call_date': '15 Aug 2026', 'has_follow_up': True,
        'next_follow_up_date': '18 Aug 2026', 'next_follow_up_time': '03:00 PM',
    },
    {
        'id': 'RAW-020011', 'company': 'AROMA BAKERY & CAFE',
        'contact': 'Fawaz Ali', 'phone': '9876322003',
        'email': 'aroma.cafe@yahoo.com', 'category': 'Restaurant',
        'source': 'Instagram Campaign', 'city': 'Calicut',
        'date': date(2026, 8, 14), 'display_date': '14 Aug 2026',
        'added_by': 'Sandra', 'assigned_to': 'Shahal',
        'call_status': 'Interested', 'priority': 'High',
        'remarks': 'Online ordering with payment.',
        'last_call_date': '14 Aug 2026', 'has_follow_up': True,
        'next_follow_up_date': '17 Aug 2026', 'next_follow_up_time': '11:30 AM',
    },
    {
        'id': 'RAW-020012', 'company': 'HEIGHT FASHION HOUSE',
        'contact': 'Sneha Kurian', 'phone': '9846422004',
        'email': 'contact@heightfashion.in', 'category': 'Fancy Shops',
        'source': 'Facebook Ads', 'city': 'Kochi',
        'date': date(2026, 8, 13), 'display_date': '13 Aug 2026',
        'added_by': 'Fairooz', 'assigned_to': 'Amitha',
        'call_status': 'Pending Call', 'priority': 'Medium',
    },
    {
        'id': 'RAW-020013', 'company': 'SUNRISE DIAGNOSTIC CENTRE',
        'contact': 'Dr. Saira Banu', 'phone': '9986522005',
        'email': 'info@sunrisediag.in', 'category': 'Hospital',
        'source': 'Official Website', 'city': 'Kottayam',
        'date': date(2026, 8, 12), 'display_date': '12 Aug 2026',
        'added_by': 'Vishnu', 'assigned_to': 'Darsana',
        'call_status': 'Interested', 'priority': 'High',
        'remarks': 'Report delivery portal.',
        'last_call_date': '12 Aug 2026', 'has_follow_up': True,
        'next_follow_up_date': '16 Aug 2026', 'next_follow_up_time': '10:30 AM',
    },
    {
        'id': 'RAW-020014', 'company': 'MEGA MART RETAIL STORE',
        'contact': 'Anvar Sadik', 'phone': '9856622006',
        'email': 'megamart.retail@gmail.com', 'category': 'Fancy Shops',
        'source': 'Manual Entry', 'city': 'Alappuzha',
        'date': date(2026, 8, 11), 'display_date': '11 Aug 2026',
        'added_by': 'Rinshad', 'assigned_to': 'Malavika',
        'call_status': 'Not Interested', 'priority': 'Low',
        'remarks': 'Already has a website.',
        'last_call_date': '11 Aug 2026',
    },
    {
        'id': 'RAW-020015', 'company': 'VIBGYOR PRE SCHOOL',
        'contact': 'Mrs. Anitha Raj', 'phone': '9846722007',
        'email': 'admin@vibgyorpreschool.com', 'category': 'School',
        'source': 'Customer Referral', 'city': 'Kochi',
        'date': date(2026, 8, 10), 'display_date': '10 Aug 2026',
        'added_by': 'Shanu', 'assigned_to': 'Sandra',
        'call_status': 'Pending Call', 'priority': 'Medium',
    },
    {
        'id': 'RAW-020016', 'company': 'ORBIT TRAVEL DESK',
        'contact': 'Harikrishnan N', 'phone': '9786822008',
        'email': 'hello@orbittravel.in', 'category': 'Travel Agency',
        'source': 'Google Search', 'city': 'Trivandrum',
        'date': date(2026, 8, 10), 'display_date': '10 Aug 2026',
        'added_by': 'Malavika', 'assigned_to': 'Husna',
        'call_status': 'Follow Up', 'priority': 'Low',
        'remarks': 'Compare packages first.',
        'last_call_date': '10 Aug 2026', 'has_follow_up': True,
        'next_follow_up_date': '19 Aug 2026', 'next_follow_up_time': '02:00 PM',
    },
]

SEED_IDS = [row['id'] for row in MORE_ASSIGNED_LEADS]


def seed(apps, schema_editor):
    Lead = apps.get_model('transactions', 'Lead')
    for row in MORE_ASSIGNED_LEADS:
        Lead.objects.get_or_create(id=row['id'], defaults={**row, 'status': 'assigned'})


def unseed(apps, schema_editor):
    Lead = apps.get_model('transactions', 'Lead')
    Lead.objects.filter(id__in=SEED_IDS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0009_seed_telecall_leads'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]