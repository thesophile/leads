from django.contrib import admin

from common.admin import CompanyScopedAdminMixin

from .models import (
    Attachment,
    CallHistory,
    ClientDetail,
    Lead,
    LeadContactHistory,
    Order,
    ProposalTemplate,
    Quotation,
)


class CallHistoryInline(admin.TabularInline):
    model = CallHistory
    extra = 0


class LeadContactHistoryInline(admin.TabularInline):
    model = LeadContactHistory
    extra = 0
    readonly_fields = ('field', 'from_value', 'to_value', 'changed_by', 'stage', 'changed_at')
    can_delete = False


@admin.register(ProposalTemplate)
class ProposalTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'default_total', 'default_discount')


@admin.register(Lead)
class LeadAdmin(CompanyScopedAdminMixin, admin.ModelAdmin):
    company_field = 'tenant'
    list_display = ('id', 'company', 'phone', 'category', 'source', 'status', 'assigned_to', 'call_status')
    list_filter = ('status', 'category', 'source', 'added_by', 'assigned_to', 'call_status')
    search_fields = ('company', 'contact', 'phone', 'id')
    inlines = [CallHistoryInline, LeadContactHistoryInline]


@admin.register(Quotation)
class QuotationAdmin(CompanyScopedAdminMixin, admin.ModelAdmin):
    company_field = 'tenant'
    list_display = ('id', 'company', 'customer', 'status', 'net_amount', 'date')
    list_filter = ('status', 'source', 'category')
    search_fields = ('id', 'company', 'customer', 'mobile')


@admin.register(Order)
class OrderAdmin(CompanyScopedAdminMixin, admin.ModelAdmin):
    company_field = 'tenant'
    list_display = ('id', 'company', 'customer', 'status', 'net_amount', 'date')
    list_filter = ('status', 'category')
    search_fields = ('id', 'company', 'customer', 'mobile')
    exclude = ('scope', 'details')


@admin.register(ClientDetail)
class ClientDetailAdmin(CompanyScopedAdminMixin, admin.ModelAdmin):
    company_field = 'tenant'
    list_display = ('id', 'order_no', 'company', 'client_name', 'status', 'accepted_date')
    list_filter = ('status', 'category', 'collected_by')
    search_fields = ('id', 'order_no', 'company', 'client_name')


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ('client_detail', 'name', 'type', 'size')
