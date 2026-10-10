"""Bidirectional staff sync between LEADS and SystemSoft Core.

* ``sync_staff_from_core`` — on every staff-list request, pull the org's Core
  members who hold LEADS access and upsert the local ``accounts.User`` rows so
  the employee list mirrors SystemSoft User Management.
* ``push_access_to_core`` / ``sync_role_permissions_to_core`` — push LEADS side
  changes (role assignment, permission edits, activation) back to the Core
  ``UserApplicationAccess`` record, so a change in either app reflects in the
  other.
"""

import logging

from django.conf import settings

from . import core_client
from .core_client import CoreError

logger = logging.getLogger(__name__)


def _app_code():
    return getattr(settings, 'CORE_APP_CODE', 'leads')


def _role_for_label(company, label):
    """The company role whose name matches a Core access role label."""
    from .models import Role

    label = (label or '').strip()
    if label:
        role = Role.objects.filter(company=company, name__iexact=label).first()
        if role is not None:
            return role
    return Role.objects.filter(company=company, code='staff').first()


def _leads_access(access_entries):
    for entry in access_entries or []:
        if entry.get('application_code') == _app_code():
            return entry
    return None


def list_leads_staff_from_core(company, access=None):
    """Return Core user dicts that hold LEADS access in the company's org."""
    if company is None or not company.core_org_id:
        return []
    return core_client.list_org_users(company.core_org_id, access=access)


def sync_staff_from_core(company, access=None):
    """Mirror SystemSoft's granted LEADS staff into the local user table.

    Upserts every org member who holds a LEADS grant; ``is_active`` is set only
    when the SystemSoft identity is active AND the LEADS grant is enabled.
    Users without a current grant (or without a Core link) are marked inactive
    so the Active list matches SystemSoft — rows are never deleted so historical
    lead attribution is preserved.

    Returns ``(matched, ok)`` where ``ok`` is False when Core could not be
    reached at all (missing credential / wrong org / server down).
    """
    from .models import User

    if company is None or not company.core_org_id:
        return 0, True

    try:
        core_users = list_leads_staff_from_core(company, access=access)
    except CoreError:
        logger.warning('Leads: could not fetch Core users for org %s', company.core_org_id)
        return 0, False

    matched = 0
    granted_core_ids = set()
    for core_user in core_users:
        access = _leads_access(core_user.get('access'))
        if access is None:
            continue
        core_user_id = core_user.get('id')
        email = (core_user.get('email') or '').strip().lower()
        if not core_user_id or not email:
            continue

        user = User.objects.filter(core_user_id=core_user_id).first()
        if user is None:
            user = User.objects.filter(email__iexact=email).first()

        # Never steal a user owned by another company.
        if user is not None and user.company_id is not None and user.company_id != company.pk:
            continue
        granted_core_ids.add(core_user_id)

        name = (core_user.get('name') or email.split('@')[0] or f'User {core_user_id}').strip()
        phone = (core_user.get('phone') or '').strip()
        # Active in LEADS = SystemSoft identity active AND the LEADS access grant
        # is enabled. ``deny_leads_access`` (the LEADS-local deactivation) is
        # never changed here so a LEADS deactivation persists while the
        # identity stays active.
        is_active = bool(
            core_user.get('status') == 'active'
            and access.get('status') == 'enabled'
        )
        role = _role_for_label(company, access.get('role'))
        fields = {
            'name': name,
            'phone': phone,
            'is_active': is_active,
            'core_user_id': core_user_id,
            'role': role,
        }

        if user is None:
            user = User.objects.create_user(
                email=email,
                password=None,
                company=company,
                core_user_id=core_user_id,
                name=name,
                phone=phone,
                role=role,
                is_active=is_active,
            )
        else:
            changed = False
            if user.core_user_id != core_user_id:
                user.core_user_id = core_user_id
                changed = True
            if user.company_id is None:
                user.company = company
                changed = True
            for field, value in fields.items():
                if field in ('core_user_id', 'role'):
                    continue
                if getattr(user, field) != value:
                    setattr(user, field, value)
                    changed = True
            if user.role_id is None and role is not None:
                user.role = role
                changed = True
            if changed:
                user.save()
        matched += 1

    # Reconcile: any local company user without a current LEADS grant in the
    # linked org is no longer active in LEADS. Rows are kept (historical lead
    # attribution) but flagged inactive so the Active count matches SystemSoft.
    stale = (
        User.objects
        .filter(company=company, is_active=True)
        .exclude(core_user_id__in=granted_core_ids)
    )
    if stale.exists():
        stale.update(is_active=False)
        logger.info(
            'Leads: marked %d stale staff as inactive for company %r (no LEADS grant in Core).',
            stale.count(), company.name,
        )
    return matched, True


