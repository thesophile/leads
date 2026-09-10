from django.urls import path

from .views import (
    BackupExportView,
    BackupRestoreView,
    NotificationDetailView,
    NotificationListView,
    NotificationReadAllView,
    NotificationUnreadCountView,
    StaffTargetBulkAdjustView,
    StaffTargetDetailView,
    StaffTargetListCreateView,
)

urlpatterns = [
    path('backup/export/', BackupExportView.as_view(), name='backup-export'),
    path('backup/restore/', BackupRestoreView.as_view(), name='backup-restore'),
    path('notifications/', NotificationListView.as_view(), name='notifications-list'),
    path('notifications/unread-count/', NotificationUnreadCountView.as_view(), name='notifications-unread-count'),
    path('notifications/read-all/', NotificationReadAllView.as_view(), name='notifications-read-all'),
    path('notifications/<int:pk>/', NotificationDetailView.as_view(), name='notifications-detail'),
    path('staff-targets/', StaffTargetListCreateView.as_view(), name='staff-targets-list'),
    path('staff-targets/bulk-adjust/', StaffTargetBulkAdjustView.as_view(), name='staff-targets-bulk-adjust'),
    path('staff-targets/<int:pk>/', StaffTargetDetailView.as_view(), name='staff-targets-detail'),
]
