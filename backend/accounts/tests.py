from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from transactions.admin import LeadAdmin
from transactions.models import Lead

from .admin import UserAdmin
from .models import Company, Role
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
            'company_email': 'accounts@acme.com',
            'company_phone': '+91 9447000000',
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
        self.assertEqual(user.company.email, 'accounts@acme.com')
        self.assertEqual(user.company.phone, '+91 9447000000')

    def test_same_company_name_registration_is_rejected(self):
        # Public self-registration must NOT let a stranger join an existing
        # company as its admin; only the first registrant can claim the name.
        data = {
            'name': 'Jane Doe', 'phone': '123',
            'company_email': 'accounts@acme.com',
            'company_phone': '+91 9447000000',
            'password': 'Str0ngPass!', 'password2': 'Str0ngPass!',
            'company': 'Acme',
        }
        s1 = AdminRegisterSerializer(data={**data, 'email': 'jane@acme.com'})
        self.assertTrue(s1.is_valid(), s1.errors)
        s1.save()
        s2 = AdminRegisterSerializer(data={**data, 'email': 'john@acme.com'})
        self.assertFalse(s2.is_valid())
        self.assertIn('company', s2.errors)
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
        Lead.objects.create(id='RL-1', company='Hospital One', tenant=self.admin_a.company)
        Lead.objects.create(id='RL-2', company='Hospital Two')
        qs = LeadAdmin(Lead, admin.site).get_queryset(self._request_for(self.admin_a))
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
            'company_email': 'accounts@globex.com',
            'company_phone': '+91 9447000001',
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


