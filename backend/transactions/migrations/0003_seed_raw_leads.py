from datetime import date

from django.db import migrations

DEMO_RAW_LEADS = [
    {
        'id': 'RAW-005627',
        'company': 'NEW LIFE MATERNITY HOSPITAL',
        'contact': 'Dr. Sarah Ahmed',
        'phone': '8714546783',
        'email': 'info@newlifehospital.com',
        'category': 'Hospital',
        'source': 'Google Search',
        'city': 'Calicut',
        'date': date(2026, 8, 12),
        'display_date': '12 Aug 2026',
        'added_by': 'Priya Sharma',
    },
    {
        'id': 'RAW-005628',
        'company': 'SHADES.IN LUXURY EYEWEAR',
        'contact': 'Rahul Menon',
        'phone': '9845123991',
        'email': 'contact@shades.in',
        'category': 'Cosmetics Store',
        'source': 'Instagram Campaign',
        'city': 'Kochi',
        'date': date(2026, 8, 12),
        'display_date': '12 Aug 2026',
        'added_by': 'Alex Joseph',
    },
    {
        'id': 'RAW-005629',
        'company': 'MANZOOR SUPER SPECIALITY HOSPITAL',
        'contact': 'Dr. Manzoor Ali',
        'phone': '9447118234',
        'email': 'admin@manzoorhospital.org',
        'category': 'Hospital',
        'source': 'Customer Referral',
        'city': 'Trivandrum',
        'date': date(2026, 8, 11),
        'display_date': '11 Aug 2026',
        'added_by': 'Priya Sharma',
    },
    {
        'id': 'RAW-005630',
        'company': 'URBAN LIVING INTERIORS',
        'contact': 'Deepak Varma',
        'phone': '9744882190',
        'email': 'projects@urbanliving.in',
        'category': 'Interior Designers',
        'source': 'Official Website',
        'city': 'Calicut',
        'date': date(2026, 8, 11),
        'display_date': '11 Aug 2026',
        'added_by': 'Shanu VR',
    },
    {
        'id': 'RAW-005631',
        'company': 'ROYAL PALACE CONVENTION CENTRE',
        'contact': 'Kabeer Khan',
        'phone': '9567112004',
        'email': 'events@royalpalace.com',
        'category': 'Convention Center',
        'source': 'Facebook Ads',
        'city': 'Thrissur',
        'date': date(2026, 8, 10),
        'display_date': '10 Aug 2026',
        'added_by': 'Ananya Nair',
    },
    {
        'id': 'RAW-005632',
        'company': 'GLOW & SHINE BEAUTY SALON',
        'contact': 'Farzana K',
        'phone': '9123456780',
        'email': 'glowandshine@gmail.com',
        'category': 'Salon & Spa',
        'source': 'Instagram Campaign',
        'city': 'Kochi',
        'date': date(2026, 8, 8),
        'display_date': '08 Aug 2026',
        'added_by': 'Priya Sharma',
    },
    {
        'id': 'RAW-005633',
        'company': 'APEX AUTO SPA & DETAILING',
        'contact': 'Vipin Das',
        'phone': '9895001122',
        'email': 'apexautospa@yahoo.com',
        'category': 'Auto Wash',
        'source': 'Manual Entry',
        'city': 'Kannur',
        'date': date(2026, 8, 5),
        'display_date': '05 Aug 2026',
        'added_by': 'Alex Joseph',
    },
    {
        'id': 'RAW-005634',
        'company': 'ZENITH DENTAL SPECIALITY CLINIC',
        'contact': 'Dr. Faizal Rahman',
        'phone': '9745110099',
        'email': 'contact@zenithdental.com',
        'category': 'Hospital',
        'source': 'Google Search',
        'city': 'Calicut',
        'date': date(2026, 8, 1),
        'display_date': '01 Aug 2026',
        'added_by': 'Shanu VR',
    },
]


def seed(apps, schema_editor):
    RawLead = apps.get_model('transactions', 'RawLead')
    for row in DEMO_RAW_LEADS:
        RawLead.objects.get_or_create(id=row['id'], defaults=row)


def unseed(apps, schema_editor):
    RawLead = apps.get_model('transactions', 'RawLead')
    RawLead.objects.filter(id__in=[row['id'] for row in DEMO_RAW_LEADS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0002_lead_tenant'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]