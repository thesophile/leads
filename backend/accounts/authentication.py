import time

from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.settings import api_settings

from . import core_client
from .core_client import CoreError


def _app_code():
    return getattr(settings, 'CORE_APP_CODE', 'leads')


def _leases_grants(token):
    """Yield the ``app_access`` entries granted for this application."""
    return [e for e in (token.get('app_access') or []) if e.get('app') == _app_code()]


def _core_permissions(token):
    permissions = []
    for entry in _leases_grants(token):
        perms = entry.get('permissions') or []
        if not perms and (entry.get('role') or '').lower() == 'admin':
            from .rbac import FLAT_PERMISSIONS
            perms = FLAT_PERMISSIONS
        permissions.extend(perms)
    return sorted(set(permissions))


def _core_role_name(token):
    for entry in _leases_grants(token):
        if entry.get('role'):
            return entry['role']
    return ''


def _core_org_ids(token):
    return {e.get('org') for e in _leases_grants(token) if e.get('org') is not None}


# Cache of each user's current SystemSoft profile so a deactivation is enforced
# promptly without a Core round-trip on every request. Keyed by Core user id,
# value is (expires_at, profile) where profile is the Core user payload or None
# when Core was unreachable on the last probe (fail-open).
_CORE_STATUS_TTL = 30
_CORE_STATUS_CACHE = {}


def _core_profile(core_user_id, bearer):
    """Return the user's Core profile, cached for a short window (or None)."""
    now = time.time()
    cached = _CORE_STATUS_CACHE.get(core_user_id)
    if cached and cached[0] > now:
        return cached[1]
    profile = None
    try:
        profile = core_client.get_user(core_user_id, access=bearer)
    except CoreError:
        pass  # fail open: a Core outage must not lock users out
    _CORE_STATUS_CACHE[core_user_id] = (now + _CORE_STATUS_TTL, profile)
    return profile


def _should_be_active(core_user_data):
    """Whether a Core user record still entitles the user to this application.

    True only when the Core identity is active AND there is an enabled LEADS
    access grant (SystemSoft deactivation and LEADS-side access revocation both
    therefore evaluate to False).
    """
    if not core_user_data or core_user_data.get('status') != 'active':
        return False
    for entry in core_user_data.get('access') or []:
        if (
            entry.get('application_code') == _app_code()
            and entry.get('status') == 'enabled'
        ):
            return True
    return False


