from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from accounts.models import Company

from .models import Branch, Category, Source

User = get_user_model()


def make_admin(name, company_name):
    company, _ = Company.objects.get_or_create(name=company_name)
    user = User.objects.create_user(
        email=f'{name.replace(" ", "").lower()}@acme.com',
        password='x',
        name=name,
        role=company.roles.get(code='admin'),
        company=company,
    )
    return user


class MasterNameUniquenessTests(APITestCase):
    def setUp(self):
        self.admin = make_admin('Admin A', 'Acme')
        self.other_admin = make_admin('Admin B', 'Globex')

    def test_duplicate_category_is_rejected_case_insensitive(self):
        Category.objects.create(name='Hospital', code='H01')
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/master/categories/', {
            'name': 'hospital',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_duplicate_source_is_rejected(self):
        Source.objects.create(name='Google Search', code='G01')
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/master/sources/', {
            'name': 'Google Search',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_duplicate_branch_in_same_company_is_rejected(self):
        Branch.objects.create(name='Main Office', code='MO01', company=self.admin.company)
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/master/branches/', {
            'name': 'main office', 'address': 'xyz',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_same_branch_name_in_other_company_is_allowed(self):
        Branch.objects.create(name='Main Office', code='MO01', company=self.admin.company)
        self.client.force_authenticate(self.other_admin)
        resp = self.client.post('/api/master/branches/', {
            'name': 'Main Office', 'address': 'abc',
        }, format='json')
        self.assertEqual(resp.status_code, 201)

    def test_renaming_branch_to_duplicate_is_rejected(self):
        Branch.objects.create(name='Main Office', code='MO01', company=self.admin.company)
        target = Branch.objects.create(name='Second', code='MO02', company=self.admin.company)
        self.client.force_authenticate(self.admin)
        resp = self.client.patch(f'/api/master/branches/{target.pk}/', {
            'name': 'Main Office',
        }, format='json')
        self.assertEqual(resp.status_code, 400)