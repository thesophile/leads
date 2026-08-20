from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from transactions.models import RawLead, TelecallLead

User = get_user_model()


def make_company(name):
    from accounts.models import Company
    return Company.objects.get_or_create(name=name)[0]


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
        for i in range(5):
            RawLead.objects.create(
                id=f'RL-{i}', company=f'Company {i}', category='Hospital',
                contact='Contact', phone='123', city='Kochi', tenant=company,
            )
        RawLead.objects.create(
            id='RL-9', company='Retail One', category='Fancy Shops',
            contact='Contact', phone='123', city='Kochi', tenant=company,
        )

    def test_staff_cannot_assign(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.post('/api/transactions/raw-leads/assign/', {
            'assigned_to': 'Shanu VR', 'count': 2,
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_manager_assigns_leads_and_creates_telecall_records(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/raw-leads/assign/', {
            'assigned_to': 'Shanu VR', 'count': 3,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['assigned'], 3)
        self.assertEqual(resp.data['assigned_to'], 'Shanu VR')
        self.assertEqual(
            TelecallLead.objects.filter(assigned_to='Shanu VR', call_status='Pending Call').count(), 3
        )
        # Raw leads are marked as assigned
        self.assertEqual(RawLead.objects.filter(assigned_to='Shanu VR').count(), 3)

    def test_assign_respects_category_filter(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/raw-leads/assign/', {
            'assigned_to': 'Shanu VR', 'category': 'Fancy Shops', 'count': 10,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['assigned'], 1)

    def test_assign_caps_at_count(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/raw-leads/assign/', {
            'assigned_to': 'Shanu VR', 'category': 'Hospital', 'count': 2,
        }, format='json')
        self.assertEqual(resp.data['assigned'], 2)


class TelecallVisibilityTests(APITestCase):
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
        self.manager.tc_lead = TelecallLead.objects.create(
            id='TC-1', company='Acme Lead', assigned_to='Shanu VR', tenant=company,
        )
        TelecallLead.objects.create(
            id='TC-2', company='Globex Lead', assigned_to='Shanu VR', tenant=other,
        )

    def test_manager_sees_all_leads(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.get('/api/transactions/tele-calls/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual({l['id'] for l in resp.data}, {'TC-1'})
        self.assertIn('assignedTo', resp.data[0])

    def test_staff_only_sees_own_assigned_leads(self):
        self.client.force_authenticate(self.shanu)
        resp = self.client.get('/api/transactions/tele-calls/')
        self.assertEqual({l['id'] for l in resp.data}, {'TC-1'})

    def test_other_staff_sees_nothing(self):
        self.client.force_authenticate(self.priya)
        resp = self.client.get('/api/transactions/tele-calls/')
        self.assertEqual(resp.data, [])

    def test_staff_can_update_own_lead(self):
        self.client.force_authenticate(self.shanu)
        resp = self.client.patch('/api/transactions/tele-calls/TC-1/', {
            'call_status': 'Interested', 'priority': 'Hot',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['callStatus'], 'Interested')

    def test_staff_cannot_update_others_lead(self):
        # Priya cannot see (and therefore cannot edit) a lead assigned to Shanu.
        self.client.force_authenticate(self.priya)
        resp = self.client.patch('/api/transactions/tele-calls/TC-1/', {
            'call_status': 'Interested',
        }, format='json')
        self.assertEqual(resp.status_code, 404)
