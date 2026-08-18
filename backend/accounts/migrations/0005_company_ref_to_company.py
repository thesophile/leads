from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_backfill_companies'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='user',
            name='company',
        ),
        migrations.RenameField(
            model_name='user',
            old_name='company_ref',
            new_name='company',
        ),
    ]
