from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConfiguracionViewSet, ContactoWhatsappViewSet, AdminLoginView

router = DefaultRouter()
router.register(r'configuracion', ConfiguracionViewSet)
router.register(r'contactos-whatsapp', ContactoWhatsappViewSet)

urlpatterns = [
    path('admin-login/', AdminLoginView.as_view()),
    path('', include(router.urls)),
]