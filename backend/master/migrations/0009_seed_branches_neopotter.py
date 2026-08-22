from django.db import migrations

SEED_BRANCHES = [
    ('KO10', 'Kochi Head Office', 'MG Road, Kochi, Kerala'),
    ('MU11', 'Mumbai Downtown Office', 'Nariman Point, Mumbai, Maharashtra'),
    ('DE12', 'Delhi North Branch', 'Karol Bagh, New Delhi'),
    ('BE13', 'Bengaluru Tech Park Office', 'Whitefield, Bengaluru, Karnataka'),
    ('CH14', 'Chennai Harbour Office', 'Anna Salai, Chennai, Tamil Nadu'),
    ('HY15', 'Hyderabad Bazaar Branch', 'Banjara Hills, Hyderabad, Telangana'),
    ('KL16', 'Kolkata Riverside Office', 'Park Street, Kolkata, West Bengal'),
    ('PU17', 'Pune Baner Branch', 'Baner Road, Pune, Maharashtra'),
    ('AH18', 'Ahmedabad City Branch', 'CG Road, Ahmedabad, Gujarat'),
    ('GO19', 'Goa Beachside Office', 'Calangute, Goa'),
]

SEED_CODES = [code for code, _, _ in SEED_BRANCHES]


def assign_seed_branches(apps, schema_editor):
    Branch = apps.get_model('master', 'Branch')
    Company = apps.get_model('accounts', 'Company')
    company = Company.objects.filter(name='Neopotter').first() or Company.objects.first()
    if company is None:
        return
    Branch.objects.filter(code__in=SEED_CODES).delete()
    for code, name, address in SEED_BRANCHES:
        Branch.objects.get_or_create(
            code=code,
            defaults={'company': company, 'name': name, 'address': address},
        )


def remove_seed_branches(apps, schema_editor):
    Branch = apps.get_model('master', 'Branch')
    Branch.objects.filter(code__in=SEED_CODES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('master', '0008_seed_branches'),
    ]

    operations = [
        migrations.RunPython(assign_seed_branches, remove_seed_branches),
    ]