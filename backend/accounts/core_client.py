"""Thin client for the SystemSoft Core identity service.

LEADS no longer stores credentials itself: registration, login, token refresh,
logout and the password flows are all delegated to Core over HTTP. Core is the
single source of truth for identities and passwords.

Server-to-server writes (creating staff, granting/updating LEADS access,
patching identities) authenticate with a Core ``ServiceApp`` credential when
``CORE_API_KEY`` is configured, falling back to the caller's Bearer token.
Every write passes the acting human (``actor``) along via ``X-Actor-*`` headers
so Core's audit trail can attribute changes to the real user.
"""

import requests
from django.conf import settings


class CoreError(Exception):
    """Raised when Core returns an error or is unreachable."""

    def __init__(self, status_code, data=None, message=''):
        self.status_code = status_code
        self.data = data
        self.message = message or self._extract(data)
        super().__init__(self.message)

    @staticmethod
    def _extract(data):
        if isinstance(data, str):
            return data
        if isinstance(data, dict):
            detail = data.get('detail')
            if detail:
                return detail if isinstance(detail, str) else str(detail)
            for key, val in data.items():
                if isinstance(val, list) and val:
                    return f'{key}: {val[0]}'
                if isinstance(val, str):
                    return f'{key}: {val}'
        return 'Authentication service error.'


def bearer_token(request):
    """Return the raw Bearer token from the incoming request, if any."""
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if auth.lower().startswith('bearer '):
        return auth[7:].strip()
    return None


def _url(path):
    return f'{settings.CORE_API_URL}{path}'


def _actor_headers(actor):
    """Headers that carry the acting human for Core's audit trail."""
    if actor is None:
        return {}
    headers = {}
    actor_id = getattr(actor, 'core_user_id', None)
    if actor_id is not None:
        headers['X-Actor-User-Id'] = str(actor_id)
    email = getattr(actor, 'email', '') or ''
    name = getattr(actor, 'name', '') or ''
    if email:
        headers['X-Actor-Email'] = email
    if name:
        headers['X-Actor-Name'] = name
    return headers


def _request(method, path, *, json=None, access=None, api_key=None, actor=None, timeout=15):
    headers = {'X-Request-Source': 'leads'}
    if actor is not None:
        headers.update(_actor_headers(actor))
    # Prefer the machine ServiceApp credential so writes never depend on a
    # specific human's token role/validity; the actor is passed separately.
    if api_key:
        headers['Authorization'] = f'Api-Key {api_key}'
    elif access:
        headers['Authorization'] = f'Bearer {access}'
    try:
        resp = requests.request(method, _url(path), json=json, headers=headers, timeout=timeout)
    except requests.RequestException as exc:
        raise CoreError(503, message=f'Unable to reach the authentication service: {exc}')
    if resp.status_code >= 400:
        try:
            data = resp.json()
        except ValueError:
            data = None
        raise CoreError(resp.status_code, data)
    if resp.status_code == 204 or not resp.content:
        return None
    try:
        return resp.json()
    except ValueError:
        return None


def _server_key():
    """Return the configured ServiceApp credential, if any."""
    return getattr(settings, 'CORE_API_KEY', '') or ''


# --- Auth flow ---------------------------------------------------------------

def login(email, password):
    return _request('POST', '/api/auth/token/', json={'email': email, 'password': password})


def register_user(email, name, phone, password):
    return _request(
        'POST',
        '/api/v1/users/',
        json={'email': email, 'name': name or '', 'phone': phone or '', 'password': password},
    )


def refresh(refresh_token):
    return _request('POST', '/api/auth/token/refresh/', json={'refresh': refresh_token})


def logout(refresh_token):
    return _request('POST', '/api/auth/logout/', json={'refresh': refresh_token})


def logout_all(access):
    return _request('POST', '/api/auth/logout-all/', json={}, access=access)


def change_password(access, old_password, new_password):
    return _request(
        'POST',
        '/api/auth/change-password/',
        json={'old_password': old_password, 'new_password': new_password},
        access=access,
    )


def password_reset_request(email):
    return _request('POST', '/api/auth/password-reset/request/', json={'email': email})


def password_reset_confirm(email, token, new_password):
    return _request(
        'POST',
        '/api/auth/password-reset/confirm/',
        json={'email': email, 'token': token, 'new_password': new_password},
    )


# --- Organizations & membership ---------------------------------------------

def create_organization(name, access=None, api_key=None):
    return _request(
        'POST',
        '/api/v1/organizations/',
        json={'name': name},
        access=access,
        api_key=api_key or _server_key(),
    )


