import json

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from transactions.models import Lead
from utilities.models import ActivityLog, log_activity

User = get_user_model()


def make_company(name):
    from accounts.models import Company
    return Company.objects.get_or_create(name=name)[0]


class BackupApiTests(APITestCase):
    def setUp(self):
        self.company = make_company('Acme Backup')
        self.admin = User.objects.create_user(
            email='backup-admin@acme.com', password='x', name='Backup Admin',
            role=self.company.roles.get(code='admin'), company=self.company,
        )
        self.staff = User.objects.create_user(
            email='backup-staff@acme.com', password='x', name='Backup Staff',
            role=self.company.roles.get(code='staff'), company=self.company,
        )
        # Seed migrations inject demo rows; drop them so counts are exact.
        Lead.objects.filter(tenant__isnull=True).delete()
        Lead.objects.create(
            id='RL-BAK', company='Backup Co', category='Hospital',
            contact='Contact', phone='123', city='Kochi', tenant=self.company,
        )

    def _export(self, as_user):
        self.client.force_authenticate(as_user)
        return self.client.get('/api/backup/export/')

    def _restore(self, content, as_user=None):
        self.client.force_authenticate(as_user or self.admin)
        upload = SimpleUploadedFile('backup.json', content.encode('utf-8'))
        return self.client.post('/api/backup/restore/', {'file': upload}, format='multipart')

    def test_export_returns_full_dump(self):
        resp = self._export(self.admin)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(any(
            obj.get('model') == 'transactions.lead' and obj.get('pk') == 'RL-BAK'
            for obj in data
        ))

    def test_export_denied_for_staff(self):
        self.assertEqual(self._export(self.staff).status_code, 403)

    def test_restore_round_trip_replaces_data(self):
        resp = self._export(self.admin)
        self.assertEqual(resp.status_code, 200)
        content = json.dumps(resp.json())

        Lead.objects.filter(pk='RL-BAK').delete()
        self.assertFalse(Lead.objects.filter(pk='RL-BAK').exists())

        restore = self._restore(content)
        self.assertEqual(restore.status_code, 200)
        self.assertTrue(Lead.objects.filter(pk='RL-BAK').exists())

    def test_restore_rejects_invalid_json_keeps_data(self):
        resp = self._restore('this is not json')
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(Lead.objects.filter(pk='RL-BAK').exists())

    def test_restore_rejects_non_dumpdata_shape(self):
        resp = self._restore('[{"not": "a dumpdata object"}]')
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(Lead.objects.filter(pk='RL-BAK').exists())

    def test_restore_rejects_empty_file_before_flushing(self):
        resp = self._restore('[]')
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(Lead.objects.filter(pk='RL-BAK').exists())

    def test_restore_denied_for_staff(self):
        resp = self._restore('[]', as_user=self.staff)
        self.assertEqual(resp.status_code, 403)


class ActivityLogTests(APITestCase):
    def setUp(self):
        self.company = make_company('Acme Activity')
        self.admin = User.objects.create_user(
            email='act-admin@acme.com', password='x', name='Act Admin',
            role=self.company.roles.get(code='admin'), company=self.company,
        )
        self.staff = User.objects.create_user(
            email='act-staff@acme.com', password='x', name='Act Staff',
            role=self.company.roles.get(code='staff'), company=self.company,
        )

    def test_activity_list_scoped_and_ordered(self):
        log_activity(self.admin, self.company, 'first', 'actor did first')
        log_activity(self.admin, self.company, 'second', 'actor did second')
        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/activity/')
        self.assertEqual(resp.status_code, 200)
        rows = resp.json()
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]['action'], 'second')
        self.assertEqual(rows[0]['actor'], 'Act Admin')

    def test_activity_list_denied_for_staff(self):
        log_activity(self.admin, self.company, 'first', 'actor did first')
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get('/api/activity/').status_code, 403)

    def test_activity_list_honours_limit(self):
        for i in range(5):
            log_activity(self.admin, self.company, f'a{i}', f'summary {i}')
        self.client.force_authenticate(self.admin)
        rows = self.client.get('/api/activity/', {'limit': 2}).json()
        self.assertEqual(len(rows), 2)

    def test_superuser_sees_all_tenants(self):
        other_company = make_company('Other Co')
        other_admin = User.objects.create_user(
            email='other@x.com', password='x', name='Other Admin',
            role=other_company.roles.get(code='admin'), company=other_company,
        )
        log_activity(other_admin, other_company, 'other', 'from other company')
        log_activity(self.admin, self.company, 'mine', 'from mine')
        superuser = User.objects.create_superuser(email='su@x.com', password='x', name='SU')
        self.client.force_authenticate(superuser)
        rows = self.client.get('/api/activity/').json()
        self.assertEqual(len(rows), 2)

    def test_lead_create_logs_activity(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/transactions/leads/', {
            'company': 'Activity Co',
            'phone': '9876543210',
            'city': 'Kochi',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        entries = ActivityLog.objects.filter(tenant=self.company, action='added lead')
        self.assertEqual(entries.count(), 1)
        self.assertIn('Activity Co', entries.first().summary)

    def test_backup_export_logs_activity(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/backup/export/')
        self.assertEqual(resp.status_code, 200)
        entry = ActivityLog.objects.filter(
            tenant=self.company, action='downloaded backup'
        ).first()
        self.assertIsNotNone(entry)