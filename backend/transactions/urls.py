from django.urls import path

from .views import (
    LeadAssignView,
    LeadDetailView,
    LeadListView,
)

urlpatterns = [
    path('leads/', LeadListView.as_view(), name='transactions-leads-list'),
    path('leads/assign/', LeadAssignView.as_view(), name='transactions-leads-assign'),
    path('leads/<pk>/', LeadDetailView.as_view(), name='transactions-lead-detail'),
]