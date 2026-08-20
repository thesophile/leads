from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/master/', include('master.urls')),
    path('api/transactions/', include('transactions.urls')),
]
