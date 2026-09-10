import json

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from transactions.models import Lead

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

    def test_restore_denied_for_staff(self):
        resp = self._restore('[]', as_user=self.staff)
        self.assertEqual(resp.status_code, 403)