from django.db import migrations

SEED_SOURCES = [
    ('GO01', 'Google Search & SEO'),
    ('WB02', 'Official Website'),
    ('RF03', 'Customer Referral'),
    ('FB04', 'Facebook Ads'),
    ('IG05', 'Instagram Campaign'),
    ('EX06', 'Existing Customer'),
    ('DB07', 'Internal Database'),
    ('AD08', 'Print & Billboard Advertisement'),
    ('EH09', 'Business Exhibition & Expo'),
    ('MN10', 'Manual Walk-in Entry'),
    ('LI11', 'LinkedIn B2B Outreach'),
    ('WA12', 'WhatsApp Business API'),
    ('EM13', 'Email Marketing Campaign'),
    ('TS14', 'Trade Show Conference'),
    ('PT15', 'Channel Partner Network'),
]


def seed_sources(apps, schema_editor):
    Source = apps.get_model('master', 'Source')
    for code, name in SEED_SOURCES:
        Source.objects.get_or_create(
            code=code,
            defaults={'name': name},
        )


def unseed_sources(apps, schema_editor):
    Source = apps.get_model('master', 'Source')
    Source.objects.filter(
        code__in=[code for code, _ in SEED_SOURCES],
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('master', '0005_seed_categories'),
    ]

    operations = [
        migrations.RunPython(seed_sources, unseed_sources),
    ]
