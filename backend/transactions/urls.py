from django.urls import path

from .views import RawLeadDetailView, RawLeadListView

urlpatterns = [
    path('raw-leads/', RawLeadListView.as_view(), name='transactions-raw-leads-list'),
    path('raw-leads/<pk>/', RawLeadDetailView.as_view(), name='transactions-raw-lead-detail'),
]