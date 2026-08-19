from django.contrib import admin
from django.core.exceptions import ValidationError
from django import forms

from common.admin import CompanyScopedAdminMixin

from .models import Branch, Category, Source, Staff


class BranchAdminForm(forms.ModelForm):
    class Meta:
        model = Branch
        fields = '__all__'

    def clean(self):
        cleaned = super().clean()
        company = cleaned.get('company')
        if company is None:
            raise ValidationError({'company': 'A company is required for a branch.'})
        return cleaned


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')


@admin.register(Source)
class SourceAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')


@admin.register(Branch)
class BranchAdmin(CompanyScopedAdminMixin, admin.ModelAdmin):
    form = BranchAdminForm
    list_display = ('code', 'name', 'address', 'company')
    search_fields = ('name', 'code', 'address')


@admin.register(Staff)
class StaffAdmin(CompanyScopedAdminMixin, admin.ModelAdmin):
    company_field = 'user__company'
    list_display = ('code', 'name', 'role', 'mobile', 'branch')
    list_filter = ('branch', 'role')
    search_fields = ('name', 'code', 'mobile', 'email')