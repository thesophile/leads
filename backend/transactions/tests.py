from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from transactions.models import (
    CallHistory,
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

    def test_staff_sees_all_company_raw_leads(self):
        # Raw data is public within the company for staff with view_raw_all.
        self.client.force_authenticate(self.shanu)
        resp = self.client.get('/api/transactions/leads/?status=raw')
        self.assertEqual({l['id'] for l in resp.data}, {'RL-1', 'RL-2'})

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
        self.client.force_authenticate(self.shanu)
        resp = self.client.patch('/api/transactions/leads/TC-1/', {
            'assigned_to': 'Ghost User',
        }, format='json')
        self.assertEqual(resp.status_code, 400)
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

        Category.objects.get_or_create(name='Hospital')
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
        self.client.force_authenticate(self.staff)
        resp = self.client.post('/api/transactions/proposal-templates/', {
            'name': 'My Tpl', 'scopeHtml': '<p>x</p>',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['owner'], self.staff.id)

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
            role=company.roles.get(code='staff'), company=company,
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
        self.client.force_authenticate(self.staff)
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

    def test_public_page_and_response_flow(self):
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

        # Accept the order.
        self.client.force_authenticate(None)
        resp = self.client.post(
            f'/api/transactions/public/orders/{token}/respond/',
            {'decision': 'accept', 'message': 'Looks good, proceed'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['clientStatus'], 'Accepted')
        self.assertEqual(resp.data['status'], 'Accepted')
        order = Order.objects.get(id=self.order.id)
        self.assertEqual(order.status, 'Accepted')
        self.assertEqual(order.client_message, 'Looks good, proceed')
        self.assertIsNotNone(order.client_responded_at)
        # Token is revoked: link is gone and re-respond is blocked.
        self.assertEqual(order.client_token, '')

        self.client.force_authenticate(None)
        resp = self.client.post(
            f'/api/transactions/public/orders/{token}/respond/',
            {'decision': 'accept', 'message': ''},
            format='json',
        )
        # The single-use link is revoked: it no longer resolves.
        self.assertEqual(resp.status_code, 404)
        self.client.force_authenticate(None)
        resp = self.client.get(f'/api/transactions/public/orders/{token}/')
        self.assertEqual(resp.status_code, 404)

    def test_public_response_can_decline(self):
        self.client.force_authenticate(self.manager)
        self.client.post(self.send_url, {'channels': ['whatsapp'], 'origin': 'https://app.test'}, format='json')
        token = Order.objects.get(id=self.order.id).client_token
        self.client.force_authenticate(None)
        resp = self.client.post(
            f'/api/transactions/public/orders/{token}/respond/',
            {'decision': 'decline', 'message': ''},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Order.objects.get(id=self.order.id).status, 'Rejected')

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