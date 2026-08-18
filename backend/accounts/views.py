import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .permissions import IsAdmin, IsSuperuser
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
    """Admin self-registration. Always creates an ADMIN/superuser account
    for the registering company's admin."""

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
    """Admin-only: list and create staff accounts for the admin's own company."""

    permission_classes = [IsAdmin]

    def get(self, request):
        users = User.objects.filter(company=request.user.company).order_by('name')
        return Response(UserSerializer(users, many=True).data)

    def post(self, request):
        serializer = StaffCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class StaffDetailView(APIView):
    """Admin-only: update staff of the admin's own company."""

    permission_classes = [IsAdmin]

    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk, company=self.request.user.company)
        except User.DoesNotExist:
            return None

    def patch(self, request, pk):
        user = self.get_object(pk)
        if user is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = StaffUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(user).data)


class StaffResetPasswordView(APIView):
    """Admin-only: set a new password for a staff account in their company."""

    permission_classes = [IsAdmin]

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


class SuperuserAdminListView(APIView):
    """Superuser-only: list and create admin accounts across all companies."""

    permission_classes = [IsSuperuser]

    def get(self, request):
        admins = User.objects.filter(role=User.Role.ADMIN).order_by('name')
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
            return User.objects.get(pk=pk, role=User.Role.ADMIN)
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
            user = User.objects.get(pk=pk, role=User.Role.ADMIN)
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
        company = self.get_object(request)
        if company is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(CompanySerializer(company).data)

    def patch(self, request):
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
