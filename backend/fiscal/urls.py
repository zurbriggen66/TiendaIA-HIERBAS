from rest_framework.routers import DefaultRouter

from .views import ComprobanteFiscalViewSet, ConfiguracionFiscalViewSet

router = DefaultRouter()
router.register('config', ConfiguracionFiscalViewSet, basename='fiscal-config')
router.register('comprobantes', ComprobanteFiscalViewSet, basename='fiscal-comprobantes')

urlpatterns = router.urls
