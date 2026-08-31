from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoriaViewSet, ProductoViewSet, EscalonPrecioViewSet, CantidadFijaViewSet, ImagenCategoriaViewSet,
)

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet)
router.register(r'productos', ProductoViewSet)
router.register(r'escalones-precio', EscalonPrecioViewSet)
router.register(r'cantidades-fijas', CantidadFijaViewSet)
router.register(r'imagenes-categoria', ImagenCategoriaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
