import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('master', '0002_staff_user'),
        ('accounts', '0005_company_ref_to_company'),
    ]

    operations = [
        migrations.AddField(
            model_name='branch',
            name='company',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='branches',
                to='accounts.company',
            ),
        ),
    ]
