from django.urls import path

from .views import BranchDetailView, BranchListView

urlpatterns = [
    path('branches/', BranchListView.as_view(), name='master-branches-list'),
    path('branches/<int:pk>/', BranchDetailView.as_view(), name='master-branch-detail'),
]
