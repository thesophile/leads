from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from common.admin import CompanyScopedAdminMixin

User = get_user_model()


@admin.register(User)
class UserAdmin(CompanyScopedAdminMixin, DjangoUserAdmin):
    ordering = ['email']
    list_display = ['email', 'name', 'company', 'role', 'is_active', 'is_staff']
    list_filter = ['role', 'is_active', 'is_staff', 'company']
    search_fields = ['email', 'name', 'phone', 'company']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('name', 'phone', 'company', 'role')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'phone', 'company', 'role', 'password1', 'password2'),
        }),
    )

    def get_fieldsets(self, request, obj=None):
        if getattr(request.user, 'is_superuser', False):
            return super().get_fieldsets(request, obj)
        # Non-superusers must not be able to grant superuser, group, or
        # admin-site access to themselves or anyone else.
        return (
            (None, {'fields': ('email', 'password')}),
            ('Personal info', {'fields': ('name', 'phone', 'company', 'role')}),
            ('Permissions', {'fields': ('is_active',)}),
            ('Important dates', {'fields': ('last_login', 'date_joined')}),
        )

    def get_add_fieldsets(self, request, obj=None):
        if getattr(request.user, 'is_superuser', False):
            return super().get_add_fieldsets(request, obj)
        return (
            (None, {
                'classes': ('wide',),
                'fields': ('email', 'name', 'phone', 'company', 'role', 'password1', 'password2'),
            }),
        )

    def save_model(self, request, obj, form, change):
        if not getattr(request.user, 'is_superuser', False):
            obj.company = request.user.company
            obj.is_superuser = False
            obj.is_staff = False
        super().save_model(request, obj, form, change)
