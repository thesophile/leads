from django.contrib import admin

from .models import Branch, Category, Source, Staff


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')


@admin.register(Source)
class SourceAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'role', 'mobile', 'branch')
    list_filter = ('branch', 'role')
    search_fields = ('name', 'code', 'mobile', 'email')