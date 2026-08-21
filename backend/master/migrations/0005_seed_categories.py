from django.db import migrations

SEED_CATEGORIES = [
    ('CO092', 'COSMETICS STORE'),
    ('AU091', 'AUTO WASH'),
    ('DE091', 'DECOR STORES'),
    ('IN091', 'INTERIOR DESIGNERS'),
    ('FA090', 'FANCY SHOPS'),
    ('PE088', 'PERFUME SHOPE'),
    ('SH087', 'SHOPPING MALL'),
    ('GL090', 'GLASS SHOP'),
    ('PL090', 'PLYWOOD&HARDWARE'),
    ('EN085', 'ENTERTAINMENT PARK'),
    ('HO083', 'Hospital'),
    ('CA082', 'CAFES&REASTURANT'),
    ('RE081', 'REASTURANT'),
    ('CO080', 'CONVENTION CENTER'),
    ('TH079', 'THEATER'),
    ('ED078', 'EDUCATION & SCHOOL'),
    ('CL077', 'CLINIC & HEALTHCARE'),
    ('SA076', 'SALON & SPA'),
]


def seed_categories(apps, schema_editor):
    Category = apps.get_model('master', 'Category')
    for code, name in SEED_CATEGORIES:
        Category.objects.get_or_create(
            code=code,
            defaults={'name': name},
        )


def unseed_categories(apps, schema_editor):
    Category = apps.get_model('master', 'Category')
    Category.objects.filter(
        code__in=[code for code, _ in SEED_CATEGORIES],
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('master', '0004_branch_address'),
    ]

    operations = [
        migrations.RunPython(seed_categories, unseed_categories),
    ]