def create_membership(core_user_id, core_org_id, access=None, api_key=None, role='member'):
    return _request(
        'POST',
        '/api/v1/memberships/',
        json={
            'user': core_user_id,
            'organization': core_org_id,
            'role': role,
            'status': 'active',
        },
        access=access,
        api_key=api_key or _server_key(),
    )


def get_organization(org_id, access=None, api_key=None):
    try:
        if access:
            return _request('GET', f'/api/v1/organizations/{org_id}/', access=access)
        return _request('GET', f'/api/v1/organizations/{org_id}/', api_key=api_key or _server_key())
    except CoreError:
        if access and (api_key or _server_key()):
            return _request('GET', f'/api/v1/organizations/{org_id}/', api_key=api_key or _server_key())
        raise


def update_organization(org_id, data, access=None, api_key=None, actor=None):
    try:
        if access:
            return _request('PATCH', f'/api/v1/organizations/{org_id}/', json=data, access=access, actor=actor)
        return _request('PATCH', f'/api/v1/organizations/{org_id}/', json=data, api_key=api_key or _server_key(), actor=actor)
    except CoreError:
        if access and (api_key or _server_key()):
            return _request('PATCH', f'/api/v1/organizations/{org_id}/', json=data, api_key=api_key or _server_key(), actor=actor)
        raise


# --- Identity / staff provisioning -------------------------------------------

def provision_staff_user(email, name, phone, org_id, application_id, role_label='', permissions=None, actor=None, access=None, api_key=None):
    """Create a Core identity WITHOUT a password, add it to the organization,
    and grant it LEADS access.

    Because no password is sent, Core creates the user as inactive with an
    unusable password — it stays locked until a Core admin sets a password.
    Authenticates with the ServiceApp key when configured, otherwise with the
    caller's Bearer token.
    """
    return _request(
        'POST',
        '/api/v1/user-provisioning/',
        json={
            'email': email,
            'name': name or '',
            'phone': phone or '',
            'organization': org_id,
            'accesses': [{
                'application': application_id,
                'role': role_label or '',
                'permissions': permissions or [],
                'status': 'enabled',
            }],
        },
        access=access,
        api_key=api_key or _server_key(),
        actor=actor,
    )


def get_application(code, access=None, api_key=None):
    data = _request(
        'GET',
        f'/api/v1/applications/?code={code}&page_size=20',
        access=access,
        api_key=api_key or _server_key(),
    )
    return (data.get('results') or [{}])[0] if data else None


def list_org_users(org_id, access=None, api_key=None):
    """Return every member of an organization (paginated)."""
    page = 1
    results = []
    while True:
        data = _request(
            'GET',
            f'/api/v1/users/?organization_id={org_id}&page_size=200&page={page}',
            access=access,
            api_key=api_key or _server_key(),
        )
        results.extend(data.get('results') or [])
        if not data.get('next'):
            break
        page += 1
    return results


def list_user_access(org_id, application_id, user_id=None, access=None, api_key=None):
    query = f'organization={org_id}&application={application_id}&page_size=200'
    if user_id is not None:
        query += f'&user={user_id}'
    data = _request(
        'GET',
        f'/api/v1/user-application-access/?{query}',
        access=access,
        api_key=api_key or _server_key(),
    )
    return data.get('results') or [] if data else []


def create_user_access(org_id, user_id, application_id, role_label='', permissions=None, status='enabled', actor=None, access=None, api_key=None):
    return _request(
        'POST',
        '/api/v1/user-application-access/',
        json={
            'user': user_id,
            'organization': org_id,
            'application': application_id,
            'role': role_label or '',
            'permissions': permissions or [],
            'status': status,
        },
        access=access,
        api_key=api_key or _server_key(),
        actor=actor,
    )


def update_user_access(access_id, role=None, permissions=None, status=None, actor=None, access=None, api_key=None):
    payload = {}
    if role is not None:
        payload['role'] = role
    if permissions is not None:
        payload['permissions'] = permissions
    if status is not None:
        payload['status'] = status
    return _request(
        'PATCH',
        f'/api/v1/user-application-access/{access_id}/',
        json=payload,
        access=access,
        api_key=api_key or _server_key(),
        actor=actor,
    )


def patch_user(core_user_id, data, access=None, actor=None, api_key=None):
    return _request(
        'PATCH',
        f'/api/v1/users/{core_user_id}/',
        json=data,
        access=access,
        api_key=api_key or _server_key(),
        actor=actor,
    )


def get_user(core_user_id, access=None, api_key=None):
    return _request(
        'GET',
        f'/api/v1/users/{core_user_id}/',
        access=access,
        api_key=api_key or _server_key(),
    )