import logging
import re

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .permissions import IsSuperuser, can, require_permission
from .models import Role
from .rbac import FLAT_PERMISSIONS, PERMISSION_GROUPS
from .serializers import (
    AdminManageSerializer,
    AdminRegisterSerializer,
    AdminUpdateSerializer,
    ChangePasswordSerializer,
    CompanySerializer,
    LoginSerializer,
    PasswordResetByAdminSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RoleSerializer,
    StaffCreateSerializer,
    StaffUpdateSerializer,
    UserSerializer,
)

User = get_user_model()

logger = logging.getLogger(__name__)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


class RegisterView(APIView):
    """Company admin self-registration. Creates a staff-level admin (never a
    superuser) for the registering company."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AdminRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'user': UserSerializer(user).data,
            'tokens': get_tokens_for_user(user),
        }, status=status.HTTP_201_CREATED)


class StaffListView(APIView):
    """Role-managers (admin/manager): list and create staff accounts for their
    own company. Creating a staff member requires the 'staff.manage' permission
    on the caller's company role."""

    permission_classes = [require_permission('staff.manage')]

    def get(self, request):
        users = User.objects.filter(company=request.user.company).order_by('name')
        return Response(UserSerializer(users, many=True).data)

    def post(self, request):
        serializer = StaffCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class StaffAssigneeListView(APIView):
    """List assignable staff for the current user's company.

    Used to populate the "Assign Leads to Staff" dropdown. Requires the same
    permission as assignment (``leads.assign`` or ``telecall.assign``).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not can(request.user, 'leads.assign', 'telecall.assign'):
            return Response(
                {'detail': 'You do not have permission to assign leads to staff.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        users = (
            User.objects
            .filter(company=request.user.company)
            .exclude(is_superuser=True)
            .order_by('name')
        )
        return Response([
            {'name': u.name, 'role': (u.role.name if u.role_id else '')}
            for u in users
        ])


class StaffDetailView(APIView):
    """Role-managers (admin/manager): update staff of their own company."""

    permission_classes = [require_permission('staff.manage')]

    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk, company=self.request.user.company)
        except User.DoesNotExist:
            return None

    def patch(self, request, pk):
        user = self.get_object(pk)
        if user is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = StaffUpdateSerializer(user, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(user).data)


class StaffResetPasswordView(APIView):
    """Role-managers (admin/manager): set a new password for staff of their company."""

    permission_classes = [require_permission('staff.manage')]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk, company=request.user.company)
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PasswordResetByAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response({'detail': 'Password updated successfully.'})


class PermissionCatalogView(APIView):
    """Authenticated users: the catalog of every permission the role editor can assign."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(PERMISSION_GROUPS)


