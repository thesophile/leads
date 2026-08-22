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


def seed_branches(apps, schema_editor):
    Branch = apps.get_model('master', 'Branch')
    Branch.objects.all().delete()
    for code, name, address in SEED_BRANCHES:
        Branch.objects.create(
            code=code,
            name=name,
            address=address,
        )


def unseed_branches(apps, schema_editor):
    Branch = apps.get_model('master', 'Branch')
    Branch.objects.filter(
        code__in=[code for code, _, _ in SEED_BRANCHES],
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('master', '0007_branch_name_limit'),
    ]

    operations = [
        migrations.RunPython(seed_branches, unseed_branches),
    ]