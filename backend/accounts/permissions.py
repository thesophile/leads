from rest_framework.permissions import BasePermission


def can(user, *keys):
    """Check role-based permission keys for an authenticated user.

    Superusers bypass all checks; otherwise at least one of ``keys`` must be
    present in the user's company role permission set.
    """
    if not (user and user.is_authenticated):
        return False
    if user.is_superuser:
        return True
    return any(user.has_permission(k) for k in keys)


def require_permission(*keys):
    """Factory producing DRF permission classes from permission keys.

    Usage: ``permission_classes = [require_permission('staff.manage')]``
    """
    class RolePermission(BasePermission):
        message = 'You do not have permission to perform this action.'

        def has_permission(self, request, view):
            return can(request.user, *keys)

    RolePermission.__name__ = f'HasPermission_{keys[0].replace(".", "_")}'
    return RolePermission


class IsAdmin(BasePermission):
    """Company admin: holds the ``roles.manage`` permission, or a superuser."""

    def has_permission(self, request, view):
        return can(request.user, 'roles.manage')


class IsSuperuser(BasePermission):
    """Allows access only to superusers (platform-level administrators)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_superuser
        )