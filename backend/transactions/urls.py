from django.urls import path

from .views import (
    RawLeadAssignView,
    RawLeadDetailView,
    RawLeadListView,
    TelecallLeadDetailView,
    TelecallLeadListView,
)

urlpatterns = [
    path('raw-leads/', RawLeadListView.as_view(), name='transactions-raw-leads-list'),
    path('raw-leads/assign/', RawLeadAssignView.as_view(), name='transactions-raw-leads-assign'),
    path('raw-leads/<pk>/', RawLeadDetailView.as_view(), name='transactions-raw-lead-detail'),
    path('tele-calls/', TelecallLeadListView.as_view(), name='transactions-tele-calls-list'),
    path('tele-calls/<pk>/', TelecallLeadDetailView.as_view(), name='transactions-tele-call-detail'),
]