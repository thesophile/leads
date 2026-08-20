from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from transactions.models import Lead

User = get_user_model()


def make_company(name):
    from accounts.models import Company
    return Company.objects.get_or_create(name=name)[0]


def make_raw_lead(company, name, **kwargs):
    defaults = dict(
        category='Hospital', contact='Contact', phone='123', city='Kochi',
        tenant=company,
    )
    defaults.update(kwargs)
    return Lead.objects.create(id=f'RL-{name}', company=name, **defaults)


class AssignLeadsToStaffTests(APITestCase):
    def setUp(self):
        company = make_company('Acme')
        self.manager = User.objects.create_user(
            email='mgr@acme.com', password='x', name='Manager A',
            role=company.roles.get(code='manager'), company=company,
        )
        self.staff = User.objects.create_user(
            email='staff@acme.com', password='x', name='Staff A',
            role=company.roles.get(code='staff'), company=company,
        )
        self.target = User.objects.create_user(
            email='shanu@acme.com', password='x', name='Shanu VR',
            role=company.roles.get(code='staff'), company=company,
        )
        # The seed migration injects demo rows; drop them so counts are exact.
        Lead.objects.filter(tenant__isnull=True).delete()
        for i in range(5):
            make_raw_lead(company, f'Company {i}')
        Lead.objects.create(
            id='RL-9', company='Retail One', category='Fancy Shops',
            contact='Contact', phone='123', city='Kochi', tenant=company,
        )

    def test_staff_cannot_assign(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.post('/api/transactions/leads/assign/', {
            'assigned_to': 'Shanu VR', 'count': 2,
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_manager_assign_flips_status_without_duplicating(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/leads/assign/', {
            'assigned_to': 'Shanu VR', 'count': 3,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['assigned'], 3)
        self.assertEqual(resp.data['assigned_to'], 'Shanu VR')
        # No new records are created: 6 total leads, 3 flip to assigned.
        self.assertEqual(Lead.objects.count(), 6)
        self.assertEqual(Lead.objects.filter(status='assigned').count(), 3)
        self.assertEqual(Lead.objects.filter(status='raw').count(), 3)
        self.assertEqual(
            Lead.objects.filter(assigned_to='Shanu VR', status='assigned', call_status='Pending Call').count(),
            3,
        )

    def test_assign_respects_category_filter(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/leads/assign/', {
            'assigned_to': 'Shanu VR', 'category': 'Fancy Shops', 'count': 10,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['assigned'], 1)
        self.assertEqual(Lead.objects.filter(status='assigned').count(), 1)

    def test_assign_caps_at_count(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/leads/assign/', {
            'assigned_to': 'Shanu VR', 'category': 'Hospital', 'count': 2,
        }, format='json')
        self.assertEqual(resp.data['assigned'], 2)
        self.assertEqual(Lead.objects.filter(status='assigned').count(), 2)

    def test_assigned_leads_leave_the_raw_pool(self):
        self.client.force_authenticate(self.manager)
        self.client.post('/api/transactions/leads/assign/', {
            'assigned_to': 'Shanu VR', 'category': 'Fancy Shops', 'count': 10,
        }, format='json')
        resp = self.client.get('/api/transactions/leads/?status=raw')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 5)


class LeadVisibilityTests(APITestCase):
    def setUp(self):
        company = make_company('Acme')
        other = make_company('Globex')
        self.manager = User.objects.create_user(
            email='mgr@acme.com', password='x', name='Manager A',
            role=company.roles.get(code='manager'), company=company,
        )
        self.shanu = User.objects.create_user(
            email='shanu@acme.com', password='x', name='Shanu VR',
            role=company.roles.get(code='staff'), company=company,
        )
        self.priya = User.objects.create_user(
            email='priya@acme.com', password='x', name='Priya Sharma',
            role=company.roles.get(code='staff'), company=company,
        )
        Lead.objects.filter(tenant__isnull=True).delete()
        self.manager.tc_lead = Lead.objects.create(
            id='TC-1', company='Acme Lead', assigned_to='Shanu VR',
            tenant=company, status='assigned',
        )
        Lead.objects.create(
            id='TC-2', company='Globex Lead', assigned_to='Shanu VR',
            tenant=other, status='assigned',
        )
        Lead.objects.create(
            id='RL-1', company='Brand New Co', added_by='Shanu VR', tenant=company,
        )

    def test_manager_sees_all_assigned_leads(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.get('/api/transactions/leads/?status=assigned')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual({l['id'] for l in resp.data}, {'TC-1'})
        self.assertIn('assignedTo', resp.data[0])
        self.assertIn('callStatus', resp.data[0])

    def test_staff_only_sees_own_assigned_leads(self):
        self.client.force_authenticate(self.shanu)
        resp = self.client.get('/api/transactions/leads/?status=assigned')
        self.assertEqual({l['id'] for l in resp.data}, {'TC-1'})

    def test_staff_sees_own_raw_leads(self):
        self.client.force_authenticate(self.shanu)
        resp = self.client.get('/api/transactions/leads/?status=raw')
        self.assertEqual({l['id'] for l in resp.data}, {'RL-1'})

    def test_other_staff_sees_nothing(self):
        self.client.force_authenticate(self.priya)
        resp = self.client.get('/api/transactions/leads/?status=assigned')
        self.assertEqual(resp.data, [])

    def test_staff_can_update_own_lead(self):
        self.client.force_authenticate(self.shanu)
        resp = self.client.patch('/api/transactions/leads/TC-1/', {
            'call_status': 'Interested', 'priority': 'Hot',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['callStatus'], 'Interested')

    def test_staff_cannot_update_others_lead(self):
        # Priya cannot see (and therefore cannot edit) a lead assigned to Shanu.
        self.client.force_authenticate(self.priya)
        resp = self.client.patch('/api/transactions/leads/TC-1/', {
            'call_status': 'Interested',
        }, format='json')
        self.assertEqual(resp.status_code, 404)


class AssignableStaffListViewTests(APITestCase):
    def setUp(self):
        company = make_company('Acme')
        self.manager = User.objects.create_user(
            email='mgr@acme.com', password='x', name='Manager A',
            role=company.roles.get(code='manager'), company=company,
        )
        User.objects.create_user(
            email='shanu@acme.com', password='x', name='Shanu VR',
            role=company.roles.get(code='staff'), company=company,
        )
        User.objects.create_user(
            email='priya@acme.com', password='x', name='Priya Sharma',
            role=company.roles.get(code='staff'), company=company,
        )

    def test_manager_lists_real_company_staff(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.get('/api/auth/assignable-staff/')
        self.assertEqual(resp.status_code, 200)
        names = {s['name'] for s in resp.data}
        self.assertEqual(names, {'Manager A', 'Shanu VR', 'Priya Sharma'})

    def test_staff_cannot_list_assignable_staff(self):
        self.client.force_authenticate(User.objects.get(email='shanu@acme.com'))
        resp = self.client.get('/api/auth/assignable-staff/')
        self.assertEqual(resp.status_code, 403)