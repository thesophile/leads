"""Role-based access control catalog: the full set of available permissions.

The catalog is the single source of truth for the permission checkboxes in the
"Roles & Permissions" UI. Permissions are stored on each company's roles as a
list of these keys and evaluated via ``User.has_permission(key)``.
"""

PERMISSION_GROUPS = [
    {
        'key': 'leads',
        'label': 'Leads (Raw Data)',
        'permissions': [
            ('leads.view', 'View leads'),
            ('leads.view_all', 'View all company leads'),
            ('leads.view_raw_all', 'View all raw leads'),
            ('leads.create', 'Add leads'),
            ('leads.edit_own', 'Edit own leads'),
            ('leads.edit_all', 'Edit any company lead'),
            ('leads.delete', 'Delete own leads'),
            ('leads.delete_all', 'Delete any company lead'),
            ('leads.assign', 'Assign leads to staff'),
        ],
    },
    {
        'key': 'telecall',
        'label': 'Tele Call',
        'permissions': [
            ('telecall.view', 'View tele-call list'),
            ('telecall.create', 'Add tele-call entries'),
            ('telecall.edit', 'Edit tele-call entries'),
            ('telecall.assign', 'Assign tele-call tasks to staff'),
        ],
    },
    {
        'key': 'quotation',
        'label': 'Quotations',
        'permissions': [
            ('quotation.view', 'View quotations'),
            ('quotation.create', 'Create quotations'),
            ('quotation.edit', 'Edit quotations'),
            ('quotation.send', 'Send quotations'),
            ('quotation.approve', 'Approve / reject quotations'),
        ],
    },
    {
        'key': 'order',
        'label': 'Orders',
        'permissions': [
            ('order.view', 'View orders'),
            ('order.create', 'Create orders'),
            ('order.edit', 'Edit orders'),
            ('order.delete', 'Delete orders'),
        ],
    },
    {
        'key': 'client',
        'label': 'Client Details',
        'permissions': [
            ('client.view', 'View client details'),
            ('client.create', 'Add client details'),
            ('client.edit', 'Edit client details'),
        ],
    },
    {
        'key': 'master',
        'label': 'Master Data',
        'permissions': [
            ('branch.view', 'View branches'),
            ('branch.manage', 'Add / edit / delete branches'),
            ('category.view', 'View categories'),
            ('category.manage', 'Add / edit / delete categories'),
            ('source.view', 'View sources'),
            ('source.manage', 'Add / edit / delete sources'),
            ('company.view', 'View company profile'),
            ('company.edit', 'Edit company profile'),
        ],
    },
    {
        'key': 'staff',
        'label': 'Staff & Roles',
        'permissions': [
            ('staff.view', 'View staff list'),
            ('staff.manage', 'Add / edit / delete staff & reset passwords'),
            ('roles.manage', 'Manage roles & permissions'),
        ],
    },
    {
        'key': 'reports',
        'label': 'Reports',
        'permissions': [
            ('reports.view', 'View report registers'),
            ('reports.export', 'Export report data'),
        ],
    },
]

FLAT_PERMISSIONS = sorted({key for group in PERMISSION_GROUPS for key, _ in group['permissions']})

DEFAULT_ROLE_PERMISSIONS = {
    'admin': FLAT_PERMISSIONS,
    'manager': [
        'leads.view', 'leads.view_all', 'leads.create',
        'leads.edit_own', 'leads.edit_all', 'leads.delete', 'leads.assign',
        'telecall.view', 'telecall.create', 'telecall.edit', 'telecall.assign',
        'quotation.view', 'quotation.create', 'quotation.edit', 'quotation.send', 'quotation.approve',
        'order.view', 'order.create', 'order.edit', 'order.delete',
        'client.view', 'client.create', 'client.edit',
        'branch.view', 'category.view', 'source.view', 'company.view',
        'staff.view', 'staff.manage',
        'reports.view', 'reports.export',
    ],
    'staff': [
        'leads.view', 'leads.view_raw_all', 'leads.create', 'leads.edit_own', 'leads.delete',
        'telecall.view',
        'quotation.view', 'quotation.create', 'quotation.edit',
        'client.view',
        'branch.view', 'category.view', 'source.view', 'company.view',
        'reports.view',
    ],
}

ROLE_TEMPLATES = [
    {
        'code': 'admin',
        'name': 'Admin',
        'permissions': DEFAULT_ROLE_PERMISSIONS['admin'],
        'is_system': True,
    },
    {
        'code': 'manager',
        'name': 'Manager',
        'permissions': DEFAULT_ROLE_PERMISSIONS['manager'],
        'is_system': False,
    },
    {
        'code': 'staff',
        'name': 'Staff',
        'permissions': DEFAULT_ROLE_PERMISSIONS['staff'],
        'is_system': False,
    },
]

# Legacy role values folded into the new role set (data migration only).
LEGACY_ROLE_MAP = {
    'admin': 'admin',
    'manager': 'manager',
    'bd': 'staff',
    'telecaller': 'staff',
    'accounts': 'staff',
    'staff': 'staff',
}


def seed_default_roles(company):
    """Create the built-in admin/manager/staff roles for a company."""
    from .models import Role

    created = []
    for template in ROLE_TEMPLATES:
        role, created_now = Role.objects.get_or_create(
            company=company,
            code=template['code'],
            defaults={
                'name': template['name'],
                'permissions': template['permissions'],
                'is_system': template['is_system'],
            },
        )
        created.append(role)
    return created