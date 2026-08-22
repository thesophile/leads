"""Replace current Tele Call (status='assigned') entries with 8 fresh ones.

- Deletes every existing assigned lead (and its call history via cascade).
- Creates 8 new assigned leads assigned to seeded staff.
"""

from datetime import date

from django.db import migrations

SEED_ASSIGNED_LEADS = [
    {
        'id': 'RAW-020001',
        'company': 'ORCHID BOUTIQUE HOTEL',
        'contact': 'Rahul Nair',
        'phone': '9894001112',
        'email': 'reservations@orchidboutique.in',
        'category': 'Hotel & Resorts',
        'source': 'Google Search',
        'city': 'Kochi',
        'date': date(2026, 8, 15),
        'display_date': '15 Aug 2026',
        'added_by': 'Abhinav',
        'assigned_to': 'Shanu',
        'call_status': 'Pending Call',
        'priority': 'High',
        'remarks': 'Asked for website with online booking.',
        'last_call_date': '',
        'has_follow_up': False,
    },
    {
        'id': 'RAW-020002',
        'company': 'HORIZON EYE CARE CENTRE',
        'contact': 'Dr. Meera Nair',
        'phone': '9845111222',
        'email': 'care@horizoneye.in',
        'category': 'Hospital',
        'source': 'Customer Referral',
        'city': 'Calicut',
        'date': date(2026, 8, 15),
        'display_date': '15 Aug 2026',
        'added_by': 'Husna',
        'assigned_to': 'Abhinav',
        'call_status': 'Interested',
        'priority': 'High',
        'remarks': 'Wants appointment booking module.',
        'last_call_date': '15 Aug 2026',
        'has_follow_up': True,
        'next_follow_up_date': '18 Aug 2026',
        'next_follow_up_time': '11:00 AM',
    },
    {
        'id': 'RAW-020003',
        'company': 'FROSTON GELATO & CREAMERY',
        'contact': 'Kevin Joseph',
        'phone': '9876222333',
        'email': 'hello@frostongelato.com',
        'category': 'Restaurant',
        'source': 'Instagram Campaign',
        'city': 'Thrissur',
        'date': date(2026, 8, 14),
        'display_date': '14 Aug 2026',
        'added_by': 'Sandra',
        'assigned_to': 'Husna',
        'call_status': 'Follow Up',
        'priority': 'Medium',
        'remarks': 'Compare pricing before deciding.',
        'last_call_date': '14 Aug 2026',
        'has_follow_up': True,
        'next_follow_up_date': '17 Aug 2026',
        'next_follow_up_time': '04:00 PM',
    },
    {
        'id': 'RAW-020004',
        'company': 'ELITE SPORTS WORLD',
        'contact': 'Sarath Menon',
        'phone': '9846333444',
        'email': 'sales@elitesportsworld.in',
        'category': 'Fancy Shops',
        'source': 'Facebook Ads',
        'city': 'Kochi',
        'date': date(2026, 8, 14),
        'display_date': '14 Aug 2026',
        'added_by': 'Fairooz',
        'assigned_to': 'Malavika',
        'call_status': 'Pending Call',
        'priority': 'Medium',
        'remarks': '',
        'last_call_date': '',
        'has_follow_up': False,
    },
    {
        'id': 'RAW-020005',
        'company': 'LITTLE STARS KINDERGARTEN',
        'contact': 'Mrs. Sheela Thomas',
        'phone': '9986444555',
        'email': 'admin@littlestarskg.com',
        'category': 'School',
        'source': 'Official Website',
        'city': 'Kannur',
        'date': date(2026, 8, 13),
        'display_date': '13 Aug 2026',
        'added_by': 'Vishnu',
        'assigned_to': 'Sandra',
        'call_status': 'Interested',
        'priority': 'High',
        'remarks': 'Needs fee payment and attendance system.',
        'last_call_date': '13 Aug 2026',
        'has_follow_up': True,
        'next_follow_up_date': '16 Aug 2026',
        'next_follow_up_time': '10:00 AM',
    },
    {
        'id': 'RAW-020006',
        'company': 'PRESTIGE CAR INTERIORS',
        'contact': 'Salim Pasha',
        'phone': '9856555666',
        'email': 'prestigecar@gmail.com',
        'category': 'Auto Wash',
        'source': 'Manual Entry',
        'city': 'Trivandrum',
        'date': date(2026, 8, 12),
        'display_date': '12 Aug 2026',
        'added_by': 'Rinshad',
        'assigned_to': 'Fairooz',
        'call_status': 'Not Interested',
        'priority': 'Low',
        'remarks': 'No budget this quarter.',
        'last_call_date': '12 Aug 2026',
        'has_follow_up': False,
    },
    {
        'id': 'RAW-020007',
        'company': 'NOVA CHEMICALS LTD',
        'contact': 'Ramesh Pillai',
        'phone': '9846666777',
        'email': 'info@novachemicals.co.in',
        'category': 'Others',
        'source': 'Customer Referral',
        'city': 'Kochi',
        'date': date(2026, 8, 12),
        'display_date': '12 Aug 2026',
        'added_by': 'Shanu',
        'assigned_to': 'Vishnu',
        'call_status': 'Pending Call',
        'priority': 'Medium',
        'remarks': 'Corporate site with catalogue.',
        'last_call_date': '',
        'has_follow_up': False,
    },
    {
        'id': 'RAW-020008',
        'company': 'AURA UNISEX SALON',
        'contact': 'Deepa Menon',
        'phone': '9786777888',
        'email': 'aura.salon@gmail.com',
        'category': 'Salon & Spa',
        'source': 'Instagram Campaign',
        'city': 'Calicut',
        'date': date(2026, 8, 11),
        'display_date': '11 Aug 2026',
        'added_by': 'Malavika',
        'assigned_to': 'Rinshad',
        'call_status': 'Follow Up',
        'priority': 'Low',
        'remarks': 'Interested after festival offers.',
        'last_call_date': '11 Aug 2026',
        'has_follow_up': True,
        'next_follow_up_date': '20 Aug 2026',
        'next_follow_up_time': '12:30 PM',
    },
]

SEED_IDS = [row['id'] for row in SEED_ASSIGNED_LEADS]


def seed_telecall(apps, schema_editor):
    Lead = apps.get_model('transactions', 'Lead')
    Lead.objects.filter(status='assigned').delete()
    for row in SEED_ASSIGNED_LEADS:
        Lead.objects.get_or_create(id=row['id'], defaults={**row, 'status': 'assigned'})


def unseed(apps, schema_editor):
    Lead = apps.get_model('transactions', 'Lead')
    Lead.objects.filter(id__in=SEED_IDS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0008_seed_raw_leads_30'),
    ]

    operations = [
        migrations.RunPython(seed_telecall, unseed),
    ]