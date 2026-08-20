import django.db.models.deletion
from django.db import migrations, models
import django.utils.timezone
import accounts.models


ROLE_TEMPLATES = [
    {
        'code': 'admin',
        'name': 'Admin',
        'is_system': True,
        'permissions': [
            'leads.view', 'leads.view_all', 'leads.create',
            'leads.edit_own', 'leads.edit_all', 'leads.delete', 'leads.delete_all', 'leads.assign',
            'telecall.view', 'telecall.create', 'telecall.edit', 'telecall.assign',
            'quotation.view', 'quotation.create', 'quotation.edit', 'quotation.send',
            'order.view', 'order.create', 'order.edit', 'order.delete',
            'client.view', 'client.create', 'client.edit',
            'branch.view', 'branch.manage', 'category.view', 'category.manage',
            'source.view', 'source.manage', 'company.view', 'company.edit',
            'staff.view', 'staff.manage', 'roles.manage',
            'reports.view', 'reports.export',
        ],
    },
    {
        'code': 'manager',
        'name': 'Manager',
        'is_system': False,
        'permissions': [
            'leads.view', 'leads.view_all', 'leads.create',
            'leads.edit_own', 'leads.edit_all', 'leads.delete', 'leads.assign',
            'telecall.view', 'telecall.create', 'telecall.edit', 'telecall.assign',
            'quotation.view', 'quotation.create', 'quotation.edit', 'quotation.send',
            'order.view', 'order.create', 'order.edit', 'order.delete',
            'client.view', 'client.create', 'client.edit',
            'branch.view', 'category.view', 'source.view', 'company.view',
            'staff.view', 'staff.manage',
            'reports.view', 'reports.export',
        ],
    },
    {
        'code': 'staff',
        'name': 'Staff',
        'is_system': False,
        'permissions': [
            'leads.view', 'leads.create', 'leads.edit_own', 'leads.delete',
            'telecall.view',
            'quotation.view',
            'client.view',
            'branch.view', 'category.view', 'source.view', 'company.view',
            'reports.view',
        ],
    },
]

LEGACY_ROLE_MAP = {
    'admin': 'admin',
    'manager': 'manager',
    'bd': 'staff',
    'telecaller': 'staff',
    'accounts': 'staff',
    'staff': 'staff',
}


def seed_roles_and_assign(apps, schema_editor):
    Role = apps.get_model('accounts', 'Role')
    User = apps.get_model('accounts', 'User')
    Company = apps.get_model('accounts', 'Company')

    for company in Company.objects.all():
        roles = {}
        for template in ROLE_TEMPLATES:
            role, _ = Role.objects.get_or_create(
                company=company,
                code=template['code'],
                defaults={
                    'name': template['name'],
                    'permissions': template['permissions'],
                    'is_system': template['is_system'],
                },
            )
            roles[template['code']] = role

        for user in User.objects.filter(company=company, role_new__isnull=True):
            legacy = getattr(user, 'role', '') or ''
            target_code = LEGACY_ROLE_MAP.get(legacy, 'staff')
            user.role_new = roles.get(target_code) or roles['staff']
            user.save(update_fields=['role_new'])


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_company_address_company_email_company_phone_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Role',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=50)),
                ('name', models.CharField(max_length=50)),
                ('permissions', models.JSONField(default=list)),
                ('is_system', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='roles', to='accounts.company')),
            ],
            options={
                'ordering': ['name'],
                'constraints': [
                    models.UniqueConstraint(fields=('company', 'code'), name='uniq_role_company_code'),
                ],
            },
        ),
        migrations.AddField(
            model_name='user',
            name='role_new',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='users', to='accounts.role'),
        ),
        migrations.RunPython(seed_roles_and_assign, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='user',
            name='role',
        ),
        migrations.RenameField(
            model_name='user',
            old_name='role_new',
            new_name='role',
        ),
    ]