class StaffRenamePropagationTests(APITestCase):
    def setUp(self):
        from transactions.models import CallHistory, Lead

        company = make_company('Acme')
        self.manager = User.objects.create_user(
            email='mgr@acme.com', password='x', name='Manager A',
            role=admin_role(company), company=company,
        )
        self.staff = User.objects.create_user(
            email='staff@acme.com', password='x', name='Shanu VR', company=company,
        )
        self.lead = Lead.objects.create(
            id='RL-1', company='Hospital One', assigned_to='Shanu VR',
            added_by='Shanu VR', tenant=company,
        )
        CallHistory.objects.create(
            lead=self.lead, caller='Shanu VR', report='First call', status='Interested',
        )

    def test_renaming_staff_keeps_assignments_and_history(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.patch(f'/api/auth/users/{self.staff.pk}/', {
            'name': 'Shanu Kumar',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.lead.refresh_from_db()
        from transactions.models import CallHistory

        self.assertEqual(self.lead.assigned_to, 'Shanu Kumar')
        self.assertEqual(self.lead.added_by, 'Shanu Kumar')
        self.assertEqual(CallHistory.objects.get(lead=self.lead).caller, 'Shanu Kumar')

    def test_creating_user_auto_creates_staff_profile(self):
        from master.models import Staff

        profile = Staff.objects.get(user=self.staff)
        self.assertTrue(profile.code.startswith('ST'))
        self.assertEqual(profile.name, self.staff.name)
        self.assertEqual(profile.email, self.staff.email)


class StaffRenameCrossTenantIsolationTests(APITestCase):
    def setUp(self):
        from transactions.models import Lead

        acme = make_company('Acme')
        globex = make_company('Globex')
        self.admin_a = User.objects.create_user(
            email='admin_a@acme.com', password='x', name='Admin A',
            role=admin_role(acme), company=acme,
        )
        # Both tenants have an employee named "Shanu VR" with their own leads.
        self.shanu_a = User.objects.create_user(
            email='shanu@acme.com', password='x', name='Shanu VR', company=acme,
        )
        self.shanu_b = User.objects.create_user(
            email='shanu@globex.com', password='x', name='Shanu VR', company=globex,
        )
        self.lead_a = Lead.objects.create(
            id='RL-1', company='Hospital One', assigned_to='Shanu VR',
            added_by='Shanu VR', tenant=acme,
        )
        self.lead_b = Lead.objects.create(
            id='RL-2', company='Clinic Two', assigned_to='Shanu VR',
            added_by='Shanu VR', tenant=globex,
        )

    def test_rename_in_one_company_does_not_touch_another(self):
        self.client.force_authenticate(self.admin_a)
        resp = self.client.patch(f'/api/auth/users/{self.shanu_a.pk}/', {
            'name': 'Shanu Kumar',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.lead_a.refresh_from_db()
        self.lead_b.refresh_from_db()
        self.assertEqual(self.lead_a.assigned_to, 'Shanu Kumar')
        # The other tenant's identical-name employee must be left untouched.
        self.assertEqual(self.lead_b.assigned_to, 'Shanu VR')


class StaffAdminProtectionTests(APITestCase):
    def setUp(self):
        company = make_company('Acme')
        self.admin = User.objects.create_user(
            email='admin@acme.com', password='x', name='Admin A',
            role=admin_role(company), company=company,
        )
        self.manager = User.objects.create_user(
            email='mgr@acme.com', password='x', name='Manager A',
            role=company.roles.get(code='manager'), company=company,
        )
        self.staff = User.objects.create_user(
            email='staff@acme.com', password='x', name='Staff A', company=company,
        )

    def test_manager_cannot_deactivate_the_admin(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.patch(f'/api/auth/users/{self.admin.pk}/', {
            'is_active': False,
        }, format='json')
        self.assertEqual(resp.status_code, 403)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_manager_cannot_rename_the_admin(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.patch(f'/api/auth/users/{self.admin.pk}/', {
            'name': 'Hijacked',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_manager_cannot_reset_the_admin_password(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post(
            f'/api/auth/users/{self.admin.pk}/reset-password/',
            {'new_password': 'Hacked123!'},
            format='json',
        )
        self.assertEqual(resp.status_code, 403)
        self.admin.refresh_from_db()
        self.assertFalse(self.admin.check_password('Hacked123!'))

    def test_manager_cannot_deactivate_staff_who_owns_leads(self):
        from transactions.models import Lead

        Lead.objects.create(
            id='TC-1', company='Hospital One', tenant=self.manager.company,
            assigned_to=self.staff.name, status='assigned',
        )
        self.client.force_authenticate(self.manager)
        resp = self.client.patch(f'/api/auth/users/{self.staff.pk}/', {
            'is_active': False,
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.staff.refresh_from_db()
        self.assertTrue(self.staff.is_active)

    def test_manager_can_reassign_then_deactivate(self):
        from transactions.models import Lead

        Lead.objects.create(
            id='TC-1', company='Hospital One', tenant=self.manager.company,
            assigned_to=self.staff.name, status='assigned',
        )
        # Reassign the lead away, then deactivation is allowed.
        Lead.objects.filter(tenant=self.manager.company, assigned_to=self.staff.name).update(
            assigned_to='Manager A'
        )
        self.client.force_authenticate(self.manager)
        resp = self.client.patch(f'/api/auth/users/{self.staff.pk}/', {
            'is_active': False,
        }, format='json')
        self.assertEqual(resp.status_code, 200)

    def test_superuser_reset_blocked_for_platform_admin(self):
        superuser = User.objects.create_superuser(
            email='root@platform.com', password='x', name='Root',
        )
        self.client.force_authenticate(superuser)
        resp = self.client.post(
            f'/api/auth/admins/{superuser.pk}/reset-password/',
            {'new_password': 'Hacked123!'},
            format='json',
        )
        self.assertEqual(resp.status_code, 400)


class AdminRenamePropagationTests(APITestCase):
    def setUp(self):
        from transactions.models import Lead

        company = make_company('Acme')
        self.superuser = User.objects.create_superuser(
            email='root@platform.com', password='x', name='Root',
        )
        self.admin = User.objects.create_user(
            email='admin@acme.com', password='x', name='Husna',
            role=admin_role(company), company=company,
        )
        self.lead = Lead.objects.create(
            id='RL-1', company='Hospital One', assigned_to='Husna',
            added_by='Husna', tenant=company,
        )

    def test_superuser_admin_rename_propagates_to_leads(self):
        self.client.force_authenticate(self.superuser)
        resp = self.client.patch(f'/api/auth/admins/{self.admin.pk}/', {
            'name': 'Husna K',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.lead.refresh_from_db()
        self.assertEqual(self.lead.assigned_to, 'Husna K')
        self.assertEqual(self.lead.added_by, 'Husna K')


class TokenRefreshSafetyTests(APITestCase):
    """Refreshing with a token whose user no longer exists must be a 401,
    not a 500 (e.g. after a backup restore replaced the database)."""

    def setUp(self):
        self.company = make_company('Refresh Co')
        self.user = User.objects.create_user(
            email='refresh@acme.com', password='x', name='Refresh User',
            role=admin_role(self.company), company=self.company,
        )
        self.refresh_token = str(RefreshToken.for_user(self.user))

    def test_refresh_returns_200_when_user_exists(self):
        resp = self.client.post('/api/auth/token/refresh/', {
            'refresh': self.refresh_token,
        }, format='json')
        self.assertEqual(resp.status_code, 200)

    def test_refresh_returns_401_when_user_is_deleted(self):
        self.user.delete()
        resp = self.client.post('/api/auth/token/refresh/', {
            'refresh': self.refresh_token,
        }, format='json')
        self.assertEqual(resp.status_code, 401)


class RoleDuplicateNameTests(APITestCase):
    def setUp(self):
        self.company = make_company('Role Co')
        self.admin = User.objects.create_user(
            email='admin@roleco.com', password='x', name='Role Admin',
            role=admin_role(self.company), company=self.company,
        )
        self.other = Role.objects.create(
            company=self.company, code='sales', name='Sales',
            permissions=['leads.view'],
        )

    def test_create_with_duplicate_name_is_rejected(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/auth/roles/', {
            'name': 'sales', 'code': 'sales2', 'permissions': [],
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('already exists', str(resp.data['detail']))

    def test_create_with_same_name_different_case_is_rejected(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/auth/roles/', {
            'name': 'SALES', 'code': 'sales2', 'permissions': [],
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_unique_name_create_succeeds(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/auth/roles/', {
            'name': 'Telecall Team', 'code': 'telecall', 'permissions': [],
        }, format='json')
        self.assertEqual(resp.status_code, 201)

    def test_rename_to_duplicate_name_is_rejected(self):
        self.client.force_authenticate(self.admin)
        role = Role.objects.create(
            company=self.company, code='telecall', name='Telecall',
            permissions=['telecall.view'],
        )
        resp = self.client.patch(f'/api/auth/roles/{role.pk}/', {
            'name': 'Sales',
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('already exists', str(resp.data['detail']))

    def test_renaming_to_self_name_is_allowed(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.patch(f'/api/auth/roles/{self.other.pk}/', {
            'name': 'SALES',
        }, format='json')
        self.assertEqual(resp.status_code, 200)


class RoleEscalationGuardTests(APITestCase):
    """A role must never grant permissions the actor does not already hold.

    This closes the loophole where someone with staff.manage + roles.manage
    (or any limited role) could create a full-permission role and promote
    themselves or others."
    """

    def setUp(self):
        self.company = make_company('Escalation Co')
        self.limited_role = Role.objects.create(
            company=self.company,
            code='limited',
            name='Limited',
            permissions=['leads.view', 'staff.manage', 'roles.manage'],
        )
        self.limited = User.objects.create_user(
            email='limited@esco.com', password='x', name='Limited',
            role=self.limited_role, company=self.company,
        )
        # A target role more powerful than ``limited`` (created via ORM so the
        # API-side create guard is exercised separately).
        self.power_role = Role.objects.create(
            company=self.company,
            code='power',
            name='Power',
            permissions=['leads.view', 'roles.manage', 'order.delete'],
        )

    def test_cannot_create_role_with_permissions_you_do_not_hold(self):
        self.client.force_authenticate(self.limited)
        resp = self.client.post('/api/auth/roles/', {
            'name': 'Escalation', 'code': 'esc', 'permissions': ['roles.manage', 'order.delete'],
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('permissions you do not have', str(resp.data['detail']))

    def test_can_create_role_with_subset_of_own_permissions(self):
        self.client.force_authenticate(self.limited)
        resp = self.client.post('/api/auth/roles/', {
            'name': 'Viewer', 'code': 'viewer', 'permissions': ['leads.view'],
        }, format='json')
        self.assertEqual(resp.status_code, 201)

    def test_cannot_rename_grant_permissions_you_do_not_hold(self):
        self.client.force_authenticate(self.limited)
        viewer = Role.objects.create(
            company=self.company, code='viewer', name='Viewer', permissions=['leads.view'],
        )
        resp = self.client.patch(f'/api/auth/roles/{viewer.pk}/', {
            'permissions': ['leads.view', 'order.delete'],
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_cannot_assign_role_with_permissions_you_do_not_hold(self):
        self.client.force_authenticate(self.limited)
        resp = self.client.post('/api/auth/users/', {
            'name': 'New Guy', 'email': 'newguy@esco.com', 'password': 'Str0ngPass!',
            'role': self.power_role.pk,
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_cannot_reassign_self_to_more_powerful_role(self):
        self.client.force_authenticate(self.limited)
        resp = self.client.patch(f'/api/auth/users/{self.limited.pk}/', {
            'role': self.power_role.pk,
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.limited.refresh_from_db()
        self.assertEqual(self.limited.role_id, self.limited_role.pk)

    def test_can_assign_role_that_is_subset_of_own_permissions(self):
        self.client.force_authenticate(self.limited)
        resp = self.client.post('/api/auth/users/', {
            'name': 'New Guy', 'email': 'newguy@esco.com', 'password': 'Str0ngPass!',
            'role': Role.objects.create(
                company=self.company, code='viewer', name='Viewer', permissions=['leads.view'],
            ).pk,
        }, format='json')
        self.assertEqual(resp.status_code, 201)


class SystemRoleFullCatalogTests(APITestCase):
    """System (admin) roles always hold the full catalog, in the API and when
    evaluated, even if a stored permission was stripped or never backfilled."""

    def setUp(self):
        self.company = make_company('Full Catalog Co')
        self.admin = User.objects.create_user(
            email='admin@fullcat.com', password='x', name='Full Admin',
            role=admin_role(self.company), company=self.company,
        )

    def test_admin_implicitly_holds_permissions_missing_from_stored_list(self):
        key = 'quotation.send_without_approval'
        role = self.admin.role
        role.permissions = [p for p in role.permissions if p != key]
        role.save(update_fields=['permissions'])
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.has_permission(key))
        self.assertIn(key, self.admin.permissions)

    def test_admin_serializer_reports_full_catalog(self):
        self.client.force_authenticate(self.admin)
        role = self.admin.role
        role.permissions = []
        role.save(update_fields=['permissions'])
        self.admin.refresh_from_db()
        resp = self.client.get('/api/auth/me/')
        self.assertEqual(resp.status_code, 200)
        for p in ('leads.manage_lock', 'quotation.approve', 'quotation.send_without_approval', 'roles.manage'):
            self.assertIn(p, resp.data['permissions'])

    def test_non_system_roles_use_stored_list_only(self):
        staff = User.objects.create_user(
            email='staff@fullcat.com', password='x', name='Staff A', company=self.company,
        )
        self.assertFalse(staff.has_permission('quotation.send_without_approval'))
        self.assertFalse(staff.has_permission('quotation.approve'))
        self.assertFalse(staff.has_permission('roles.manage'))
