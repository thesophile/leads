from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allows access only to users with the admin role or superusers."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_superuser or getattr(request.user, 'role', '') == 'admin')
        )


class IsSuperuser(BasePermission):
    """Allows access only to superusers (platform-level administrators)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_superuser
        )
