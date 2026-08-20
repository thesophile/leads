from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase
from rest_framework.test import APITestCase

from transactions.admin import RawLeadAdmin
from transactions.models import RawLead

from .admin import UserAdmin
from .models import Company
from .serializers import AdminRegisterSerializer

User = get_user_model()


def make_company(name):
    return Company.objects.get_or_create(name=name)[0]


def admin_role(company):
    return company.roles.get(code='admin')


class RegistrationTests(TestCase):
    def test_registered_admin_is_not_superuser(self):
        serializer = AdminRegisterSerializer(data={
            'company': 'Acme Corp',
            'name': 'Jane Doe',
            'email': 'jane@acme.com',
            'phone': '123',
            'password': 'Str0ngPass!',
            'password2': 'Str0ngPass!',
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()
        self.assertEqual(user.role.code, 'admin')
        self.assertTrue(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.company.name, 'Acme Corp')

    def test_same_company_name_reuses_one_company(self):
        data = {
            'name': 'Jane Doe', 'phone': '123',
            'password': 'Str0ngPass!', 'password2': 'Str0ngPass!',
        }
        s1 = AdminRegisterSerializer(data={**data, 'email': 'jane@acme.com', 'company': 'Acme'})
        s2 = AdminRegisterSerializer(data={**data, 'email': 'john@acme.com', 'company': 'Acme'})
        self.assertTrue(s1.is_valid(), s1.errors)
        self.assertTrue(s2.is_valid(), s2.errors)
        s1.save()
        s2.save()
        self.assertEqual(Company.objects.filter(name='Acme').count(), 1)


class StaffListScopingTests(APITestCase):
    def setUp(self):
        acme, globex = make_company('Acme'), make_company('Globex')
        self.admin_a = User.objects.create_user(
            email='admin_a@acme.com', password='x', name='Admin A',
            role=admin_role(acme), company=acme,
        )
        User.objects.create_user(email='staff_a@acme.com', password='x', name='Staff A', company=acme)
        User.objects.create_user(email='staff_b@globex.com', password='x', name='Staff B', company=globex)

    def test_staff_list_only_contains_own_company(self):
        self.client.force_authenticate(self.admin_a)
        resp = self.client.get('/api/auth/users/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual({u['email'] for u in resp.data}, {'admin_a@acme.com', 'staff_a@acme.com'})


class AdminQuerysetScopingTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        acme, globex = make_company('Acme'), make_company('Globex')
        self.admin_a = User.objects.create_user(
            email='admin_a@acme.com', password='x', name='Admin A',
            role=admin_role(acme), is_staff=True, company=acme,
        )
        User.objects.create_user(
            email='admin_b@globex.com', password='x', name='Admin B',
            role=admin_role(globex), is_staff=True, company=globex,
        )
        User.objects.create_user(email='staff_a@acme.com', password='x', name='Staff A', company=acme)

    def _request_for(self, user):
        request = self.factory.get('/admin/accounts/user/')
        request.user = user
        return request

    def test_user_admin_queryset_scoped_by_company(self):
        qs = UserAdmin(User, admin.site).get_queryset(self._request_for(self.admin_a))
        self.assertEqual(set(qs.values_list('email', flat=True)), {'admin_a@acme.com', 'staff_a@acme.com'})

    def test_superuser_still_sees_everything(self):
        superuser = User.objects.create_superuser(email='root@platform.com', password='x', name='Root')
        qs = UserAdmin(User, admin.site).get_queryset(self._request_for(superuser))
        emails = set(qs.values_list('email', flat=True))
        self.assertIn('admin_a@acme.com', emails)
        self.assertIn('admin_b@globex.com', emails)

    def test_lead_admin_scoped_by_tenant(self):
        RawLead.objects.create(id='RL-1', company='Hospital One', tenant=self.admin_a.company)
        RawLead.objects.create(id='RL-2', company='Hospital Two')
        qs = RawLeadAdmin(RawLead, admin.site).get_queryset(self._request_for(self.admin_a))
        self.assertEqual(set(qs.values_list('id', flat=True)), {'RL-1'})


class SuperuserAdminManagementTests(APITestCase):
    def setUp(self):
        acme, globex = make_company('Acme'), make_company('Globex')
        self.superuser = User.objects.create_superuser(
            email='root@platform.com', password='x', name='Root',
        )
        self.admin_a = User.objects.create_user(
            email='admin_a@acme.com', password='x', name='Admin A',
            role=admin_role(acme), company=acme,
        )
        self.admin_b = User.objects.create_user(
            email='admin_b@globex.com', password='x', name='Admin B',
            role=admin_role(globex), company=globex,
        )
        User.objects.create_user(email='staff_a@acme.com', password='x', name='Staff A', company=acme)

    def test_superuser_lists_all_admins_across_companies(self):
        self.client.force_authenticate(self.superuser)
        resp = self.client.get('/api/auth/admins/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            {u['email'] for u in resp.data},
            {'admin_a@acme.com', 'admin_b@globex.com', 'root@platform.com'},
        )

    def test_plain_admin_is_forbidden(self):
        self.client.force_authenticate(self.admin_a)
        resp = self.client.get('/api/auth/admins/')
        self.assertEqual(resp.status_code, 403)

    def test_create_admin_reuses_existing_company(self):
        self.client.force_authenticate(self.superuser)
        resp = self.client.post('/api/auth/admins/', {
            'company': 'Globex',
            'name': 'New Admin',
            'email': 'new_admin@globex.com',
            'phone': '999',
            'password': 'Str0ngPass!',
            'password2': 'Str0ngPass!',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(Company.objects.filter(name='Globex').count(), 1)
        user = User.objects.get(email='new_admin@globex.com')
        self.assertEqual(user.role.code, 'admin')
        self.assertTrue(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_delete_admin_removes_login(self):
        self.client.force_authenticate(self.superuser)
        resp = self.client.delete(f'/api/auth/admins/{self.admin_a.pk}/')
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(User.objects.filter(pk=self.admin_a.pk).exists())

    def test_delete_self_is_blocked(self):
        self.client.force_authenticate(self.superuser)
        resp = self.client.delete(f'/api/auth/admins/{self.superuser.pk}/')
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(User.objects.filter(pk=self.superuser.pk).exists())

    def test_delete_other_superuser_is_blocked(self):
        other = User.objects.create_superuser(
            email='root2@platform.com', password='x', name='Root Two',
        )
        self.client.force_authenticate(self.superuser)
        resp = self.client.delete(f'/api/auth/admins/{other.pk}/')
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(User.objects.filter(pk=other.pk).exists())

    def test_reset_password_works_cross_company(self):
        self.client.force_authenticate(self.superuser)
        resp = self.client.post(
            f'/api/auth/admins/{self.admin_b.pk}/reset-password/',
            {'new_password': 'NewPass123!'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.admin_b.refresh_from_db()
        self.assertTrue(self.admin_b.check_password('NewPass123!'))
