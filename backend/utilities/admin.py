from django.contrib import admin

from .models import Notification, StaffTarget


@admin.register(StaffTarget)
class StaffTargetAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'raw_leads_target', 'calls_target', 'quotation_target', 'sales_target')
    search_fields = ('name', 'role')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('type', 'title', 'time', 'read', 'created_at')
    list_filter = ('type', 'read')
    search_fields = ('title', 'message')