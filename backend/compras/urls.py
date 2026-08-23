from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProveedorViewSet, CompraViewSet

router = DefaultRouter()
router.register(r'proveedores', ProveedorViewSet)
router.register(r'compras', CompraViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
