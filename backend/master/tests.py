from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from accounts.models import Company

from .models import Branch, Category, Location, Source

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
        Category.objects.create(name='Blood Bank', code='BB01', company=self.admin.company)
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/master/categories/', {
            'name': 'blood bank',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_same_category_in_other_company_is_allowed(self):
        Category.objects.create(name='Blood Bank', code='BB01', company=self.other_admin.company)
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/master/categories/', {
            'name': 'Blood Bank',
        }, format='json')
        self.assertEqual(resp.status_code, 201)

    def test_duplicate_source_is_rejected(self):
        Source.objects.create(name='Google Search', code='G01', company=self.admin.company)
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


class LocationMasterTests(APITestCase):
    def setUp(self):
        self.admin = make_admin('Admin A', 'Acme')
        self.other_admin = make_admin('Admin B', 'Globex')

    def test_create_location_and_list(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/master/locations/', {
            'name': 'Kochi',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data['code'])
        listed = self.client.get('/api/master/locations/')
        self.assertEqual(listed.status_code, 200)
        self.assertEqual([l['name'] for l in listed.data], ['Kochi'])

    def test_duplicate_location_is_rejected_in_same_company(self):
        Location.objects.create(name='Kochi', code='K01', company=self.admin.company)
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/master/locations/', {
            'name': 'kochi',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_same_location_in_other_company_is_allowed(self):
        Location.objects.create(name='Kochi', code='K01', company=self.admin.company)
        self.client.force_authenticate(self.other_admin)
        resp = self.client.post('/api/master/locations/', {
            'name': 'Kochi',
        }, format='json')
        self.assertEqual(resp.status_code, 201)

    def test_delete_location(self):
        loc = Location.objects.create(name='Trivandrum', code='T01', company=self.admin.company)
        self.client.force_authenticate(self.admin)
        resp = self.client.delete(f'/api/master/locations/{loc.pk}/')
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(Location.objects.filter(pk=loc.pk).exists())


class MasterRenamePropagationTests(APITestCase):
    """Renaming a master rewrites the stored name on every linked record.

    Records that carry the renamed master's code, plus legacy rows still
    matching the old name with an empty code, follow the rename. Free-text
    values with no master row are left untouched.
    """

    def setUp(self):
        self.admin = make_admin('Admin R', 'Acme')
        self.company = self.admin.company

    def _make_links(self, loc, cat, src):
        from transactions.models import ClientDetail, Lead, Order, Quotation

        lead = Lead.objects.create(
            id='RL-R1', company='Linked Co', tenant=self.company,
            category=cat.name, category_code=cat.code,
            city=loc.name, location_code=loc.code,
            source=src.name, source_code=src.code,
        )
        lead_legacy = Lead.objects.create(
            id='RL-R2', company='Legacy Co', tenant=self.company,
            category=cat.name, city=loc.name, source=src.name,
            location_code='', category_code='', source_code='',
        )
        free_text = Lead.objects.create(
            id='RL-R3', company='Free Co', tenant=self.company,
            category=cat.name, category_code=cat.code,
            city='Some other area', location_code='',
        )
        quotation = Quotation.objects.create(
            id='RL-R1-V1', lead_id=lead.id, tenant=self.company,
            company='Linked Co', category=cat.name, category_code=cat.code,
            city=loc.name, location_code=loc.code,
            source=src.name, source_code=src.code,
        )
        order = Order.objects.create(
            id='RL-R1', lead_id=lead.id, tenant=self.company,
            company='Linked Co', category=cat.name, category_code=cat.code,
            city=loc.name, location_code=loc.code,
        )
        client = ClientDetail.objects.create(
            id='CD-RL-R1', lead_id=lead.id, tenant=self.company,
            company='Linked Co', category=cat.name, category_code=cat.code,
        )
        return lead, lead_legacy, free_text, quotation, order, client

    def test_renaming_location_updates_linked_and_legacy_rows(self):
        loc = Location.objects.create(name='Thrissur', code='L01', company=self.company)
        cat = Category.objects.create(name='Dental Clinic', code='C01', company=self.company)
        src = Source.objects.create(name='Referral', code='S01', company=self.company)
        lead, lead_legacy, free_text, quotation, order, _ = self._make_links(loc, cat, src)

        self.client.force_authenticate(self.admin)
        resp = self.client.patch(f'/api/master/locations/{loc.pk}/', {
            'name': 'Thrissur district',
        }, format='json')
        self.assertEqual(resp.status_code, 200)

        lead.refresh_from_db()
        lead_legacy.refresh_from_db()
        free_text.refresh_from_db()
        quotation.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(lead.city, 'Thrissur district')
        self.assertEqual(lead_legacy.city, 'Thrissur district')
        self.assertEqual(free_text.city, 'Some other area')
        self.assertEqual(quotation.city, 'Thrissur district')
        self.assertEqual(order.city, 'Thrissur district')

    def test_renaming_category_updates_linked_and_legacy_rows(self):
        loc = Location.objects.create(name='Kochi', code='L01', company=self.company)
        cat = Category.objects.create(name='Dental Clinic', code='C01', company=self.company)
        src = Source.objects.create(name='Referral', code='S01', company=self.company)
        lead, lead_legacy, _, quotation, order, client = self._make_links(loc, cat, src)

        self.client.force_authenticate(self.admin)
        resp = self.client.patch(f'/api/master/categories/{cat.pk}/', {
            'name': 'Dental & Ortho',
        }, format='json')
        self.assertEqual(resp.status_code, 200)

        lead.refresh_from_db()
        lead_legacy.refresh_from_db()
        quotation.refresh_from_db()
        order.refresh_from_db()
        client.refresh_from_db()
        self.assertEqual(lead.category, 'Dental & Ortho')
        self.assertEqual(lead_legacy.category, 'Dental & Ortho')
        self.assertEqual(quotation.category, 'Dental & Ortho')
        self.assertEqual(order.category, 'Dental & Ortho')
        self.assertEqual(client.category, 'Dental & Ortho')

    def test_renaming_source_updates_linked_and_legacy_rows(self):
        loc = Location.objects.create(name='Kochi', code='L01', company=self.company)
        cat = Category.objects.create(name='Dental Clinic', code='C01', company=self.company)
        src = Source.objects.create(name='Referral', code='S01', company=self.company)
        lead, lead_legacy, _, quotation, _, _ = self._make_links(loc, cat, src)

        self.client.force_authenticate(self.admin)
        resp = self.client.patch(f'/api/master/sources/{src.pk}/', {
            'name': 'Referral Program',
        }, format='json')
        self.assertEqual(resp.status_code, 200)

        lead.refresh_from_db()
        lead_legacy.refresh_from_db()
        quotation.refresh_from_db()
        self.assertEqual(lead.source, 'Referral Program')
        self.assertEqual(lead_legacy.source, 'Referral Program')
        self.assertEqual(quotation.source, 'Referral Program')