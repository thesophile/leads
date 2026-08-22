from django.db import migrations, models


def truncate_long_branch_names(apps, schema_editor):
    Branch = apps.get_model('master', 'Branch')
    for branch in Branch.objects.all():
        if len(branch.name) > 50:
            branch.name = branch.name[:50]
            branch.save(update_fields=['name'])


class Migration(migrations.Migration):

    dependencies = [
        ('master', '0006_seed_sources'),
    ]

    operations = [
        migrations.RunPython(truncate_long_branch_names, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='branch',
            name='name',
            field=models.CharField(max_length=50),
        ),
    ]