class RoleListView(APIView):
    """List company roles (any authenticated user) or create one (roles.manage)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        roles = Role.objects.all() if request.user.is_superuser else Role.objects.filter(company=request.user.company)
        return Response(RoleSerializer(roles.order_by('name'), many=True).data)

    def post(self, request):
        if not can(request.user, 'roles.manage'):
            return Response(
                {'detail': 'You do not have permission to manage roles.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        company = request.user.company
        if company is None:
            return Response(
                {'detail': 'A company is required to create roles.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = str(request.data.get('name', '')).strip()
        if not name:
            return Response({'detail': 'name: This field is required.'}, status=status.HTTP_400_BAD_REQUEST)
        raw_code = str(request.data.get('code', '')).strip().lower()
        code = re.sub(r'[^a-z0-9_]+', '_', raw_code)[:50]
        if not code:
            return Response({'detail': 'code: This field is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if Role.objects.filter(company=company, code=code).exists():
            return Response(
                {'detail': 'A role with this code already exists in your company.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        permissions = request.data.get('permissions', [])
        unknown = set(permissions) - set(FLAT_PERMISSIONS)
        if unknown:
            return Response(
                {'detail': f'Unknown permissions: {sorted(unknown)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        role = Role.objects.create(
            company=company,
            code=code,
            name=name,
            permissions=sorted(set(permissions)),
        )
        return Response(RoleSerializer(role).data, status=status.HTTP_201_CREATED)


class RoleDetailView(APIView):
    """Edit (rename / re-permission) or delete a company role. roles.manage only."""

    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return Role.objects.get(pk=pk, company=self.request.user.company)
        except Role.DoesNotExist:
            return None

    def patch(self, request, pk):
        if not can(request.user, 'roles.manage'):
            return Response(
                {'detail': 'You do not have permission to manage roles.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        role = self.get_object(pk)
        if role is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if role.is_system and 'permissions' in request.data:
            # System admin role keeps the full permission set; only the label can change.
            return Response(
                {"detail": "The system admin role's permissions cannot be changed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = request.data.get('name')
        if name is not None:
            name = name.strip()
            if not name:
                return Response({'detail': 'name: This field may not be blank.'}, status=status.HTTP_400_BAD_REQUEST)
            role.name = name
        permissions = request.data.get('permissions')
        if permissions is not None and not role.is_system:
            unknown = set(permissions) - set(FLAT_PERMISSIONS)
            if unknown:
                return Response(
                    {'detail': f'Unknown permissions: {sorted(unknown)}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            role.permissions = sorted(set(permissions))
        role.save()
        return Response(RoleSerializer(role).data)

    def delete(self, request, pk):
        if not can(request.user, 'roles.manage'):
            return Response(
                {'detail': 'You do not have permission to manage roles.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        role = self.get_object(pk)
        if role is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if role.is_system:
            return Response(
                {'detail': 'The system admin role cannot be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if role.users.exists():
            return Response(
                {'detail': 'This role is assigned to users and cannot be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SuperuserAdminListView(APIView):
    """Superuser-only: list and create admin accounts across all companies."""

    permission_classes = [IsSuperuser]

    def get(self, request):
        admins = User.objects.filter(Q(role__is_system=True) | Q(is_superuser=True)).order_by('name')
        return Response(UserSerializer(admins, many=True).data)

    def post(self, request):
        serializer = AdminManageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class SuperuserAdminDetailView(APIView):
    """Superuser-only: edit, reset password for, or delete an admin account."""

    permission_classes = [IsSuperuser]

    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def patch(self, request, pk):
        user = self.get_object(pk)
        if user is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if user.is_superuser:
            return Response(
                {'detail': 'Platform superadmin accounts cannot be edited here.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = AdminUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(user).data)

    def delete(self, request, pk):
        user = self.get_object(pk)
        if user is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if user.pk == request.user.pk:
            return Response(
                {'detail': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if user.is_superuser:
            return Response(
                {'detail': 'Platform superadmin accounts cannot be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SuperuserAdminResetPasswordView(APIView):
    """Superuser-only: set a new password for an admin in any company."""

    permission_classes = [IsSuperuser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PasswordResetByAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response({'detail': 'Password updated successfully.'})


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        return Response({
            'user': UserSerializer(user).data,
            'tokens': get_tokens_for_user(user),
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except Exception:
                pass  # already revoked or malformed — still log the user out
        return Response({'detail': 'Logged out successfully.'})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class CompanyDetailView(APIView):
    """Authenticated user: view and edit the details of their own company."""

    permission_classes = [IsAuthenticated]

    def get_object(self, request):
        if not getattr(request.user, 'company', None):
            return None
        return request.user.company

    def get(self, request):
        if not can(request.user, 'company.view'):
            return Response(
                {'detail': 'You do not have permission to view the company profile.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        company = self.get_object(request)
        if company is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(CompanySerializer(company).data)

    def patch(self, request):
        if not can(request.user, 'company.edit'):
            return Response(
                {'detail': 'You do not have permission to edit the company profile.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        company = self.get_object(request)
        if company is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CompanySerializer(company, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password changed successfully.'})


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.user  # None if the email doesn't exist (no info leak)
        if user is not None:
            token = default_token_generator.make_token(user)
            try:
                send_mail(
                    subject='LEADS — Password reset code',
                    message=(
                        f'Hi {user.name},\n\n'
                        f'You requested a password reset for {user.email}.\n\n'
                        f'Your one-time reset code is:\n\n    {token}\n\n'
                        f'Enter it on the reset screen along with your new password. '
                        f'The code expires in 1 hour and can only be used once.\n\n'
                        f'If you did not request this, you can safely ignore this email.\n\n'
                        f'— LEADS'
                    ),
                    from_email=None,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception:
                logger.exception('Failed to send password reset email to %s', user.email)
        return Response({'detail': 'If an account exists for this email, a reset code has been sent.'})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response({'detail': 'Password has been reset. You can now sign in.'})