class CoreJWTAuthentication(JWTAuthentication):
    """Authenticate requests using JWTs issued by SystemSoft Core.

    The token is validated locally with the shared signing key. Its subject
    claim carries the Core user id, mapped to the linked local ``accounts.User``
    through ``core_user_id``. Users provisioned centrally in Core are linked (or
    created) on first authenticated request, and their centrally-assigned
    permissions are attached so the RBAC checks enforce Core's grants.
    """

    def get_user(self, validated_token):
        core_user_id = validated_token.get(api_settings.USER_ID_CLAIM)
        if core_user_id is None:
            raise AuthenticationFailed('Token contained no recognizable user identification.')

        app_code = _app_code()
        enabled_apps = validated_token.get('enabled_apps')
        if enabled_apps is not None and app_code not in enabled_apps:
            raise AuthenticationFailed(
                f'You do not have access to {app_code}.', code='no_app_access',
            )

        user = self._resolve_user(validated_token, core_user_id)
        if not user.is_active:
            raise AuthenticationFailed('User is inactive.', code='user_inactive')
        # The LEADS Activate/Deactivate switch is local to LEADS and persists
        # even while the SystemSoft identity stays active.
        if user.deny_leads_access:
            raise AuthenticationFailed(
                'Your account has been deactivated in this application.',
                code='user_inactive',
            )

        # Enforce deactivation on existing sessions. Re-check the user's Core
        # state (cached ~30s) using the very token being validated; when Core
        # is unreachable we fail open so an outage does not lock users out.
        profile = _core_profile(core_user_id, str(validated_token))
        if profile is not None:
            if not _should_be_active(profile):
                # Deactivated in SystemSoft, or LEADS access was removed.
                if user.is_active:
                    user.is_active = False
                    user.save(update_fields=['is_active', 'updated_at'])
                raise AuthenticationFailed(
                    'Your account has been deactivated.', code='user_inactive',
                )
            if not user.is_active and not user.deny_leads_access:
                # Reactivated in SystemSoft (and still allowed in LEADS) ->
                # repair the mirrored local state.
                user.is_active = True
                user.save(update_fields=['is_active', 'updated_at'])

        # Only override local role permissions when the token actually carries
        # central grants; legacy/local tokens have no ``app_access`` claim and
        # must keep using the company role.
        if validated_token.get('app_access') is not None:
            user.core_permissions = set(_core_permissions(validated_token))
        return user

    def _resolve_user(self, token, core_user_id):
        from .models import Company, Role, User

        token_str = str(token) if token else None

        user = User.objects.filter(core_user_id=core_user_id).first()
        if user is not None:
            self._sync_identity(user, token, Company, Role, access=token_str)
            return user

        email = (token.get('email') or '').strip().lower()
        if email:
            # A local account with this email may already exist (e.g. imported);
            # link it to the Core identity instead of creating a duplicate.
            user = User.objects.filter(email__iexact=email).first()
            if user is not None:
                if user.core_user_id is None:
                    user.core_user_id = core_user_id
                self._sync_identity(user, token, Company, Role, access=token_str)
                return user

        company = self._match_company(token, Company, access=token_str)
        role = None
        role_name = _core_role_name(token)
        if company is not None and role_name:
            role = Role.objects.filter(company=company, name__iexact=role_name).first() or \
                   Role.objects.filter(company=company, code__iexact=role_name).first()

        name = token.get('name') or (email.split('@')[0] if email else f'User {core_user_id}')
        user = User(
            core_user_id=core_user_id,
            email=email or f'core-user-{core_user_id}@localhost',
            name=name,
            company=company,
            role=role,
            is_active=True,
        )
        user.set_unusable_password()
        user.save()
        return user

    def _sync_identity(self, user, token, Company, Role, access=None):
        changed = False
        name = token.get('name')
        if name and user.name != name:
            user.name = name
            changed = True
        token_str = access or (str(token) if token else None)
        if user.company_id is None:
            company = self._match_company(token, Company, access=token_str)
            if company is not None:
                user.company = company
                changed = True
        elif user.company:
            if not user.company.email or not user.company.phone or not user.company.gstin:
                self._sync_company_details(user.company, user.company.core_org_id, access=token_str)

        role_name = _core_role_name(token)
        if user.role_id is None and user.company_id and role_name:
            role = Role.objects.filter(company_id=user.company_id, name__iexact=role_name).first() or \
                   Role.objects.filter(company_id=user.company_id, code__iexact=role_name).first()
            if role is not None:
                user.role = role
                changed = True
        if changed:
            user.save()

    @classmethod
    def _match_company(cls, token, Company, access=None):
        org_ids = _core_org_ids(token)
        if not org_ids:
            return None
        company = Company.objects.filter(core_org_id__in=org_ids).first()
        token_str = access or (str(token) if token else None)

        if company is not None:
            if not company.email or not company.phone or not company.gstin:
                cls._sync_company_details(company, company.core_org_id, access=token_str)
            return company

        org_id = next(iter(org_ids))
        return cls._provision_company_from_core(org_id, Company, access=token_str)

    @classmethod
    def _provision_company_from_core(cls, org_id, Company, access=None):
        org = None
        try:
            org = core_client.get_organization(org_id, access=access)
        except Exception:
            pass

        org_name = ((org.get('name') if org else '') or '').strip() or f'Company {org_id}'
        org_email = ((org.get('email') if org else '') or '').strip()
        org_phone = ((org.get('phone') if org else '') or '').strip()
        org_gstin = ((org.get('gstin') if org else '') or '').strip()

        # Link to an existing unlinked company if one matches by name
        existing = Company.objects.filter(name__iexact=org_name, core_org_id__isnull=True).first()
        if existing:
            existing.core_org_id = org_id
            if not existing.email and org_email:
                existing.email = org_email
            if not existing.phone and org_phone:
                existing.phone = org_phone
            if not existing.gstin and org_gstin:
                existing.gstin = org_gstin
            existing.save()
            return existing

        name = org_name
        if Company.objects.filter(name__iexact=name).exists():
            name = f'{org_name} ({org_id})'

        company = Company.objects.create(
            core_org_id=org_id,
            name=name,
            email=org_email,
            phone=org_phone,
            gstin=org_gstin,
        )
        return company

    @staticmethod
    def _sync_company_details(company, org_id, access=None):
        if not org_id:
            return
        try:
            org = core_client.get_organization(org_id, access=access)
        except Exception:
            return
        if not org or not isinstance(org, dict):
            return
        changed = False
        org_email = (org.get('email') or '').strip()
        org_phone = (org.get('phone') or '').strip()
        org_gstin = (org.get('gstin') or '').strip()
        if not company.email and org_email:
            company.email = org_email
            changed = True
        if not company.phone and org_phone:
            company.phone = org_phone
            changed = True
        if not company.gstin and org_gstin:
            company.gstin = org_gstin
            changed = True
        if changed:
            company.save()
