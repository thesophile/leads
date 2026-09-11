from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from transactions.models import (
    Attachment,
    CallHistory,
    ClientDetail,
    Lead,
    LeadContactHistory,
    Order,
    ProposalDraft,
    ProposalTemplate,
    Quotation,
    QuotationApproval,
)
from utilities.models import Notification

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
        self.assertEqual(resp.data['assigned_to'], ['Shanu VR'])
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

    def test_assign_with_no_matching_leads_returns_clear_error(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/leads/assign/', {
            'assigned_to': 'Shanu VR', 'category': 'Nothing Here', 'count': 5,
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('No matching raw leads', resp.data['detail'])

    def test_assign_to_multiple_staff_distributes_round_robin(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/leads/assign/', {
            'assigned_to': ['Shanu VR', 'Staff A'], 'count': 5,
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['assigned'], 5)
        self.assertEqual(set(resp.data['assigned_to']), {'Shanu VR', 'Staff A'})
        self.assertEqual(
            Lead.objects.filter(assigned_to='Shanu VR', status='assigned').count(),
            3,
        )
        self.assertEqual(
            Lead.objects.filter(assigned_to='Staff A', status='assigned').count(),
            2,
        )
        self.assertEqual(Lead.objects.filter(status='raw').count(), 1)

    def test_assign_rejects_empty_staff_list(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/leads/assign/', {
            'assigned_to': [], 'count': 2,
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_assign_rejects_unknown_staff(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/leads/assign/', {
            'assigned_to': ['Shanu VR', 'Ghost User'], 'count': 2,
        }, format='json')
        self.assertEqual(resp.status_code, 400)


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
        Lead.objects.create(
            id='RL-2', company='Second Co', added_by='Priya Sharma', tenant=company,
        )
        staff_perms = company.roles.get(code='staff').permissions
        raw_less_role = company.roles.create(
            code='staff_no_raw', name='Staff (no raw)',
            permissions=[p for p in staff_perms if p != 'leads.view_raw_all'],
        )
        self.raw_less_staff = User.objects.create_user(
            email='rawless@acme.com', password='x', name='Ray Less',
            role=raw_less_role, company=company,
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

    def test_staff_sees_only_own_raw_leads(self):
        # The default staff role no longer sees every raw lead in the company;
        # staff only see the raw leads they added themselves.
        self.client.force_authenticate(self.shanu)
        resp = self.client.get('/api/transactions/leads/?status=raw')
        self.assertEqual({l['id'] for l in resp.data}, {'RL-1'})

    def test_staff_without_view_raw_all_sees_only_own_raw_leads(self):
        self.client.force_authenticate(self.raw_less_staff)
        resp = self.client.get('/api/transactions/leads/?status=raw')
        self.assertEqual({l['id'] for l in resp.data}, set())

    def test_staff_without_view_raw_all_sees_only_own_assigned_leads(self):
        self.client.force_authenticate(self.raw_less_staff)
        resp = self.client.get('/api/transactions/leads/?status=assigned')
        self.assertEqual(resp.data, [])

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

    def test_quotation_requested_moves_lead_out_of_telecall(self):
        # Setting call_status to 'Quotation Requested' flips the lead to the
        # quotation stage: it leaves the assigned (telecall) list and appears
        # in the quotation list.
        self.client.force_authenticate(self.shanu)
        resp = self.client.patch('/api/transactions/leads/TC-1/', {
            'call_status': 'Quotation Requested',
            'remarks': 'Client asked for a quotation.',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['callStatus'], 'Quotation Requested')
        self.assertEqual(resp.data['status'], 'quotation')

        self.client.force_authenticate(self.manager)
        resp = self.client.get('/api/transactions/leads/?status=quotation')
        self.assertEqual({l['id'] for l in resp.data}, {'TC-1'})
        resp = self.client.get('/api/transactions/leads/?status=assigned')
        self.assertEqual({l['id'] for l in resp.data}, set())

    def test_staff_loses_control_after_quotation_requested(self):
        # Once a staff moves a lead to 'Quotation Requested' it leaves the
        # assigned stage and they lose the ability to update it.
        self.client.force_authenticate(self.shanu)
        resp = self.client.patch('/api/transactions/leads/TC-1/', {
            'call_status': 'Quotation Requested',
            'remarks': 'Client asked for a quotation.',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'quotation')

        blocked = self.client.patch('/api/transactions/leads/TC-1/', {
            'remarks': 'Still mine?',
        }, format='json')
        self.assertEqual(blocked.status_code, 403)

    def test_staff_cannot_update_others_lead(self):
        # Priya cannot see (and therefore cannot edit) a lead assigned to Shanu.
        self.client.force_authenticate(self.priya)
        resp = self.client.patch('/api/transactions/leads/TC-1/', {
            'call_status': 'Interested',
        }, format='json')
        self.assertEqual(resp.status_code, 404)

    def test_logging_a_call_writes_history(self):
        self.client.force_authenticate(self.shanu)
        resp = self.client.patch('/api/transactions/leads/TC-1/', {
            'call_status': 'Interested',
            'priority': 'Hot',
            'remarks': 'Client eager to proceed.',
            'has_follow_up': True,
            'next_follow_up_date': '2026-08-25',
            'next_follow_up_time': '10:00 AM',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        entry = CallHistory.objects.get(lead_id='TC-1')
        self.assertEqual(entry.status, 'Interested')
        self.assertEqual(entry.caller, 'Shanu VR')
        self.assertEqual(entry.report, 'Client eager to proceed.')
        self.assertEqual(entry.follow_up, '2026-08-25 10:00 AM')
        self.assertEqual(resp.data['history'][0]['status'], 'Interested')
        self.assertEqual(resp.data['history'][0]['followUp'], '2026-08-25 10:00 AM')

    def test_pending_call_does_not_write_history(self):
        self.client.force_authenticate(self.shanu)
        resp = self.client.patch('/api/transactions/leads/TC-1/', {
            'call_status': 'Pending Call',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(CallHistory.objects.filter(lead_id='TC-1').exists())

    def test_patch_with_unknown_call_status_is_rejected(self):
        self.client.force_authenticate(self.shanu)
        resp = self.client.patch('/api/transactions/leads/TC-1/', {
            'call_status': 'Random Junk',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_patch_reassign_to_unknown_staff_is_rejected(self):
        # Managers hold the assign permission; unknown names are still rejected.
        self.client.force_authenticate(self.manager)
        resp = self.client.patch('/api/transactions/leads/TC-1/', {
            'assigned_to': 'Ghost User',
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.lead = Lead.objects.get(id='TC-1')
        self.assertEqual(self.lead.assigned_to, 'Shanu VR')

    def test_staff_without_assign_permission_cannot_reassign(self):
        # A plain staff member must not be able to move a lead to a colleague;
        # reassignment is gated behind the assign permission.
        self.client.force_authenticate(self.shanu)
        resp = self.client.patch('/api/transactions/leads/TC-1/', {
            'assigned_to': 'Priya Sharma',
        }, format='json')
        self.assertEqual(resp.status_code, 403)
        self.lead = Lead.objects.get(id='TC-1')
        self.assertEqual(self.lead.assigned_to, 'Shanu VR')


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


class LeadDuplicateScopingTests(APITestCase):
    def setUp(self):
        company = make_company('Acme')
        other = make_company('Globex')
        self.manager = User.objects.create_user(
            email='mgr@acme.com', password='x', name='Manager A',
            role=company.roles.get(code='manager'), company=company,
        )
        self.other_manager = User.objects.create_user(
            email='mgr@globex.com', password='x', name='Manager B',
            role=other.roles.get(code='manager'), company=other,
        )
        Lead.objects.filter(tenant__isnull=True).delete()

    def test_same_tenant_duplicate_is_rejected(self):
        self.client.force_authenticate(self.manager)
        first = self.client.post('/api/transactions/leads/', {
            'company': 'Cafe Day', 'phone': '111',
        }, format='json')
        self.assertEqual(first.status_code, 201)
        duplicate = self.client.post('/api/transactions/leads/', {
            'company': 'CAFE DAY', 'phone': '222',
        }, format='json')
        self.assertEqual(duplicate.status_code, 409)

    def test_cross_tenant_same_company_name_is_allowed(self):
        self.client.force_authenticate(self.manager)
        first = self.client.post('/api/transactions/leads/', {
            'company': 'State Bank of India', 'phone': '111',
        }, format='json')
        self.assertEqual(first.status_code, 201)
        self.client.force_authenticate(self.other_manager)
        second = self.client.post('/api/transactions/leads/', {
            'company': 'STATE BANK OF INDIA', 'phone': '222',
        }, format='json')
        self.assertEqual(second.status_code, 201)
        self.assertEqual(
            Lead.objects.filter(company__iexact='State Bank of India').count(),
            2,
        )

    def test_create_rejects_unknown_category(self):
        from master.models import Category

        Category.objects.get_or_create(name='Hospital', company=self.manager.company)
        self.client.force_authenticate(self.manager)
        bad = self.client.post('/api/transactions/leads/', {
            'company': 'Some Co', 'category': 'Not A Category',
        }, format='json')
        self.assertEqual(bad.status_code, 400)
        ok = self.client.post('/api/transactions/leads/', {
            'company': 'Some Co', 'category': 'Hospital',
        }, format='json')
        self.assertEqual(ok.status_code, 201)


class ProposalTemplateApiTests(APITestCase):
    def setUp(self):
        self.company = make_company('Template Co')
        self.manager = User.objects.create_user(
            email='mgr@tpl.com', password='x', name='Manager T',
            role=self.company.roles.get(code='manager'), company=self.company,
        )
        self.staff = User.objects.create_user(
            email='staff@tpl.com', password='x', name='Staff T',
            role=self.company.roles.get(code='staff'), company=self.company,
        )
        # A global (unowned) template shared with everyone.
        self.global_tpl = ProposalTemplate.objects.create(
            name='Global Website', category='Static Website',
            default_total='25000', default_discount='2000',
            scope_html='<h3>Global</h3>', detail_html='<p>Global detail</p>',
        )

    def test_create_requires_authenticated_user(self):
        resp = self.client.post('/api/transactions/proposal-templates/', {
            'name': 'My Tpl',
        }, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_staff_can_create_own_template(self):
        # The default staff role cannot create templates; use a user whose
        # role carries quotation create/edit.
        clerk = User.objects.create_user(
            email='clerk@tpl.com', password='x', name='Clerk T',
            role=self.company.roles.create(
                code='quotation_clerk', name='Quotation Clerk',
                permissions=['quotation.create', 'quotation.edit'],
            ),
            company=self.company,
        )
        self.client.force_authenticate(clerk)
        resp = self.client.post('/api/transactions/proposal-templates/', {
            'name': 'My Tpl', 'scopeHtml': '<p>x</p>',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['owner'], clerk.id)

    def test_create_template_and_list_owned_only(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/proposal-templates/', {
            'name': 'Hospital Suite',
            'category': 'Hospital',
            'defaultTotal': '80000',
            'defaultDiscount': '5000',
            'currency': 'INR (₹)',
            'scopeHtml': '<h3>Hospital</h3>',
            'detailHtml': '<p>Hospital detail</p>',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        tpl_id = resp.data['id']
        self.assertEqual(resp.data['owner'], self.manager.id)

        self.client.force_authenticate(self.manager)
        listing = self.client.get('/api/transactions/proposal-templates/')
        self.assertEqual(listing.status_code, 200)
        returned = listing.data
        names = {t['name'] for t in returned}
        self.assertIn('Hospital Suite', names)   # owned
        self.assertIn('Global Website', names)   # shared global
        # Global template has no owner
        global_entry = next(t for t in returned if t['name'] == 'Global Website')
        self.assertIsNone(global_entry['owner'])

    def test_user_templates_not_visible_to_others(self):
        self.client.force_authenticate(self.manager)
        self.client.post('/api/transactions/proposal-templates/', {
            'name': 'Private Tpl', 'scopeHtml': '<p>p</p>',
        }, format='json')
        # Another manager in a different company sees neither company-agnostic
        # private templates nor anyone else's templates.
        other_company = make_company('Other Co')
        other = User.objects.create_user(
            email='mgr2@tpl.com', password='x', name='Manager O',
            role=other_company.roles.get(code='manager'), company=other_company,
        )
        self.client.force_authenticate(other)
        listing = self.client.get('/api/transactions/proposal-templates/')
        returned = listing.data
        self.assertNotIn('Private Tpl', {t['name'] for t in returned})
        self.assertIn('Global Website', {t['name'] for t in returned})

    def test_create_requires_name(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/proposal-templates/', {
            'name': '   ',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_cannot_update_other_users_template(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/proposal-templates/', {
            'name': 'Private Tpl', 'scopeHtml': '<p>p</p>',
        }, format='json')
        tpl_id = resp.data['id']

        other_company = make_company('Other Co')
        other = User.objects.create_user(
            email='mgr3@tpl.com', password='x', name='Manager O3',
            role=other_company.roles.get(code='manager'), company=other_company,
        )
        self.client.force_authenticate(other)
        resp = self.client.put(f'/api/transactions/proposal-templates/{tpl_id}/', {
            'name': 'Hijacked',
        }, format='json')
        self.assertEqual(resp.status_code, 404)

    def test_cannot_create_duplicate_name_for_owner(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/proposal-templates/', {
            'name': 'Hospital Suite', 'scopeHtml': '<p>x</p>',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        resp = self.client.post('/api/transactions/proposal-templates/', {
            'name': 'hospital suite', 'scopeHtml': '<p>y</p>',
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('already exists', resp.data['detail'])

    def test_cannot_update_to_duplicate_name(self):
        self.client.force_authenticate(self.manager)
        self.client.post('/api/transactions/proposal-templates/', {
            'name': 'First', 'scopeHtml': '<p>a</p>',
        }, format='json')
        created = self.client.post('/api/transactions/proposal-templates/', {
            'name': 'Second', 'scopeHtml': '<p>b</p>',
        }, format='json')
        tpl_id = created.data['id']
        resp = self.client.put(f'/api/transactions/proposal-templates/{tpl_id}/', {
            'name': 'First',
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('already exists', resp.data['detail'])

    def test_update_own_template(self):
        self.client.force_authenticate(self.manager)
        created = self.client.post('/api/transactions/proposal-templates/', {
            'name': 'Original', 'scopeHtml': '<p>a</p>', 'detailHtml': '<p>b</p>',
        }, format='json')
        tpl_id = created.data['id']
        updated = self.client.put(f'/api/transactions/proposal-templates/{tpl_id}/', {
            'name': 'Renamed', 'scopeHtml': '<p>a2</p>',
        }, format='json')
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data['name'], 'Renamed')
        self.assertEqual(updated.data['scopeHtml'], '<p>a2</p>')
        self.assertEqual(updated.data['detailHtml'], '<p>b</p>')

    def test_delete_own_template(self):
        self.client.force_authenticate(self.manager)
        created = self.client.post('/api/transactions/proposal-templates/', {
            'name': 'Doomed', 'scopeHtml': '<p>x</p>',
        }, format='json')
        tpl_id = created.data['id']
        resp = self.client.delete(f'/api/transactions/proposal-templates/{tpl_id}/')
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(ProposalTemplate.objects.filter(pk=tpl_id).exists())

    def test_cannot_delete_other_users_template(self):
        self.client.force_authenticate(self.manager)
        created = self.client.post('/api/transactions/proposal-templates/', {
            'name': 'Doomed', 'scopeHtml': '<p>x</p>',
        }, format='json')
        tpl_id = created.data['id']
        other_company = make_company('Other Co')
        other = User.objects.create_user(
            email='mgr4@tpl.com', password='x', name='Manager O4',
            role=other_company.roles.get(code='manager'), company=other_company,
        )
        self.client.force_authenticate(other)
        resp = self.client.delete(f'/api/transactions/proposal-templates/{tpl_id}/')
        self.assertEqual(resp.status_code, 404)


class ProposalDraftApiTests(APITestCase):
    def setUp(self):
        self.company = make_company('Draft Co')
        self.manager = User.objects.create_user(
            email='mgr@draft.com', password='x', name='Manager D',
            role=self.company.roles.get(code='manager'), company=self.company,
        )
        self.staff = User.objects.create_user(
            email='staff@draft.com', password='x', name='Staff D',
            role=self.company.roles.get(code='staff'), company=self.company,
        )

    def test_save_and_retrieve_draft(self):
        self.client.force_authenticate(self.manager)
        save = self.client.put('/api/transactions/proposal-drafts/', {
            'proposalId': 'QTN-1',
            'customerPerson': 'John Doe',
            'companyName': 'Acme',
            'scopeHtml': '<p>scope</p>',
            'termsHtml': '<p>terms</p>',
            'total': '50000',
            'discount': '1000',
            'currency': 'INR (₹)',
        }, format='json')
        self.assertEqual(save.status_code, 200)
        fetch = self.client.get('/api/transactions/proposal-drafts/?proposal_id=QTN-1')
        self.assertEqual(fetch.status_code, 200)
        self.assertEqual(fetch.data['customerPerson'], 'John Doe')
        self.assertEqual(fetch.data['proposalId'], 'QTN-1')
        self.assertTrue(ProposalDraft.objects.filter(user=self.manager, proposal_id='QTN-1').exists())

    def test_retrieve_unknown_draft_returns_empty(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.get('/api/transactions/proposal-drafts/?proposal_id=nope')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data, {})

    def test_put_upserts_same_draft(self):
        self.client.force_authenticate(self.manager)
        self.client.put('/api/transactions/proposal-drafts/', {
            'proposalId': 'QTN-2', 'customerPerson': 'First',
        }, format='json')
        self.client.put('/api/transactions/proposal-drafts/', {
            'proposalId': 'QTN-2', 'customerPerson': 'Second', 'total': '999',
        }, format='json')
        self.assertEqual(
            ProposalDraft.objects.filter(user=self.manager, proposal_id='QTN-2').count(),
            1,
        )
        fetch = self.client.get('/api/transactions/proposal-drafts/?proposal_id=QTN-2')
        self.assertEqual(fetch.data['customerPerson'], 'Second')
        self.assertEqual(fetch.data['total'], '999')

    def test_drafts_are_scoped_per_user(self):
        self.client.force_authenticate(self.manager)
        self.client.put('/api/transactions/proposal-drafts/', {
            'proposalId': 'QTN-3', 'customerPerson': 'Manager draft',
        }, format='json')
        self.client.force_authenticate(self.staff)
        fetch = self.client.get('/api/transactions/proposal-drafts/?proposal_id=QTN-3')
        self.assertEqual(fetch.data, {})
        fetch_other = self.client.get(
            '/api/transactions/proposal-drafts/?proposal_id=QTN-3',
        )
        self.assertNotEqual(fetch_other.data.get('customerPerson'), 'Manager draft')

    def test_delete_draft(self):
        self.client.force_authenticate(self.manager)
        self.client.put('/api/transactions/proposal-drafts/', {
            'proposalId': 'QTN-4', 'customerPerson': 'To delete',
        }, format='json')
        self.assertTrue(ProposalDraft.objects.filter(user=self.manager, proposal_id='QTN-4').exists())
        resp = self.client.delete('/api/transactions/proposal-drafts/?proposal_id=QTN-4')
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(ProposalDraft.objects.filter(user=self.manager, proposal_id='QTN-4').exists())


import re
from unittest.mock import patch


class QuotationApprovalFlowTests(APITestCase):
    def setUp(self):
        company = make_company('ApproveCo')
        self.approver = User.objects.create_user(
            email='mgr@appr.com', password='x', name='Manager One',
            role=company.roles.get(code='manager'), company=company,
        )
        self.approver2 = User.objects.create_user(
            email='mgr2@appr.com', password='x', name='Manager Two',
            role=company.roles.get(code='manager'), company=company,
        )
        self.passenger = User.objects.create_user(
            email='mgr3@appr.com', password='x', name='Manager Three',
            role=company.roles.get(code='manager'), company=company,
        )
        self.staff = User.objects.create_user(
            email='staff@appr.com', password='x', name='Staff One',
            role=company.roles.create(
                code='quotation_clerk', name='Quotation Clerk',
                permissions=['quotation.view', 'quotation.create', 'quotation.edit'],
            ),
            company=company,
        )
        self.lead = make_raw_lead(company, 'Approve Ltd', assigned_to='Staff One')
        self.lead.status = Lead.STATUS_QUOTATION
        self.lead.save(update_fields=['status', 'updated_at'])
        self.q = Quotation.objects.create(
            id=self.lead.id, lead_id=self.lead.id, company=self.lead.company,
            tenant=company, staff='Staff One', status='Not Sent',
        )
        self.approver_ids = [self.approver.id, self.approver2.id]

    def _send(self, approvers=None):
        self.client.force_authenticate(self.staff)
        return self.client.put(
            f'/api/transactions/quotations/{self.lead.id}/',
            {'status': 'Pending Approval', 'approvers': approvers if approvers is not None else self.approver_ids},
            format='json',
        )

    def _approve(self, user, quotation):
        self.client.force_authenticate(user)
        mailbox = {}

        def fake_send(subject, message, from_email=None, recipient_list=None, fail_silently=False, **kw):
            mailbox['message'] = message
            return 1

        with patch('transactions.views.send_mail', side_effect=fake_send):
            otp = self.client.post(
                f'/api/transactions/quotations/{quotation}/approval-otp/', {}, format='json'
            )
        self.assertEqual(otp.status_code, 200)
        code = re.search(r'approval code is:\n\n\s*(\d{6})', mailbox['message']).group(1)
        return self.client.post(
            f'/api/transactions/quotations/{quotation}/approve/',
            {'otp': code}, format='json',
        )

    def test_approvers_list_excludes_staff(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.get('/api/transactions/quotations/approvers/')
        self.assertEqual(resp.status_code, 200)
        names = set(a['name'] for a in resp.data)
        self.assertIn('Manager One', names)
        self.assertIn('Manager Two', names)
        self.assertNotIn('Staff One', names)

    def test_approvers_list_excludes_self(self):
        self.client.force_authenticate(self.approver)
        resp = self.client.get('/api/transactions/quotations/approvers/')
        self.assertEqual(resp.status_code, 200)
        names = set(a['name'] for a in resp.data)
        self.assertNotIn('Manager One', names)
        self.assertIn('Manager Two', names)
        self.assertIn('Manager Three', names)

    def test_send_creates_one_approval_per_approver(self):
        resp = self._send()
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'Pending Approval')
        self.assertEqual(resp.data['submittedBy'], self.staff.id)
        self.assertEqual(resp.data['approvalsTotal'], 2)
        self.assertEqual(resp.data['approvalsApproved'], 0)
        self.assertEqual(QuotationApproval.objects.filter(quotation=self.q).count(), 2)
        # Both approvers were notified.
        for approver in (self.approver, self.approver2):
            self.assertTrue(Notification.objects.filter(user=approver, type='Approval').exists())

    def test_send_requires_at_least_one_approver(self):
        resp = self._send(approvers=[])
        self.assertEqual(resp.status_code, 400)

    def test_send_excludes_submitter(self):
        resp = self._send(approvers=[self.staff.id, self.approver.id])
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['approvalsTotal'], 1)
        self.assertEqual(QuotationApproval.objects.filter(quotation=self.q, user=self.staff).count(), 0)

    def test_only_selected_approvers_can_act(self):
        self._send()
        self.client.force_authenticate(self.passenger)
        resp = self.client.post(
            f'/api/transactions/quotations/{self.lead.id}/approval-otp/', {}, format='json'
        )
        self.assertEqual(resp.status_code, 403)

    def test_staff_cannot_request_otp(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.post(
            f'/api/transactions/quotations/{self.lead.id}/approval-otp/', {}, format='json'
        )
        self.assertEqual(resp.status_code, 403)

    def test_approval_requires_all_approvers(self):
        self._send()
        first = self._approve(self.approver, self.lead.id)
        self.assertEqual(first.data['status'], 'Pending Approval')
        self.assertEqual(first.data['approvalsApproved'], 1)
        # Not yet fully approved, so the submitter was not notified.
        self.assertFalse(Notification.objects.filter(user=self.staff, title='Proposal approved').exists())
        second = self._approve(self.approver2, self.lead.id)
        self.assertEqual(second.data['status'], 'Approved')
        self.assertEqual(second.data['approvalsApproved'], 2)
        self.assertTrue(
            Notification.objects.filter(user=self.staff, type='Approval', title='Proposal approved').exists()
        )

    def test_approve_with_wrong_otp_fails(self):
        self._send()
        self.client.force_authenticate(self.approver)
        with patch('transactions.views.send_mail', return_value=1):
            self.client.post(
                f'/api/transactions/quotations/{self.lead.id}/approval-otp/', {}, format='json'
            )
        resp = self.client.post(
            f'/api/transactions/quotations/{self.lead.id}/approve/',
            {'otp': '000000'}, format='json',
        )
        self.assertEqual(resp.status_code, 400)

    def test_single_rejection_rejects_whole_proposal(self):
        self._send()
        self.client.force_authenticate(self.approver)
        resp = self.client.post(
            f'/api/transactions/quotations/{self.lead.id}/reject/',
            {'reason': 'Budget too low'}, format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'Rejected')
        self.assertEqual(resp.data['rejectionReason'], 'Budget too low')
        self.assertTrue(
            Notification.objects.filter(user=self.staff, type='Approval', title='Proposal rejected').exists()
        )
        # Once rejected, another approver can no longer act.
        self.client.force_authenticate(self.approver2)
        otp = self.client.post(
            f'/api/transactions/quotations/{self.lead.id}/approval-otp/', {}, format='json'
        )
        self.assertEqual(otp.status_code, 400)

    def test_status_cannot_be_set_directly(self):
        self.client.force_authenticate(self.approver)
        resp = self.client.put(f'/api/transactions/quotations/{self.lead.id}/', {
            'status': 'Approved',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_edit_pending_quote_without_resend_keeps_approvals(self):
        # A generic edit of an already-pending proposal (no approvers payload)
        # must save normally without resetting the approvals or expecting a
        # new approval round.
        self._send()
        self.client.force_authenticate(self.staff)
        resp = self.client.put(f'/api/transactions/quotations/{self.lead.id}/', {
            'status': 'Pending Approval',
            'remarks': 'Typo fixed',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'Pending Approval')
        self.assertEqual(resp.data['remarks'], 'Typo fixed')
        self.assertEqual(QuotationApproval.objects.filter(quotation=self.q).count(), 2)

    def test_resend_pending_quote_is_blocked(self):
        self._send()
        self.client.force_authenticate(self.staff)
        resp = self.client.put(f'/api/transactions/quotations/{self.lead.id}/', {
            'status': 'Pending Approval', 'approvers': self.approver_ids,
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        # Prior approvals are preserved, not wiped.
        self.assertEqual(QuotationApproval.objects.filter(quotation=self.q).count(), 2)

    def test_resend_approved_quote_is_blocked(self):
        self._send()
        self._approve(self.approver, self.lead.id)
        self._approve(self.approver2, self.lead.id)
        self.client.force_authenticate(self.staff)
        resp = self.client.put(f'/api/transactions/quotations/{self.lead.id}/', {
            'status': 'Pending Approval', 'approvers': self.approver_ids,
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        quotation = Quotation.objects.get(lead_id=self.lead.id)
        self.assertEqual(quotation.status, 'Approved')
        self.assertEqual(QuotationApproval.objects.filter(quotation=quotation).count(), 2)

    def test_edit_approved_quote_is_blocked(self):
        self._send()
        self._approve(self.approver, self.lead.id)
        self._approve(self.approver2, self.lead.id)
        self.client.force_authenticate(self.staff)
        resp = self.client.put(f'/api/transactions/quotations/{self.lead.id}/', {
            'status': 'Approved',
            'remarks': 'Updated after approval',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_edit_as_new_version_creates_a_fresh_copy(self):
        # An approved proposal cannot be changed in place; "Edit as New
        # Version" spawns a new version that must be approved again before it
        # can be sent to the client. The old version stays untouched.
        self._send()
        self._approve(self.approver, self.lead.id)
        self._approve(self.approver2, self.lead.id)
        self.client.force_authenticate(self.staff)
        resp = self.client.put(f'/api/transactions/quotations/{self.lead.id}/', {
            'newVersion': True,
            'remarks': 'Revised offer',
            'total': '999',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['status'], 'Not Sent')
        self.assertEqual(resp.data['versionNo'], 2)
        self.assertEqual(resp.data['remarks'], 'Revised offer')
        self.assertTrue(resp.data['newVersion'])
        # The new version starts completely fresh.
        new_quote = Quotation.objects.get(id=resp.data['id'])
        self.assertEqual(new_quote.lead_id, self.lead.id)
        self.assertEqual(new_quote.version_no, 2)
        self.assertEqual(QuotationApproval.objects.filter(quotation=new_quote).count(), 0)
        self.assertEqual(new_quote.client_token, '')
        # The old version is untouched.
        old_quote = Quotation.objects.get(id=self.lead.id)
        self.assertEqual(old_quote.status, 'Approved')
        self.assertEqual(old_quote.remarks, '')
        self.assertEqual(QuotationApproval.objects.filter(quotation=old_quote).count(), 2)

        # The new version must be approved again before it can go to the client.
        self.client.force_authenticate(self.staff)
        send_resp = self.client.put(
            f'/api/transactions/quotations/{new_quote.id}/', {
                'status': 'Pending Approval', 'approvers': self.approver_ids,
            }, format='json',
        )
        self.assertEqual(send_resp.status_code, 200)
        self._approve(self.approver, new_quote.id)
        self._approve(self.approver2, new_quote.id)
        self.assertEqual(Quotation.objects.get(id=new_quote.id).status, 'Approved')
        self.assertEqual(Quotation.objects.get(id=self.lead.id).status, 'Approved')

    def test_sent_to_client_versions_keep_separate_links(self):
        # Two coexist versions each keep their own client link after approval.
        self._send()
        self._approve(self.approver, self.lead.id)
        self._approve(self.approver2, self.lead.id)
        self.client.force_authenticate(self.staff)
        self.client.put(f'/api/transactions/quotations/{self.lead.id}/', {
            'newVersion': True, 'total': '888',
        }, format='json')
        new_quote = Quotation.objects.get(lead_id=self.lead.id, version_no=2)
        self.client.force_authenticate(self.staff)
        self.client.put(
            f'/api/transactions/quotations/{new_quote.id}/', {
                'status': 'Pending Approval', 'approvers': self.approver_ids,
            }, format='json',
        )
        self._approve(self.approver, new_quote.id)
        self._approve(self.approver2, new_quote.id)
        self.client.force_authenticate(self.approver)
        first = self.client.post(
            f'/api/transactions/quotations/{self.lead.id}/send-to-client/',
            {'channels': ['copy'], 'origin': 'https://app.test'}, format='json',
        )
        second = self.client.post(
            f'/api/transactions/quotations/{new_quote.id}/send-to-client/',
            {'channels': ['copy'], 'origin': 'https://app.test'}, format='json',
        )
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertNotEqual(first.data['link'], second.data['link'])
        tokens = [Quotation.objects.get(id=q.id).client_token for q in (self.q, new_quote)]
        self.assertEqual(len(set(tokens)), 2)

        # The client page for the first version lists the sibling via payload.
        detail = self.client.get(f"/api/transactions/public/quotations/{tokens[0]}/")
        self.assertEqual(detail.status_code, 200)
        version_ids = [v['id'] for v in detail.data['versions']]
        self.assertIn(new_quote.id, version_ids)

    def test_get_quotation_is_scoped_to_company(self):
        other = make_company('OtherCo')
        other_manager = User.objects.create_user(
            email='other@mgr.com', password='x', name='Other Manager',
            role=other.roles.get(code='manager'), company=other,
        )
        self.client.force_authenticate(other_manager)
        resp = self.client.get(f'/api/transactions/quotations/{self.lead.id}/')
        self.assertEqual(resp.status_code, 404)
        # Legitimate same-company read still works.
        self.client.force_authenticate(self.approver)
        resp = self.client.get(f'/api/transactions/quotations/{self.lead.id}/')
        self.assertEqual(resp.status_code, 200)

    def test_delete_quotation_is_scoped_to_company(self):
        other = make_company('OtherCo2')
        other_manager = User.objects.create_user(
            email='other2@mgr.com', password='x', name='Other Manager 2',
            role=other.roles.get(code='manager'), company=other,
        )
        self.client.force_authenticate(other_manager)
        resp = self.client.delete(f'/api/transactions/quotations/{self.lead.id}/')
        self.assertEqual(resp.status_code, 404)
        self.assertTrue(Quotation.objects.filter(lead_id=self.lead.id).exists())


class QuotationSendWithoutApprovalTests(APITestCase):
    """Users with ``quotation.send_without_approval`` may send a proposal to the
    client without running it through the approval flow."""

    def setUp(self):
        company = make_company('BypassCo')
        self.company = company
        self.bypasser = User.objects.create_user(
            email='bypass@co.com', password='x', name='Bypass One',
            role=company.roles.create(
                code='bypasser', name='Bypasser',
                permissions=[
                    'quotation.view', 'quotation.create', 'quotation.edit',
                    'quotation.send', 'quotation.send_without_approval',
                ],
            ),
            company=company,
        )
        self.sender = User.objects.create_user(
            email='sender@co.com', password='x', name='Sender One',
            role=company.roles.create(
                code='sender', name='Sender',
                permissions=[
                    'quotation.view', 'quotation.create', 'quotation.edit',
                    'quotation.send',
                ],
            ),
            company=company,
        )
        self.approver = User.objects.create_user(
            email='approver@co.com', password='x', name='Approver One',
            role=company.roles.get(code='manager'), company=company,
        )
        self.lead = make_raw_lead(company, 'Bypass Ltd', assigned_to='Bypass One')
        self.lead.status = Lead.STATUS_QUOTATION
        self.lead.save(update_fields=['status', 'updated_at'])
        self.quote = Quotation.objects.create(
            id=self.lead.id, lead_id=self.lead.id, company=self.lead.company,
            tenant=company, staff='Bypass One', email='client@bypass.co',
            status='Not Sent',
        )
        self.send_url = f'/api/transactions/quotations/{self.quote.id}/send-to-client/'

    def _send_email(self, user):
        import types

        def fake_send(fail_silently=True):
            return 1

        fake_email = types.SimpleNamespace(send=fake_send)
        self.client.force_authenticate(user)
        with patch('transactions.views.build_client_email', return_value=fake_email):
            return self.client.post(
                self.send_url,
                {'channels': ['email'], 'origin': 'https://app.test'},
                format='json',
            )

    def test_without_permission_cannot_send_draft(self):
        resp = self._send_email(self.sender)
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(Quotation.objects.get(id=self.quote.id).status, 'Not Sent')

    def test_bypass_permission_sends_draft_without_approval(self):
        resp = self._send_email(self.bypasser)
        self.assertEqual(resp.status_code, 200)
        quote = Quotation.objects.get(id=self.quote.id)
        self.assertEqual(quote.status, 'Sent to Client')
        self.assertIsNotNone(quote.sent_to_client_at)
        self.assertTrue(quote.client_token)
        self.assertEqual(QuotationApproval.objects.filter(quotation=quote).count(), 0)

    def test_bypass_clears_pending_approvals(self):
        QuotationApproval.objects.create(quotation=self.quote, user=self.approver)
        self.quote.status = 'Pending Approval'
        self.quote.save(update_fields=['status'])
        resp = self._send_email(self.bypasser)
        self.assertEqual(resp.status_code, 200)
        quote = Quotation.objects.get(id=self.quote.id)
        self.assertEqual(quote.status, 'Sent to Client')
        self.assertEqual(QuotationApproval.objects.filter(quotation=quote).count(), 0)

    def test_quotation_requested_cannot_be_sent(self):
        self.quote.status = 'Quotation Requested'
        self.quote.save(update_fields=['status'])
        resp = self._send_email(self.bypasser)
        self.assertEqual(resp.status_code, 400)


class ContactEditSyncTests(APITestCase):
    """Company/contact details stay in sync and audited from any screen."""

    def setUp(self):
        company = make_company('Acme')
        self.company = company
        self.manager = User.objects.create_user(
            email='mgr@acme.com', password='x', name='Manager A',
            role=company.roles.get(code='manager'), company=company,
        )
        self.staff = User.objects.create_user(
            email='staff@acme.com', password='x', name='Staff A',
            role=company.roles.get(code='staff'), company=company,
        )
        Lead.objects.filter(tenant__isnull=True).delete()
        self.lead = Lead.objects.create(
            id='RL-SYNC', company='Sync Co', contact='Old Person',
            phone='111', email='old@sync.co', category='Hospital',
            city='Kochi', source='Google Search', added_by='Manager A',
            tenant=company, status='raw',
        )

    def test_lead_edit_syncs_to_existing_quotation(self):
        quotation = Quotation.objects.create(
            id='QT-SYNC-1', lead_id='RL-SYNC', company='Sync Co',
            tenant=self.company, mobile='111', email='old@sync.co',
        )
        self.client.force_authenticate(self.manager)
        resp = self.client.patch('/api/transactions/leads/RL-SYNC/', {
            'phone': '9999999999', 'email': 'new@sync.co',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        quotation.refresh_from_db()
        self.assertEqual(quotation.mobile, '9999999999')
        self.assertEqual(quotation.email, 'new@sync.co')

    def test_lead_change_records_history_and_flags(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.patch('/api/transactions/leads/RL-SYNC/', {
            'phone': '222', 'city': 'Trivandrum',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['contactChanged'])
        self.assertFalse(resp.data['wasGenerated'])
        rows = {h['field']: h for h in resp.data['contactHistory']}
        self.assertEqual(rows['phone']['fromValue'], '111')
        self.assertEqual(rows['phone']['toValue'], '222')
        self.assertEqual(rows['phone']['changedBy'], 'Manager A')
        self.assertEqual(rows['city']['fromValue'], 'Kochi')
        self.assertEqual(LeadContactHistory.objects.count(), 2)

    def test_lead_edit_without_contact_change_no_history(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.patch('/api/transactions/leads/RL-SYNC/', {
            'remarks': 'Just a note',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data['contactChanged'])
        self.assertEqual(LeadContactHistory.objects.count(), 0)

    def test_quotation_edit_syncs_and_audits_back_to_lead(self):
        self.client.force_authenticate(self.manager)
        # First save creates the proposal (baseline — nothing to mirror).
        self.client.put('/api/transactions/quotations/RL-SYNC/', {
            'company': 'Sync Co', 'customer': 'Old Person', 'mobile': '111',
            'email': 'old@sync.co', 'category': 'Hospital', 'city': 'Kochi',
            'source': 'Google Search', 'total': '1000',
        }, format='json')
        # Second save corrects the contact person / mobile / email.
        resp = self.client.put('/api/transactions/quotations/RL-SYNC/', {
            'company': 'Sync Co', 'customer': 'New Person', 'mobile': '333',
            'email': 'mail@sync.co', 'category': 'Hospital', 'city': 'Kochi',
            'source': 'Google Search', 'total': '1000',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['contactChanged'])
        self.assertFalse(resp.data['wasGenerated'])
        self.lead.refresh_from_db()
        self.assertEqual(self.lead.phone, '333')
        self.assertEqual(self.lead.email, 'mail@sync.co')
        self.assertEqual(self.lead.contact, 'New Person')
        rows = {}
        for field, from_value, to_value in (
            LeadContactHistory.objects.filter(lead=self.lead)
            .values_list('field', 'from_value', 'to_value')
        ):
            rows[field] = (from_value, to_value)
        self.assertEqual(rows['phone'], ('111', '333'))
        self.assertEqual(rows['contact'], ('Old Person', 'New Person'))

    def test_quotation_edit_on_generated_quote_flags_warning(self):
        self.client.force_authenticate(self.manager)
        self.client.put('/api/transactions/quotations/RL-SYNC/', {
            'company': 'Sync Co', 'customer': 'Person', 'mobile': '111',
            'email': 'a@sync.co', 'category': 'Hospital', 'city': 'Kochi',
            'source': 'Google Search', 'total': '1000',
        }, format='json')
        quotation = Quotation.objects.get(lead_id='RL-SYNC')
        quotation.status = 'Approved'
        quotation.save()
        # Editing an approved proposal must go through "Edit as New Version";
        # a plain edit is refused.
        blocked = self.client.put('/api/transactions/quotations/RL-SYNC/', {
            'email': 'changed@sync.co',
        }, format='json')
        self.assertEqual(blocked.status_code, 400)
        # The new version still syncs the contact change and flags the warning.
        resp = self.client.put('/api/transactions/quotations/RL-SYNC/', {
            'newVersion': True,
            'email': 'changed@sync.co',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.data['contactChanged'])
        self.assertTrue(resp.data['wasGenerated'])
        self.assertEqual(resp.data['status'], 'Not Sent')
        self.lead.refresh_from_db()
        self.assertEqual(self.lead.email, 'changed@sync.co')
        self.assertTrue(LeadContactHistory.objects.filter(
            lead=self.lead, field='email', from_value='a@sync.co', to_value='changed@sync.co'
        ).exists())
        # The original approved version is untouched.
        self.assertEqual(Quotation.objects.get(lead_id='RL-SYNC', version_no=1).status, 'Approved')

    def test_quotation_create_does_not_log_spurious_history(self):
        # First-time proposal save with the same values as the lead records
        # nothing in the audit trail.
        self.client.force_authenticate(self.manager)
        self.client.put('/api/transactions/quotations/RL-SYNC/', {
            'company': 'Sync Co', 'customer': 'Old Person', 'mobile': '111',
            'email': 'old@sync.co', 'category': 'Hospital', 'city': 'Kochi',
            'source': 'Google Search', 'total': '1000',
        }, format='json')
        self.assertEqual(LeadContactHistory.objects.count(), 0)

    def test_contact_history_rides_on_lead_list(self):
        self.client.force_authenticate(self.manager)
        self.client.patch('/api/transactions/leads/RL-SYNC/', {
            'phone': '444',
        }, format='json')
        resp = self.client.get('/api/transactions/leads/?status=raw')
        self.assertEqual(resp.status_code, 200)
        row = next(l for l in resp.data if l['id'] == 'RL-SYNC')
        self.assertEqual(row['contactHistory'][0]['field'], 'phone')
        self.assertEqual(row['contactHistory'][0]['toValue'], '444')


class OrderSendToClientTests(APITestCase):
    """Order forms are sent to the client via email / WhatsApp / link."""

    def setUp(self):
        company = make_company('OrderCo')
        self.manager = User.objects.create_user(
            email='mgr2@order.com', password='x', name='Manager Order',
            role=company.roles.get(code='manager'), company=company,
        )
        self.viewer = User.objects.create_user(
            email='staff5@order.com', password='x', name='Staff Order',
            role=company.roles.get(code='staff'), company=company,
        )
        self.order = Order.objects.create(
            id='P2026-0001',
            company='Order Ltd',
            customer='Client Person',
            tenant=company,
            mobile='9447000000',
            email='client@order.com',
            status='Pending',
            scope='<p>Order summary</p>',
            details='<p>Order details</p>',
        )
        self.send_url = f'/api/transactions/orders/{self.order.id}/send-to-client/'

    def test_staff_without_edit_permission_cannot_send(self):
        self.client.force_authenticate(self.viewer)
        resp = self.client.post(self.send_url, {'channels': ['copy']}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_requires_at_least_one_channel(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post(self.send_url, {'channels': []}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_copy_link_returns_link_without_changing_status(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post(
            self.send_url,
            {'channels': ['copy'], 'origin': 'https://app.test'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn('/order/', resp.data['link'])
        self.assertEqual(resp.data['link'], 'https://app.test/order/' + Order.objects.get(id=self.order.id).client_token)
        self.assertEqual(Order.objects.get(id=self.order.id).status, 'Pending')

    def test_email_channel_marks_sent_and_sends(self):
        self.client.force_authenticate(self.manager)
        sent = {}

        import types

        def fake_send(fail_silently=True):
            sent['called'] = True
            return 1

        fake_email = types.SimpleNamespace(send=fake_send)
        with patch('transactions.views.build_order_client_email', return_value=fake_email):
            resp = self.client.post(
                self.send_url,
                {'channels': ['email'], 'origin': 'https://app.test', 'message': 'Hi client'},
                format='json',
            )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(sent.get('called'))
        self.assertEqual(resp.data['email_sent'], True)
        self.assertEqual(resp.data['email'], 'client@order.com')
        order = Order.objects.get(id=self.order.id)
        self.assertEqual(order.status, 'Sent to Client')
        self.assertIsNotNone(order.sent_to_client_at)
        self.assertTrue(order.client_token)

    def test_whatsapp_channel_opens_number(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post(
            self.send_url,
            {'channels': ['whatsapp'], 'origin': 'https://app.test'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['mobile'], '9447000000')
        order = Order.objects.get(id=self.order.id)
        self.assertEqual(order.status, 'Sent to Client')
        self.assertTrue(order.client_token)

    def test_public_page_is_read_only(self):
        self.client.force_authenticate(self.manager)
        self.client.post(self.send_url, {'channels': ['copy'], 'origin': 'https://app.test'}, format='json')
        token = Order.objects.get(id=self.order.id).client_token

        for user in (None, self.manager):
            if user is not None:
                self.client.force_authenticate(user)
            else:
                self.client.force_authenticate(None)
            detail = self.client.get(f'/api/transactions/public/orders/{token}/')
            self.assertEqual(detail.status_code, 200)
            self.assertEqual(detail.data['id'], self.order.id)
            self.assertEqual(detail.data['clientStatus'], 'Pending')

        # The order form is shared for reference only: the client never accepts
        # it again, so no respond endpoint exists.
        self.client.force_authenticate(None)
        resp = self.client.post(
            f'/api/transactions/public/orders/{token}/respond/',
            {'decision': 'accept', 'message': 'Looks good, proceed'},
            format='json',
        )
        self.assertEqual(resp.status_code, 404)

    def test_order_pdf_download(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.get(f'/api/transactions/orders/{self.order.id}/pdf/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'], 'application/pdf')
        self.assertIn('attachment', resp['Content-Disposition'])
        self.assertTrue(len(resp.content) > 0)

    def test_public_order_pdf_download(self):
        self.client.force_authenticate(self.manager)
        self.client.post(self.send_url, {'channels': ['copy'], 'origin': 'https://app.test'}, format='json')
        token = Order.objects.get(id=self.order.id).client_token
        self.client.force_authenticate(None)
        resp = self.client.get(f'/api/transactions/public/orders/{token}/pdf/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'], 'application/pdf')

    def test_email_with_additional_recipients_and_cc(self):
        self.client.force_authenticate(self.manager)
        sent = {}

        import types

        def fake_send(fail_silently=True):
            sent['called'] = True
            return 1

        fake_email = types.SimpleNamespace(send=fake_send)
        with patch('transactions.views.build_order_client_email', return_value=fake_email) as builder:
            resp = self.client.post(
                self.send_url,
                {
                    'channels': ['email'],
                    'origin': 'https://app.test',
                    'recipients': ['client@order.com', 'finance@order.com'],
                    'cc': ['manager@order.com'],
                },
                format='json',
            )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(sent.get('called'))
        self.assertEqual(builder.call_args.kwargs['recipients'], ['client@order.com', 'finance@order.com'])
        self.assertEqual(builder.call_args.kwargs['cc'], ['manager@order.com'])

    def test_email_works_without_client_address_when_recipient_given(self):
        Order.objects.filter(id=self.order.id).update(email='')
        self.client.force_authenticate(self.manager)
        resp = self.client.post(
            self.send_url,
            {
                'channels': ['email'],
                'origin': 'https://app.test',
                'recipients': ['other@example.com'],
            },
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['email_sent'], True)
        self.assertEqual(Order.objects.get(id=self.order.id).status, 'Sent to Client')

    def test_email_requires_recipient_when_no_client_address(self):
        Order.objects.filter(id=self.order.id).update(email='')
        self.client.force_authenticate(self.manager)
        resp = self.client.post(
            self.send_url,
            {'channels': ['email'], 'origin': 'https://app.test'},
            format='json',
        )
        self.assertEqual(resp.status_code, 400)

    def test_invalid_and_expired_links_are_rejected(self):
        from datetime import timedelta

        from django.utils import timezone

        self.client.force_authenticate(self.manager)
        self.client.post(self.send_url, {'channels': ['copy'], 'origin': 'https://app.test'}, format='json')
        token = Order.objects.get(id=self.order.id).client_token
        Order.objects.filter(id=self.order.id).update(
            client_token_expires_at=timezone.now() - timedelta(days=1)
        )

        self.client.force_authenticate(None)
        resp = self.client.get(f'/api/transactions/public/orders/{token}/')
        self.assertEqual(resp.status_code, 404)

        self.client.force_authenticate(None)
        resp = self.client.get('/api/transactions/public/orders/NOPE/')
        self.assertEqual(resp.status_code, 404)
class ClientDetailFlowTests(APITestCase):
    """Accepted orders move from Manage Orders into Client Details."""

    def setUp(self):
        company = make_company('ClientDetailCo')
        self.company = company
        self.manager = User.objects.create_user(
            email='mgr@cd.com', password='x', name='Manager CD',
            role=company.roles.get(code='manager'), company=company,
        )
        self.viewer = User.objects.create_user(
            email='staff@cd.com', password='x', name='Staff CD',
            role=company.roles.get(code='staff'), company=company,
        )
        self.lead = Lead.objects.create(
            id='TC-CLIENT', company='Client Co', assigned_to='Staff CD',
            tenant=company, status=Lead.STATUS_ORDER,
        )
        self.order = Order.objects.create(
            id='P2026-0001', lead_id='TC-CLIENT', company='Client Co',
            customer='Client Person', tenant=company, mobile='9447000000',
            email='client@cd.com', category='Dynamic Website',
            proposal_by='Staff CD', staff='Staff CD', status='Pending',
        )

    def test_client_detail_auto_created_from_order_is_idempotent(self):
        # The ClientDetail row is created automatically when a quotation is
        # accepted (asserted in QuotationAcceptanceConfirmationTests). It never
        # depends on a separate order "accept" step.
        from transactions.services import create_client_detail_from_order
        first = create_client_detail_from_order(self.order)
        self.assertIsNotNone(first)
        self.assertEqual(first.company, 'Client Co')
        self.assertEqual(first.client_name, 'Client Person')
        self.assertEqual(first.status, 'Details Pending')
        second = create_client_detail_from_order(self.order)
        self.assertEqual(second.id, first.id)
        self.assertEqual(ClientDetail.objects.filter(order_no=self.order.id).count(), 1)

    def test_client_details_list_is_scoped(self):
        other = make_company('OtherClientCo')
        other_order = Order.objects.create(
            id='P2026-0099', company='Other Co', tenant=other, status='Accepted',
        )
        from transactions.services import create_client_detail_from_order
        create_client_detail_from_order(self.order)
        create_client_detail_from_order(other_order)
        self.client.force_authenticate(self.manager)
        resp = self.client.get('/api/transactions/client-details/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual({r['orderNo'] for r in resp.data}, {self.order.id})

    def test_create_upserts_by_order_no(self):
        from transactions.services import create_client_detail_from_order
        create_client_detail_from_order(self.order)
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/client-details/', {
            'orderNo': self.order.id,
            'company': 'Client Co',
            'clientName': 'Renamed Person',
            'status': 'Details Complete',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(ClientDetail.objects.filter(order_no=self.order.id).count(), 1)
        self.assertEqual(resp.data['clientName'], 'Renamed Person')
        self.assertEqual(resp.data['status'], 'Details Complete')

    def test_create_new_record_with_attachments(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/client-details/', {
            'orderNo': 'P2026-0002',
            'leadId': 'TC-CLIENT',
            'clientName': 'New Person',
            'company': 'New Co',
            'mobile': '9447000001',
            'email': 'new@cd.com',
            'category': 'Static Website',
            'acceptedDate': '2026-09-07',
            'collectedBy': 'Staff CD',
            'status': 'Details Complete',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        record = ClientDetail.objects.get(id=resp.data['id'])
        from django.core.files.uploadedfile import SimpleUploadedFile
        f = SimpleUploadedFile('card.jpg', b'fake-img-bytes', content_type='image/jpeg')
        upload = self.client.post(
            f'/api/transactions/client-details/{record.id}/attachments/',
            {'file': f, 'type': 'Business Card'}, format='multipart',
        )
        self.assertEqual(upload.status_code, 201)
        record.refresh_from_db()
        self.assertEqual(record.attachments.count(), 1)
        self.assertEqual(record.attachments.first().type, 'Business Card')
        self.lead.refresh_from_db()
        self.assertEqual(self.lead.status, Lead.STATUS_CLIENT)

    def test_viewer_only_sorted_by_client_view_perm(self):
        self.client.force_authenticate(self.viewer)
        resp = self.client.post('/api/transactions/client-details/', {
            'orderNo': 'P2026-0003', 'company': 'No Perm Co',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_status_is_validated(self):
        self.client.force_authenticate(self.manager)
        record = ClientDetail.objects.create(
            id='CD-STATUS-1', order_no='P2026-0777', company='Status Co', tenant=self.company,
        )
        bad = self.client.put(
            f'/api/transactions/client-details/{record.id}/',
            {'status': 'Not A Status'}, format='json',
        )
        self.assertEqual(bad.status_code, 400)
        good = self.client.put(
            f'/api/transactions/client-details/{record.id}/',
            {'status': 'Paid'}, format='json',
        )
        self.assertEqual(good.status_code, 200)
        self.assertEqual(good.data['status'], 'Paid')

    def test_record_delete_is_superuser_only(self):
        record = ClientDetail.objects.create(
            id='CD-DEL-1', order_no='P2026-0888', company='Del Co', tenant=self.company,
        )
        # A normal manager is blocked even though they can edit client details.
        self.client.force_authenticate(self.manager)
        blocked = self.client.delete(f'/api/transactions/client-details/{record.id}/')
        self.assertEqual(blocked.status_code, 403)
        self.assertTrue(ClientDetail.objects.filter(pk='CD-DEL-1').exists())
        # A superuser can delete.
        admin = User.objects.create_user(
            email='super@cd.com', password='x', name='Super CD', is_superuser=True,
        )
        self.client.force_authenticate(admin)
        ok = self.client.delete(f'/api/transactions/client-details/{record.id}/')
        self.assertEqual(ok.status_code, 204)
        self.assertFalse(ClientDetail.objects.filter(pk='CD-DEL-1').exists())


class ClientDetailAttachmentTests(APITestCase):
    """Handover files upload per organization with sane limits."""

    def setUp(self):
        company = make_company('AttachCo')
        self.company = company
        self.manager = User.objects.create_user(
            email='mgr@att.com', password='x', name='Manager Att',
            role=company.roles.get(code='manager'), company=company,
        )
        self.staff = User.objects.create_user(
            email='staff@att.com', password='x', name='Staff Att',
            role=company.roles.get(code='staff'), company=company,
        )
        self.lead = Lead.objects.create(
            id='TC-ATT', company='Att Co', assigned_to='Staff Att',
            tenant=company, status=Lead.STATUS_CLIENT,
        )
        self.record = ClientDetail.objects.create(
            id='CD-P2026-0001', order_no='P2026-0001', lead_id='TC-ATT',
            company='Att Co', tenant=company, status='Details Pending',
        )
        self.upload_url = f'/api/transactions/client-details/{self.record.id}/attachments/'

    def _upload(self, name='srs.pdf', content_type='application/pdf', content=b'%PDF-1.4\x0a%per-org', att_type='SRS Document'):
        from django.core.files.uploadedfile import SimpleUploadedFile
        f = SimpleUploadedFile(name, content, content_type=content_type)
        return self.client.post(self.upload_url, {'file': f, 'type': att_type}, format='multipart')

    def test_upload_pdf_stores_file_per_organization(self):
        self.client.force_authenticate(self.manager)
        resp = self._upload()
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['mime'], 'application/pdf')
        self.assertEqual(resp.data['type'], 'SRS Document')
        self.assertTrue(resp.data['url'])
        att = Attachment.objects.get(pk=resp.data['id'])
        self.assertTrue(att.file.name.startswith(f'client_attachments/org-{self.company.id}/'))
        self.assertEqual(att.client_detail_id, self.record.id)

    def test_upload_rejects_unsupported_type(self):
        self.client.force_authenticate(self.manager)
        resp = self._upload(name='note.txt', content_type='text/plain', content=b'hello')
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(Attachment.objects.count(), 0)

    def test_upload_rejects_files_over_limit(self):
        self.client.force_authenticate(self.manager)
        from transactions.views import ATTACHMENT_MAX_BYTES
        with patch('transactions.views.ATTACHMENT_MAX_BYTES', 100):
            resp = self._upload(content=b'x' * 500)
        self.assertEqual(resp.status_code, 400)
        self.assertIn('upload limit', resp.data['detail'])

    def test_upload_requires_edit_permission(self):
        self.client.force_authenticate(self.staff)
        resp = self._upload()
        self.assertEqual(resp.status_code, 403)

    def test_upload_scoped_to_own_company(self):
        other = make_company('OtherAttCo')
        other_record = ClientDetail.objects.create(
            id='CD-P2026-0999', order_no='P2026-0999', company='Other Co', tenant=other,
        )
        self.client.force_authenticate(self.manager)
        from django.core.files.uploadedfile import SimpleUploadedFile
        f = SimpleUploadedFile('srs.pdf', b'%PDF', content_type='application/pdf')
        resp = self.client.post(
            f'/api/transactions/client-details/{other_record.id}/attachments/',
            {'file': f}, format='multipart',
        )
        self.assertEqual(resp.status_code, 404)

    def test_delete_attachment_removes_file_and_row(self):
        self.client.force_authenticate(self.manager)
        uploaded = self._upload().data
        att = Attachment.objects.get(pk=uploaded['id'])
        path = att.file.path
        self.assertTrue(att.file.storage.exists(att.file.name))
        resp = self.client.delete(f"{self.upload_url}{att.pk}/")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(Attachment.objects.filter(pk=att.pk).exists())
        self.assertFalse(att.file.storage.exists(att.file.name))

    def test_client_detail_json_save_ignores_attachments(self):
        # Attachments are managed by the dedicated upload/delete endpoints.
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/client-details/', {
            'orderNo': 'P2026-0210', 'company': 'No Files Co',
            'attachments': [{'type': 'SRS Document', 'name': 'fake.pdf'}],
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(Attachment.objects.filter(client_detail_id=resp.data['id']).count(), 0)


class ClientDetailTenantIsolationTests(APITestCase):
    def setUp(self):
        self.acme = make_company('CD Acme')
        self.globex = make_company('CD Globex')
        self.mgr_a = User.objects.create_user(
            email='cd@acme.com', password='x', name='CD A',
            role=self.acme.roles.get(code='manager'), company=self.acme,
        )
        self.mgr_b = User.objects.create_user(
            email='cd@globex.com', password='x', name='CD B',
            role=self.globex.roles.get(code='manager'), company=self.globex,
        )

    def test_same_order_number_in_other_company_creates_own_record(self):
        self.client.force_authenticate(self.mgr_a)
        first = self.client.post('/api/transactions/client-details/', {
            'orderNo': 'ORD-1', 'company': 'Alpha Co',
        }, format='json')
        self.assertEqual(first.status_code, 201)
        first_id = first.data['id']

        self.client.force_authenticate(self.mgr_b)
        second = self.client.post('/api/transactions/client-details/', {
            'orderNo': 'ORD-1', 'company': 'Beta Co',
        }, format='json')
        # Must create a brand-new record in company B, not overwrite company A's.
        self.assertEqual(second.status_code, 201)
        self.assertNotEqual(second.data['id'], first_id)
        self.assertEqual(ClientDetail.objects.filter(order_no='ORD-1').count(), 2)

        self.client.force_authenticate(self.mgr_a)
        list_a = self.client.get('/api/transactions/client-details/')
        self.assertEqual([r['id'] for r in list_a.data], [first_id])

    def test_upsert_only_updates_own_company_record(self):
        self.client.force_authenticate(self.mgr_a)
        self.client.post('/api/transactions/client-details/', {
            'orderNo': 'ORD-2', 'company': 'Alpha Co', 'notes': 'v1',
        }, format='json')
        # Re-post the same orderNo within the SAME company updates in place.
        resp = self.client.post('/api/transactions/client-details/', {
            'orderNo': 'ORD-2', 'company': 'Alpha Co', 'notes': 'v2',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(ClientDetail.objects.filter(order_no='ORD-2').count(), 1)
        self.assertEqual(ClientDetail.objects.get(order_no='ORD-2').notes, 'v2')


class QuotationWedgeRegressionTests(APITestCase):
    def setUp(self):
        company = make_company('WedgeCo')
        self.manager = User.objects.create_user(
            email='wg@wedge.com', password='x', name='Wedge A',
            role=company.roles.get(code='manager'), company=company,
        )
        self.lead = make_raw_lead(company, 'Wedge Ltd', assigned_to='Wedge A')
        self.lead.status = Lead.STATUS_QUOTATION
        self.lead.save(update_fields=['status', 'updated_at'])

    def test_pending_approval_without_approvers_is_rejected(self):
        # First create the proposal draft, then try to wedge it into approval.
        self.client.force_authenticate(self.manager)
        draft = self.client.put(f'/api/transactions/quotations/{self.lead.id}/', {
            'status': 'Prepared', 'customer': 'Wedge Ltd',
        }, format='json')
        self.assertEqual(draft.status_code, 200)
        resp = self.client.put(f'/api/transactions/quotations/{self.lead.id}/', {
            'status': 'Pending Approval',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_delete_quotation_with_existing_order_is_rejected(self):
        self.client.force_authenticate(self.manager)
        self.client.put(f'/api/transactions/quotations/{self.lead.id}/', {
            'status': 'Prepared', 'customer': 'Wedge Ltd',
        }, format='json')
        Order.objects.create(
            id='O-WEDGE-1', lead_id=self.lead.id, company='Wedge Ltd',
            tenant=self.manager.company, status='Pending',
        )
        resp = self.client.delete(f'/api/transactions/quotations/{self.lead.id}/')
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(Quotation.objects.filter(lead_id=self.lead.id).exists())

    def test_order_derived_from_lead_is_not_duplicated(self):
        # Accepting two quotation versions for the same lead must yield only
        # one order row (dedupe is per-lead).
        from transactions.views import create_order_from_quotation

        self.client.force_authenticate(self.manager)
        self.client.put(f'/api/transactions/quotations/{self.lead.id}/', {
            'status': 'Prepared', 'customer': 'Wedge Ltd', 'total': '10000', 'netAmount': '10000',
        }, format='json')
        q1 = Quotation.objects.get(id=self.lead.id)
        q1.status = 'Accepted'
        q1.save(update_fields=['status'])
        order1 = create_order_from_quotation(q1)
        order2 = create_order_from_quotation(q1)
        self.assertEqual(Order.objects.filter(lead_id=self.lead.id).count(), 1)
        self.assertEqual(order1.id, order2.id)


class LeadStatusAndLockTests(APITestCase):
    """Lead Status (my leads) and the locking feature."""

    def setUp(self):
        company = make_company('StatusCo')
        self.company = company
        self.manager = User.objects.create_user(
            email='mgr@status.com', password='x', name='Manager S',
            role=company.roles.get(code='manager'), company=company,
        )
        self.admin = User.objects.create_user(
            email='admin@status.com', password='x', name='Admin S',
            role=company.roles.get(code='admin'), company=company,
        )
        self.staff = User.objects.create_user(
            email='staff@status.com', password='x', name='Staff S',
            role=company.roles.get(code='staff'), company=company,
        )
        self.other = User.objects.create_user(
            email='other@status.com', password='x', name='Other S',
            role=company.roles.get(code='staff'), company=company,
        )
        Lead.objects.filter(tenant__isnull=True).delete()
        self.raw = Lead.objects.create(
            id='ST-RAW', company='Raw Co', added_by='Staff S', tenant=company,
        )
        self.asgn = Lead.objects.create(
            id='ST-ASGN', company='Asgn Co', assigned_to='Staff S',
            tenant=company, status=Lead.STATUS_ASSIGNED,
        )
        self.quote = Lead.objects.create(
            id='ST-QTN', company='Quote Co', assigned_to='Staff S',
            tenant=company, status=Lead.STATUS_QUOTATION,
        )
        Quotation.objects.create(
            id='ST-QTN', lead_id='ST-QTN', company='Quote Co',
            tenant=company, staff='Staff S', status='Approved',
        )
        self.other_asgn = Lead.objects.create(
            id='ST-OTH', company='Other Co', assigned_to='Other S',
            tenant=company, status=Lead.STATUS_ASSIGNED,
        )

    def test_staff_my_leads_lists_own_leads_across_stages(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.get('/api/transactions/leads/my/')
        self.assertEqual(resp.status_code, 200)
        ids = {item['id'] for item in resp.data}
        self.assertEqual(ids, {'ST-RAW', 'ST-ASGN', 'ST-QTN'})
        by_id = {item['id']: item for item in resp.data}
        self.assertEqual(by_id['ST-QTN']['stageLabel'], 'Quotation')
        self.assertEqual(by_id['ST-QTN']['detail'], 'Quotation approved')
        self.assertEqual(by_id['ST-ASGN']['stageLabel'], 'Tele Call')

    def test_staff_my_leads_excludes_others_leads(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.get('/api/transactions/leads/my/')
        ids = {item['id'] for item in resp.data}
        self.assertNotIn('ST-OTH', ids)

    def test_staff_locks_assigned_lead(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.post('/api/transactions/leads/ST-ASGN/lock/', {}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['isLocked'])
        lead = Lead.objects.get(id='ST-ASGN')
        self.assertTrue(lead.is_locked)
        self.assertEqual(lead.locked_by, 'Staff S')

    def test_manager_cannot_reassign_locked_lead(self):
        self.staff_lock_lead()
        self.client.force_authenticate(self.manager)
        resp = self.client.patch('/api/transactions/leads/ST-ASGN/', {
            'assigned_to': 'Other S',
        }, format='json')
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(Lead.objects.get(id='ST-ASGN').assigned_to, 'Staff S')

    def test_admin_can_reassign_locked_lead(self):
        self.staff_lock_lead()
        self.client.force_authenticate(self.admin)
        resp = self.client.patch('/api/transactions/leads/ST-ASGN/', {
            'assigned_to': 'Other S',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Lead.objects.get(id='ST-ASGN').assigned_to, 'Other S')

    def test_manager_cannot_unlock(self):
        self.staff_lock_lead()
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/leads/ST-ASGN/unlock/', {}, format='json')
        self.assertEqual(resp.status_code, 403)
        self.assertTrue(Lead.objects.get(id='ST-ASGN').is_locked)

    def test_owner_can_unlock(self):
        self.staff_lock_lead()
        self.client.force_authenticate(self.staff)
        resp = self.client.post('/api/transactions/leads/ST-ASGN/unlock/', {}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data['isLocked'])
        # After unlock, a manager can reassign again.
        self.client.force_authenticate(self.manager)
        resp = self.client.patch('/api/transactions/leads/ST-ASGN/', {
            'assigned_to': 'Other S',
        }, format='json')
        self.assertEqual(resp.status_code, 200)

    def test_staff_cannot_lock_lead_not_assigned_to_them(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.post('/api/transactions/leads/ST-OTH/lock/', {}, format='json')
        self.assertEqual(resp.status_code, 404)

    def test_manager_cannot_lock_others_lead(self):
        self.client.force_authenticate(self.manager)
        resp = self.client.post('/api/transactions/leads/ST-ASGN/lock/', {}, format='json')
        self.assertEqual(resp.status_code, 403)

    def staff_lock_lead(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.post('/api/transactions/leads/ST-ASGN/lock/', {}, format='json')
        self.assertEqual(resp.status_code, 200)


class QuotationAcceptanceConfirmationTests(APITestCase):
    """Accepting a quotation automatically emails the client a confirmation."""

    def setUp(self):
        company = make_company('ConfirmCo')
        self.company = company
        self.lead = make_raw_lead(company, 'Confirm Ltd', assigned_to='Confirmer')
        self.lead.status = Lead.STATUS_QUOTATION
        self.lead.save(update_fields=['status', 'updated_at'])
        self.quotation = Quotation.objects.create(
            id='Q-CONFIRM', lead_id=self.lead.id, company='Confirm Ltd',
            tenant=company, customer='Confirm Person', email='client@confirm.com',
            status='Sent to Client', client_status=Quotation.CLIENT_PENDING,
            client_token='tok-confirm', mobile='9447000000',
            total='10000', net_amount='10000', date='2026-09-10',
        )

    def test_accept_sends_confirmation_email(self):
        import types
        from unittest.mock import patch

        sent = {}

        def fake_send(fail_silently=True):
            sent['called'] = True
            return 1

        fake_email = types.SimpleNamespace(send=fake_send)
        with patch(
            'transactions.views.build_quotation_accepted_email',
            return_value=fake_email,
        ) as builder:
            resp = self.client.post(
                '/api/transactions/public/quotations/tok-confirm/respond/',
                {'decision': 'accept', 'message': ''}, format='json',
            )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(sent.get('called'))
        self.assertTrue(builder.called)

    def test_accept_creates_order_and_client_detail(self):
        from unittest.mock import patch

        self.client.force_authenticate(None)
        with patch('transactions.views.build_quotation_accepted_email') as builder:
            resp = self.client.post(
                '/api/transactions/public/quotations/tok-confirm/respond/',
                {'decision': 'accept', 'message': ''}, format='json',
            )
        self.assertEqual(resp.status_code, 200)
        order = Order.objects.filter(lead_id=self.lead.id).first()
        self.assertIsNotNone(order)
        self.assertEqual(order.email, 'client@confirm.com')
        # The confirmed deal is recorded in Client Details immediately; no
        # separate order "accept" step is required.
        record = ClientDetail.objects.filter(order_no=order.id).first()
        self.assertIsNotNone(record)
        self.assertEqual(record.company, 'Confirm Ltd')
        self.assertEqual(record.client_name, 'Confirm Person')
        self.lead.refresh_from_db()
        self.assertEqual(self.lead.status, Lead.STATUS_ORDER)

    def test_confirmation_email_has_no_attachment(self):
        from transactions.services import build_quotation_accepted_email

        email = build_quotation_accepted_email(self.quotation)
        self.assertEqual(email.attachments, [])
        self.assertIn(self.quotation.id, email.subject)

    def test_decline_does_not_send_confirmation(self):
        from unittest.mock import patch

        with patch('transactions.views.build_quotation_accepted_email') as builder:
            resp = self.client.post(
                '/api/transactions/public/quotations/tok-confirm/respond/',
                {'decision': 'decline', 'message': ''}, format='json',
            )
        self.assertEqual(resp.status_code, 200)
        builder.assert_not_called()


