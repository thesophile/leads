from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from transactions.views import ExternalOrdersView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/master/', include('master.urls')),
    path('api/transactions/', include('transactions.urls')),
    path('api/', include('utilities.urls')),
    path('api/external/orders/', ExternalOrdersView.as_view(), name='external-orders'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
