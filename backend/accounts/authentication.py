from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.settings import api_settings

from .models import User


class CoreJWTAuthentication(JWTAuthentication):
    """Authenticate requests using JWTs issued by SystemSoft Core.

    The token is validated locally with the shared signing key. Its subject
    claim carries the Core user id, which is mapped to the linked local
    ``accounts.User`` through ``core_user_id``.
    """

    def get_user(self, validated_token):
        core_user_id = validated_token.get(api_settings.USER_ID_CLAIM)
        if core_user_id is None:
            raise AuthenticationFailed('Token contained no recognizable user identification.')
        try:
            user = User.objects.get(core_user_id=core_user_id)
        except User.DoesNotExist:
            raise AuthenticationFailed('No LEADS account is linked to this user.')
        if not user.is_active:
            raise AuthenticationFailed('User is inactive.', code='user_inactive')
        return user
