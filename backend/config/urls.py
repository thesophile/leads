from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('v1/api/auth/', include('accounts.urls')),
    path('v1/api/master/', include('master.urls')),
    path('v1/api/transactions/', include('transactions.urls')),
    path('v1/api/', include('utilities.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
