from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.settings import api_settings


def _app_code():
    return getattr(settings, 'CORE_APP_CODE', 'leads')


def _leases_grants(token):
    """Yield the ``app_access`` entries granted for this application."""
    return [e for e in (token.get('app_access') or []) if e.get('app') == _app_code()]


def _core_permissions(token):
    permissions = []
    for entry in _leases_grants(token):
        permissions.extend(entry.get('permissions') or [])
    return sorted(set(permissions))


def _core_role_name(token):
    for entry in _leases_grants(token):
        if entry.get('role'):
            return entry['role']
    return ''


def _core_org_ids(token):
    return {e.get('org') for e in _leases_grants(token) if e.get('org') is not None}


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

        # Only override local role permissions when the token actually carries
        # central grants; legacy/local tokens have no ``app_access`` claim and
        # must keep using the company role.
        if validated_token.get('app_access') is not None:
            user.core_permissions = set(_core_permissions(validated_token))
        return user

    def _resolve_user(self, token, core_user_id):
        from .models import Company, Role, User

        user = User.objects.filter(core_user_id=core_user_id).first()
        if user is not None:
            self._sync_identity(user, token, Company, Role)
            return user

        email = (token.get('email') or '').strip().lower()
        if email:
            # A local account with this email may already exist (e.g. imported);
            # link it to the Core identity instead of creating a duplicate.
            user = User.objects.filter(email__iexact=email).first()
            if user is not None:
                if user.core_user_id is None:
                    user.core_user_id = core_user_id
                self._sync_identity(user, token, Company, Role)
                return user

        company = self._match_company(token, Company)
        role = None
        role_name = _core_role_name(token)
        if company is not None and role_name:
            role = Role.objects.filter(company=company, name__iexact=role_name).first()

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

    def _sync_identity(self, user, token, Company, Role):
        changed = False
        name = token.get('name')
        if name and user.name != name:
            user.name = name
            changed = True
        if user.company_id is None:
            company = self._match_company(token, Company)
            if company is not None:
                user.company = company
                changed = True
        role_name = _core_role_name(token)
        if user.role_id is None and user.company_id and role_name:
            role = Role.objects.filter(company_id=user.company_id, name__iexact=role_name).first()
            if role is not None:
                user.role = role
                changed = True
        if changed:
            user.save()

    @staticmethod
    def _match_company(token, Company):
        org_ids = _core_org_ids(token)
        if not org_ids:
            return None
        return Company.objects.filter(core_org_id__in=org_ids).first()
