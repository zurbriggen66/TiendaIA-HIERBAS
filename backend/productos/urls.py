from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoriaViewSet, ProductoViewSet, EscalonPrecioViewSet, CantidadFijaViewSet

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet)
router.register(r'productos', ProductoViewSet)
router.register(r'escalones-precio', EscalonPrecioViewSet)
router.register(r'cantidades-fijas', CantidadFijaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
