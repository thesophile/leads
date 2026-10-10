from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APITestCase

from .core_client import CoreError
from .models import User
from .tests import CoreStubMixin, admin_role, make_company


class StaffCoreSyncTests(CoreStubMixin, APITestCase):
    """LEADS <-> SystemSoft bidirectional staff sync."""

    def setUp(self):
        super().setUp()
        self.company = make_company('Sync Co')
        self.admin = User.objects.create_user(
            email='syncadmin@syncco.com', password='x', name='Sync Admin',
            role=admin_role(self.company), company=self.company,
        )

    def _seed_core_leads_user(self, core_id, email, name='Core Emma', status='active',
                              access_status='enabled', permissions=('leads.view', 'leads.create')):
        self.core.users[email.lower()] = {'id': core_id, 'status': status, 'password': None}
        self.core.access.append({
            'id': 9000 + core_id, 'user': core_id, 'organization': self.company.core_org_id,
            'application': 1, 'application_code': 'leads',
            'role': 'Manager', 'permissions': list(permissions), 'status': access_status,
        })

    def test_list_sync_brings_core_users_with_leads_access_into_employee_list(self):
        self._seed_core_leads_user(core_id=777, email='emma@syncco.com')

        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/auth/users/')

        self.assertEqual(resp.status_code, 200)
        emails = {u['email'] for u in resp.data}
        self.assertIn('emma@syncco.com', emails)
        linked = User.objects.get(email='emma@syncco.com')
        self.assertEqual(linked.core_user_id, 777)
        self.assertEqual(linked.is_active, True)
        self.assertEqual(linked.role.name, 'Manager')

    def test_core_user_without_leads_access_is_not_imported(self):
        self._seed_core_leads_user(core_id=778, email='nina@syncco.com')
        self.core.access[-1]['application_code'] = 'time-tracker'

        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/auth/users/')

        emails = {u['email'] for u in resp.data}
        self.assertNotIn('nina@syncco.com', emails)
        self.assertFalse(User.objects.filter(email='nina@syncco.com').exists())

    def test_manager_adds_staff_inactive_without_password_until_core_admin_sets_one(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post('/api/auth/users/', {
            'name': 'New Staff', 'email': 'newstaff@syncco.com',
            'role': self.company.roles.get(code='staff').pk,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        staff = User.objects.get(email='newstaff@syncco.com')
        # Locked until a SystemSoft admin sets a password.
        self.assertFalse(staff.is_active)
        self.assertIsNotNone(staff.core_user_id)
        self.assertEqual(self.core.users['newstaff@syncco.com']['status'], 'inactive')
        # The LEADS access grant was created, carrying the role's permissions.
        grants = [a for a in self.core.access if a['user'] == staff.core_user_id]
        self.assertEqual(len(grants), 1)
        self.assertEqual(grants[0]['application_code'], 'leads')
        self.assertEqual(set(grants[0]['permissions']), {'leads.view', 'leads.create', 'leads.edit_own', 'telecall.view'})

    def test_staff_update_pushes_name_and_role_to_core_access(self):
        staff = User.objects.create_user(
            email='mut@syncco.com', password='x', name='Mutt', company=self.company,
            role=self.company.roles.get(code='staff'), core_user_id=666,
        )
        manager_role = self.company.roles.get(code='manager')
        self._seed_core_leads_user(core_id=666, email='mut@syncco.com', name='Mutt')

        self.client.force_authenticate(self.admin)
        resp = self.client.patch(f'/api/auth/users/{staff.pk}/', {
            'name': 'Mutt Updated',
            'role': manager_role.pk,
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        staff.refresh_from_db()
        self.assertEqual(staff.name, 'Mutt Updated')
        self.assertEqual(staff.role.code, 'manager')
        grants = [a for a in self.core.access if a['user'] == 666]
        self.assertEqual(grants[0]['role'], 'Manager')
        self.assertIn('leads.view_all', grants[0]['permissions'])

    def test_local_deactivation_only_flips_leads_flag_not_identity(self):
        staff = User.objects.create_user(
            email='lock@syncco.com', password='x', name='Lock', company=self.company,
            role=self.company.roles.get(code='staff'), core_user_id=555,
        )
        self._seed_core_leads_user(core_id=555, email='lock@syncco.com', name='Lock')

        self.client.force_authenticate(self.admin)
        resp = self.client.patch(f'/api/auth/users/{staff.pk}/', {
            'is_active': False,
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        staff.refresh_from_db()
        # LEADS-local deactivation flag flips...
        self.assertTrue(staff.deny_leads_access)
        # ...but the identity status (mirrored from SystemSoft) is untouched.
        self.assertTrue(staff.is_active)
        # The SystemSoft identity stays active; only the LEADS grant is disabled.
        self.assertEqual(self.core.users['lock@syncco.com']['status'], 'active')
        grants = [a for a in self.core.access if a['user'] == 555]
        self.assertEqual(grants[0]['status'], 'disabled')

    def test_sync_preserves_local_deactivation_and_mirrors_systemsoft(self):
        staff = User.objects.create_user(
            email='keep@syncco.com', password='x', name='Keep', company=self.company,
            role=self.company.roles.get(code='staff'), core_user_id=556,
            is_active=False, deny_leads_access=True,
        )
        # SystemSoft says the identity is ACTIVE (and the grant is enabled, so
        # the user is entitled to LEADS except for the local deactivation).
        self._seed_core_leads_user(core_id=556, email='keep@syncco.com', name='Keep')

        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/auth/users/')
        self.assertEqual(resp.status_code, 200)
        staff.refresh_from_db()
        # Identity status mirrors SystemSoft -> active...
        self.assertTrue(staff.is_active)
        # ...but the LEADS deactivation persists locally.
        self.assertTrue(staff.deny_leads_access)

    def test_role_permission_edit_pushes_to_every_staff_holding_it(self):
        staff = User.objects.create_user(
            email='rolehold@syncco.com', password='x', name='Role Hold',
            company=self.company, role=self.company.roles.get(code='staff'), core_user_id=444,
        )
        self._seed_core_leads_user(core_id=444, email='rolehold@syncco.com', name='Role Hold')

        self.client.force_authenticate(self.admin)
        staff_role = self.company.roles.get(code='staff')
        resp = self.client.patch(f'/api/auth/roles/{staff_role.pk}/', {
            'permissions': ['leads.view', 'quotation.view'],
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        grants = [a for a in self.core.access if a['user'] == 444]
        self.assertEqual(grants[0]['role'], 'Staff')
        self.assertEqual(set(grants[0]['permissions']), {'leads.view', 'quotation.view'})

    def test_disabled_grant_but_active_identity_is_inactive_in_leads(self):
        staff = User.objects.create_user(
            email='amp@syncco.com', password='x', name='Amp', company=self.company,
            role=self.company.roles.get(code='staff'), core_user_id=557,
        )
        # SystemSoft identity is active but the LEADS grant is disabled.
        self._seed_core_leads_user(core_id=557, email='amp@syncco.com', name='Amp',
                                   access_status='disabled')

        self.client.force_authenticate(self.admin)
        self.client.get('/api/auth/users/')
        staff.refresh_from_db()
        self.assertFalse(staff.is_active)

    def test_local_user_without_grant_is_marked_inactive(self):
        staff = User.objects.create_user(
            email='nogrant@syncco.com', password='x', name='No Grant',
            company=self.company, core_user_id=558,
        )
        # No Core leads access row is seeded for this user.

        self.client.force_authenticate(self.admin)
        self.client.get('/api/auth/users/')
        staff.refresh_from_db()
        self.assertFalse(staff.is_active)

    def test_local_user_without_core_link_is_marked_inactive(self):
        staff = User.objects.create_user(
            email='nolink@syncco.com', password='x', name='No Link',
            company=self.company,
        )
        self.assertEqual(staff.core_user_id, None)

        self.client.force_authenticate(self.admin)
        self.client.get('/api/auth/users/')
        staff.refresh_from_db()
        self.assertFalse(staff.is_active)


class AuthStatusEnforcementTests(TestCase):
    """LEADS re-checks the SystemSoft identity on each authenticated request."""

    def setUp(self):
        self.company = make_company('Status Co')
        self.user = User.objects.create_user(
            email='stat@statusco.com', password='x', name='Status Staff',
            company=self.company, core_user_id=9001,
        )

    def _token(self):
        from rest_framework_simplejwt.tokens import AccessToken

        token = AccessToken()
        token['user_id'] = self.user.core_user_id
        token['email'] = self.user.email
        token['name'] = self.user.name
        token['enabled_apps'] = ['leads']
        token['app_access'] = [
            {'org': self.company.core_org_id, 'app': 'leads', 'role': 'Staff',
             'permissions': ['leads.view']},
        ]
        return token

    def _profile(self, status='active', access='enabled'):
        return {
            'id': self.user.core_user_id,
            'email': self.user.email,
            'status': status,
            'access': ([{'application_code': 'leads', 'status': access, 'role': 'Staff'}]
                       if access else []),
        }

    @patch('accounts.authentication._CORE_STATUS_CACHE', {})
    def test_active_user_is_allowed(self):
        from .authentication import CoreJWTAuthentication

        with patch('accounts.authentication.core_client.get_user', return_value=self._profile()):
            user = CoreJWTAuthentication().get_user(self._token())
        self.assertEqual(user.pk, self.user.pk)
        self.assertTrue(user.is_active)

    @patch('accounts.authentication._CORE_STATUS_CACHE', {})
    def test_deactivated_user_is_rejected_and_flipped_locally(self):
        from .authentication import CoreJWTAuthentication
        from rest_framework_simplejwt.exceptions import AuthenticationFailed

        with patch(
            'accounts.authentication.core_client.get_user',
            return_value=self._profile(status='inactive'),
        ):
            with self.assertRaises(AuthenticationFailed):
                CoreJWTAuthentication().get_user(self._token())
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    @patch('accounts.authentication._CORE_STATUS_CACHE', {})
    def test_active_identity_without_leads_access_is_rejected(self):
        from .authentication import CoreJWTAuthentication
        from rest_framework_simplejwt.exceptions import AuthenticationFailed

        with patch(
            'accounts.authentication.core_client.get_user',
            return_value=self._profile(access=''),
        ):
            with self.assertRaises(AuthenticationFailed):
                CoreJWTAuthentication().get_user(self._token())

    @patch('accounts.authentication._CORE_STATUS_CACHE', {})
    def test_core_unreachable_fails_open(self):
        from .authentication import CoreJWTAuthentication

        with patch(
            'accounts.authentication.core_client.get_user',
            side_effect=CoreError(503),
        ):
            user = CoreJWTAuthentication().get_user(self._token())
        self.assertEqual(user.pk, self.user.pk)
        self.assertTrue(user.is_active)

    @patch('accounts.authentication._CORE_STATUS_CACHE', {})
    def test_leads_local_deactivation_rejects_even_when_core_active(self):
        from .authentication import CoreJWTAuthentication
        from rest_framework_simplejwt.exceptions import AuthenticationFailed

        self.user.deny_leads_access = True
        self.user.save(update_fields=['deny_leads_access'])
        with patch(
            'accounts.authentication.core_client.get_user',
            return_value=self._profile(),
        ):
            with self.assertRaises(AuthenticationFailed):
                CoreJWTAuthentication().get_user(self._token())
        self.user.refresh_from_db()
        # Identity status mirrored from SystemSoft stays active; only the
        # LEADS-local deactivation blocks the session.
        self.assertTrue(self.user.is_active)
        self.assertTrue(self.user.deny_leads_access)