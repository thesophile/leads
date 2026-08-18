from django.contrib import admin

from .models import (
    Attachment,
    CallHistory,
    ClientDetail,
    Order,
    ProposalTemplate,
    Quotation,
    RawLead,
    TelecallLead,
)


class CallHistoryInline(admin.TabularInline):
    model = CallHistory
    extra = 0


@admin.register(ProposalTemplate)
class ProposalTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'default_total', 'default_discount')


@admin.register(RawLead)
class RawLeadAdmin(admin.ModelAdmin):
    list_display = ('id', 'company', 'phone', 'category', 'source', 'date')
    list_filter = ('category', 'source', 'added_by')
    search_fields = ('company', 'contact', 'phone', 'id')


@admin.register(TelecallLead)
class TelecallLeadAdmin(admin.ModelAdmin):
    list_display = ('id', 'company', 'phone', 'assigned_to', 'call_status', 'priority')
    list_filter = ('call_status', 'priority', 'assigned_to')
    search_fields = ('company', 'contact', 'phone', 'id')
    inlines = [CallHistoryInline]


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ('id', 'company', 'customer', 'status', 'net_amount', 'date')
    list_filter = ('status', 'source', 'category')
    search_fields = ('id', 'company', 'customer', 'mobile')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'company', 'customer', 'status', 'net_amount', 'date')
    list_filter = ('status', 'category')
    search_fields = ('id', 'company', 'customer', 'mobile')
    exclude = ('scope', 'details')


@admin.register(ClientDetail)
class ClientDetailAdmin(admin.ModelAdmin):
    list_display = ('id', 'order_no', 'company', 'client_name', 'status', 'accepted_date')
    list_filter = ('status', 'category', 'collected_by')
    search_fields = ('id', 'order_no', 'company', 'client_name')


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ('client_detail', 'name', 'type', 'size')