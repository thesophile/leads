"""Thin client for the SystemSoft Core identity service.

LEADS no longer stores credentials itself: registration, login, token refresh,
logout and the password flows are all delegated to Core over HTTP. Core is the
single source of truth for identities and passwords.
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


def _request(method, path, *, json=None, access=None, timeout=15):
    headers = {}
    if access:
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


def create_organization(name, access):
    return _request('POST', '/api/v1/organizations/', json={'name': name}, access=access)


def create_membership(core_user_id, core_org_id, access, role='member'):
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
    )


def patch_user(core_user_id, data, access=None):
    return _request('PATCH', f'/api/v1/users/{core_user_id}/', json=data, access=access)


def get_user(core_user_id, access=None):
    return _request('GET', f'/api/v1/users/{core_user_id}/', access=access)
