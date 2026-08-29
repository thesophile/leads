from django.urls import path

from .views import (
    ClientQuotationDetailView,
    ClientQuotationResponseView,
    LeadAssignView,
    LeadDetailView,
    LeadListView,
    ProposalDraftView,
    ProposalTemplateDetailView,
    ProposalTemplateListView,
    QuotationApproveView,
    QuotationApproverListView,
    QuotationOtpView,
    QuotationRejectView,
    QuotationSendToClientView,
    QuotationView,
)

urlpatterns = [
    path('leads/', LeadListView.as_view(), name='transactions-leads-list'),
    path('leads/assign/', LeadAssignView.as_view(), name='transactions-leads-assign'),
    path('leads/<pk>/', LeadDetailView.as_view(), name='transactions-lead-detail'),
    path('quotations/approvers/', QuotationApproverListView.as_view(), name='transactions-quotation-approvers'),
    path('quotations/<lead_id>/', QuotationView.as_view(), name='transactions-quotation-detail'),
    path('quotations/<lead_id>/approval-otp/', QuotationOtpView.as_view(), name='transactions-quotation-otp'),
    path('quotations/<lead_id>/approve/', QuotationApproveView.as_view(), name='transactions-quotation-approve'),
    path('quotations/<lead_id>/reject/', QuotationRejectView.as_view(), name='transactions-quotation-reject'),
    path('quotations/<lead_id>/send-to-client/', QuotationSendToClientView.as_view(), name='transactions-quotation-send-client'),
    path('proposal-templates/', ProposalTemplateListView.as_view(), name='transactions-proposal-templates'),
    path('proposal-templates/<pk>/', ProposalTemplateDetailView.as_view(), name='transactions-proposal-template'),
    path('proposal-drafts/', ProposalDraftView.as_view(), name='transactions-proposal-drafts'),
    path('public/quotations/<token>/', ClientQuotationDetailView.as_view(), name='transactions-quotation-client-detail'),
    path('public/quotations/<token>/respond/', ClientQuotationResponseView.as_view(), name='transactions-quotation-client-respond'),
]