from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from transactions.views import ExternalClientFilesView, ExternalCustomersView, ExternalOrdersView, ExternalPaymentsView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/master/', include('master.urls')),
    path('api/transactions/', include('transactions.urls')),
    path('api/', include('utilities.urls')),
    path('api/external/orders/', ExternalOrdersView.as_view(), name='external-orders'),
    path('api/external/customers/', ExternalCustomersView.as_view(), name='external-customers'),
    path('api/external/client-files/', ExternalClientFilesView.as_view(), name='external-client-files'),
    path('api/external/payments/', ExternalPaymentsView.as_view(), name='external-payments'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
