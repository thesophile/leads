# Generated for SystemSoft Core identity integration.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0027_company_seal'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='core_org_id',
            field=models.IntegerField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='core_user_id',
            field=models.IntegerField(blank=True, db_index=True, null=True, unique=True),
        ),
    ]
