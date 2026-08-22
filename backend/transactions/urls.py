from django.urls import path

from .views import (
    LeadAssignView,
    LeadDetailView,
    LeadListView,
    QuotationView,
)

urlpatterns = [
    path('leads/', LeadListView.as_view(), name='transactions-leads-list'),
    path('leads/assign/', LeadAssignView.as_view(), name='transactions-leads-assign'),
    path('leads/<pk>/', LeadDetailView.as_view(), name='transactions-lead-detail'),
    path('quotations/<lead_id>/', QuotationView.as_view(), name='transactions-quotation-detail'),
]