def _application_id(access=None):
    """Best-effort lookup of the LEADS application id in Core."""
    try:
        app = core_client.get_application(_app_code(), access=access)
    except CoreError:
        logger.warning('Leads: could not look up the LEADS application in Core.')
        return None
    return app.get('id') if app else None


def provision_staff(company, email, name, phone, role, actor=None, access=None):
    """Create a Core identity (no password, inactive) + LEADS access.

    Returns the Core payload (the ``UserWithAccessSerializer`` shape) or None
    when the company is not linked to a Core organization or the LEADS app is
    not subscribed there.
    """
    if company is None or not company.core_org_id:
        return None
    application_id = _application_id(access=access)
    if application_id is None:
        return None
    role_label = role.name if role else ''
    permissions = sorted(role.permission_names) if role else []
    return core_client.provision_staff_user(
        email,
        name,
        phone,
        company.core_org_id,
        application_id,
        role_label=role_label,
        permissions=permissions,
        actor=actor,
        access=access,
    )


def _user_role_plan(user, fallback_role='', fallback_permissions=None):
    """Role label + permission keys Core should store for a local user."""
    if user.role_id:
        return user.role.name, sorted(user.role.permission_names)
    return fallback_role, sorted(fallback_permissions or [])


def push_access_to_core(user, actor=None, fallback_role='', fallback_permissions=None, access=None):
    """Idempotently mirror a local user's role/permissions to Core LEADS access.

    Returns True when the access record was created or updated, False when the
    user lacks the required Core links. On deactivation the access status is
    set to ``disabled`` (the Core identity itself stays active).
    """
    company = getattr(user, 'company', None)
    if user.core_user_id is None or company is None or not company.core_org_id:
        return False
    try:
        application_id = _application_id(access=access)
        if application_id is None:
            return False
        role_label, permissions = _user_role_plan(user, fallback_role, fallback_permissions)
        records = core_client.list_user_access(
            company.core_org_id, application_id, user.core_user_id, access=access
        )
        # The LEADS app-grant status follows the LEADS-local flag only. The
        # SystemSoft identity status is untouched (owned by SystemSoft).
        status = 'disabled' if user.deny_leads_access else 'enabled'
        if records:
            core_client.update_user_access(
                records[0]['id'],
                role=role_label,
                permissions=permissions,
                status=status,
                actor=actor,
                access=access,
            )
        else:
            core_client.create_user_access(
                company.core_org_id,
                user.core_user_id,
                application_id,
                role_label=role_label,
                permissions=permissions,
                status=status,
                actor=actor,
                access=access,
            )
        return True
    except CoreError:
        logger.exception('Leads: failed to push access for user %s', user.pk)
        return False


def sync_role_permissions_to_core(company, role, actor=None, access=None):
    """Push a role's (possibly edited) permissions to every staff holding it.

    Called from the Roles & Permissions screen so permission edits made in
    LEADS are reflected in Core for all affected users.
    """
    from .models import User

    if company is None or not company.core_org_id:
        return 0
    updated = 0
    for user in User.objects.filter(company=company, role=role):
        if user.core_user_id is None:
            continue
        if push_access_to_core(user, actor=actor, access=access):
            updated += 1
    return updated