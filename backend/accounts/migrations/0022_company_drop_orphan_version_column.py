from django.db import migrations


def drop_orphan_version_column(apps, schema_editor):
    """Drop the leftover ``version`` column on accounts_company, if present.

    The column is not declared in the Company model, so Django never supplies
    it on INSERT and MySQL strict mode rejects new company rows with error
    1364. It only survives in databases restored from old backups.
    """
    with schema_editor.connection.cursor() as cursor:
        schema = schema_editor.connection.settings_dict['NAME']
        cursor.execute(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'accounts_company' "
            "AND COLUMN_NAME = 'version'",
            [schema],
        )
        if cursor.fetchone()[0]:
            cursor.execute('ALTER TABLE accounts_company DROP COLUMN version')


def restore_orphan_version_column(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        schema = schema_editor.connection.settings_dict['NAME']
        cursor.execute(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'accounts_company' "
            "AND COLUMN_NAME = 'version'",
            [schema],
        )
        if not cursor.fetchone()[0]:
            cursor.execute(
                "ALTER TABLE accounts_company "
                "ADD COLUMN version varchar(20) NOT NULL DEFAULT ''"
            )


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0021_company_terms_defaults'),
    ]

    operations = [
        migrations.RunPython(drop_orphan_version_column, restore_orphan_version_column),
    ]