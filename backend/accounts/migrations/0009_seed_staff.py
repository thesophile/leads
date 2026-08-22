"""Seed demo employee accounts (users + staff profiles) for Neopotter.

Managers: Abhinav, Azeem, Ajoy, Shanu, Shahal, Malavika, Amitha, Sandra,
Husna, Darsana.
Admin: Sajiv.
Plus extra staff: Vishnu, Rinshad, Nabeel, Fathima, Sreelakshmi, Fairooz.
"""

from django.contrib.auth.hashers import make_password
from django.db import migrations

STAFF = [
    {'name': 'Abhinav', 'email': 'neopotter3d@gmail.com', 'phone': '9847012345', 'role': 'manager'},
    {'name': 'Azeem', 'email': 'azeem@neopotter.com', 'phone': '9847023456', 'role': 'manager'},
    {'name': 'Ajoy', 'email': 'ajoy@neopotter.com', 'phone': '9847034567', 'role': 'manager'},
    {'name': 'Shanu', 'email': 'shanu@neopotter.com', 'phone': '9847045678', 'role': 'manager'},
    {'name': 'Shahal', 'email': 'shahal@neopotter.com', 'phone': '9847056789', 'role': 'manager'},
    {'name': 'Malavika', 'email': 'malavika@neopotter.com', 'phone': '9847067890', 'role': 'manager'},
    {'name': 'Amitha', 'email': 'amitha@neopotter.com', 'phone': '9847078901', 'role': 'manager'},
    {'name': 'Sandra', 'email': 'sandra@neopotter.com', 'phone': '9847089012', 'role': 'manager'},
    {'name': 'Husna', 'email': 'husna@neopotter.com', 'phone': '9847090123', 'role': 'manager'},
    {'name': 'Darsana', 'email': 'darsana@neopotter.com', 'phone': '9847101234', 'role': 'manager'},
    {'name': 'Sajiv', 'email': 'sajiv@neopotter.com', 'phone': '9847112345', 'role': 'admin'},
    {'name': 'Vishnu', 'email': 'vishnu@neopotter.com', 'phone': '9847123456', 'role': 'staff'},
    {'name': 'Rinshad', 'email': 'rinshad@neopotter.com', 'phone': '9847134567', 'role': 'staff'},
    {'name': 'Nabeel', 'email': 'nabeel@neopotter.com', 'phone': '9847145678', 'role': 'staff'},
    {'name': 'Fathima', 'email': 'fathima@neopotter.com', 'phone': '9847156789', 'role': 'staff'},
    {'name': 'Sreelakshmi', 'email': 'sreelakshmi@neopotter.com', 'phone': '9847167890', 'role': 'staff'},
    {'name': 'Fairooz', 'email': 'fairooz@neopotter.com', 'phone': '9847178901', 'role': 'staff'},
]

SEED_PASSWORD = 'Neopotter@123'


def seed_staff(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    Company = apps.get_model('accounts', 'Company')
    Role = apps.get_model('accounts', 'Role')
    Staff = apps.get_model('master', 'Staff')

    company = Company.objects.filter(name='Neopotter').first() or Company.objects.order_by('id').first()
    if company is None:
        return

    roles = {r.code: r for r in Role.objects.filter(company=company)}
    last = Staff.objects.order_by('-id').first()
    next_num = (last.id if last else 0) + 1

    for person in STAFF:
        user, created = User.objects.get_or_create(
            email=person['email'],
            defaults={'name': person['name'], 'company': company, 'is_staff': True},
        )
        user.name = person['name']
        user.company = company
        user.role = roles.get(person['role'])
        user.phone = person['phone']
        user.is_staff = True
        user.is_active = True
        user.password = make_password(SEED_PASSWORD)
        user.save()

        profile = getattr(user, 'staff_profile', None)
        if profile is None:
            Staff.objects.create(
                code=f'ST{next_num:03d}',
                name=user.name,
                role=person['role'].title(),
                mobile=user.phone,
                email=user.email,
                user=user,
            )
            next_num += 1
        else:
            profile.name = user.name
            profile.role = person['role'].title()
            profile.mobile = user.phone
            profile.email = user.email
            profile.save()


def unseed_staff(apps, schema_editor):
    Staff = apps.get_model('master', 'Staff')
    User = apps.get_model('accounts', 'User')
    emails = [person['email'] for person in STAFF]
    Staff.objects.filter(email__in=emails).delete()
    User.objects.filter(email__in=emails).exclude(email='neopotter3d@gmail.com').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_staff_view_raw_all'),
        ('master', '0002_staff_user'),
    ]

    operations = [
        migrations.RunPython(seed_staff, unseed_staff),
    ]