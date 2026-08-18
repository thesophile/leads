from django.urls import path

from .views import BranchListView

urlpatterns = [
    path('branches/', BranchListView.as_view(), name='master-branches-list'),
]
