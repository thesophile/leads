from django.urls import path

from .views import (
    LeadAssignView,
    LeadDetailView,
    LeadListView,
    ProposalDraftView,
    ProposalTemplateDetailView,
    ProposalTemplateListView,
    QuotationView,
)

urlpatterns = [
    path('leads/', LeadListView.as_view(), name='transactions-leads-list'),
    path('leads/assign/', LeadAssignView.as_view(), name='transactions-leads-assign'),
    path('leads/<pk>/', LeadDetailView.as_view(), name='transactions-lead-detail'),
    path('quotations/<lead_id>/', QuotationView.as_view(), name='transactions-quotation-detail'),
    path('proposal-templates/', ProposalTemplateListView.as_view(), name='transactions-proposal-templates'),
    path('proposal-templates/<pk>/', ProposalTemplateDetailView.as_view(), name='transactions-proposal-template'),
    path('proposal-drafts/', ProposalDraftView.as_view(), name='transactions-proposal-drafts'),
]