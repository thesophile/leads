from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0035_quotation_superseded_at'),
    ]

    operations = [
        migrations.AlterField(
            model_name='clientdetail',
            name='id',
            field=models.CharField(max_length=50, primary_key=True, serialize=False),
        ),
    ]