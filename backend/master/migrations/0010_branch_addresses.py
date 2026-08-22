from django.db import migrations

LONGER_ADDRESSES = {
    'KO10': 'MG Road, Near Marine Drive, Ernakulam, Kochi, Kerala 682011',
    'MU11': 'Oberoi Tower, Nariman Point, Mumbai, Maharashtra 400021',
    'DE12': 'Ajmal Khan Road, Karol Bagh, New Delhi 110005',
    'BE13': 'Whitefield Main Road, EPIP Zone, Whitefield, Bengaluru, Karnataka 560066',
    'CH14': 'Anna Salai, Teynampet, Chennai, Tamil Nadu 600006',
    'HY15': 'Road No. 12, Banjara Hills, Hyderabad, Telangana 500034',
    'KL16': '41 Park Street, Kolkata, West Bengal 700016',
    'PU17': 'Baner Road, Baner, Pune, Maharashtra 411045',
    'AH18': 'CG Road, Navrangpura, Ahmedabad, Gujarat 380009',
    'GO19': 'Calangute Beach Road, North Goa, Goa 403516',
}


def extend_branch_addresses(apps, schema_editor):
    Branch = apps.get_model('master', 'Branch')
    for code, address in LONGER_ADDRESSES.items():
        Branch.objects.filter(code=code).update(address=address)


def revert_branch_addresses(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('master', '0009_seed_branches_neopotter'),
    ]

    operations = [
        migrations.RunPython(extend_branch_addresses, revert_branch_addresses),
    ]