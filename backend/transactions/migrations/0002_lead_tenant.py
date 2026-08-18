import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0001_initial'),
        ('accounts', '0005_company_ref_to_company'),
    ]

    operations = [
        migrations.AddField(
            model_name='rawlead',
            name='tenant',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='+', to='accounts.company'),
        ),
        migrations.AddField(
            model_name='telecalllead',
            name='tenant',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='+', to='accounts.company'),
        ),
        migrations.AddField(
            model_name='quotation',
            name='tenant',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='+', to='accounts.company'),
        ),
        migrations.AddField(
            model_name='order',
            name='tenant',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='+', to='accounts.company'),
        ),
        migrations.AddField(
            model_name='clientdetail',
            name='tenant',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='+', to='accounts.company'),
        ),
    ]
