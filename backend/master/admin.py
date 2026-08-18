from django.contrib import admin

from common.admin import CompanyScopedAdminMixin

from .models import Branch, Category, Source, Staff


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')


@admin.register(Source)
class SourceAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')


@admin.register(Branch)
class BranchAdmin(CompanyScopedAdminMixin, admin.ModelAdmin):
    list_display = ('code', 'name', 'company')


@admin.register(Staff)
class StaffAdmin(CompanyScopedAdminMixin, admin.ModelAdmin):
    company_field = 'user__company'
    list_display = ('code', 'name', 'role', 'mobile', 'branch')
    list_filter = ('branch', 'role')
    search_fields = ('name', 'code', 'mobile', 'email')