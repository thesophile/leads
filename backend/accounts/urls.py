from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ChangePasswordView,
    CompanyDetailView,
    LoginView,
    LogoutView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    StaffDetailView,
    StaffListView,
    StaffResetPasswordView,
    SuperuserAdminDetailView,
    SuperuserAdminListView,
    SuperuserAdminResetPasswordView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('company/', CompanyDetailView.as_view(), name='auth-company'),
    path('change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='auth-password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='auth-password-reset-confirm'),
    path('token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('users/', StaffListView.as_view(), name='auth-users-list'),
    path('users/<int:pk>/', StaffDetailView.as_view(), name='auth-user-detail'),
    path('users/<int:pk>/reset-password/', StaffResetPasswordView.as_view(), name='auth-user-reset-password'),
    path('admins/', SuperuserAdminListView.as_view(), name='auth-admins-list'),
    path('admins/<int:pk>/', SuperuserAdminDetailView.as_view(), name='auth-admin-detail'),
    path('admins/<int:pk>/reset-password/', SuperuserAdminResetPasswordView.as_view(), name='auth-admin-reset-password'),
]
