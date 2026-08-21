from django.urls import path

from .views import (
    BranchDetailView,
    BranchListView,
    CategoryDetailView,
    CategoryListView,
)

urlpatterns = [
    path('branches/', BranchListView.as_view(), name='master-branches-list'),
    path('branches/<int:pk>/', BranchDetailView.as_view(), name='master-branch-detail'),
    path('categories/', CategoryListView.as_view(), name='master-categories-list'),
    path('categories/<int:pk>/', CategoryDetailView.as_view(), name='master-category-detail'),
]