from django.db.models import ProtectedError
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from config.permissions import EsAdminOSoloLectura
from .models import Categoria, EscalonPrecio, Producto
from .serializers import CategoriaSerializer, EscalonPrecioSerializer, ProductoSerializer


class CategoriaViewSet(viewsets.ModelViewSet):
    # Lectura pública (la tienda muestra las categorías del catálogo); escribir es solo admin.
    permission_classes = [EsAdminOSoloLectura]
    queryset = Categoria.objects.prefetch_related('escalones')
    serializer_class = CategoriaSerializer

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'No se puede eliminar la categoría porque tiene productos asociados.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ProductoViewSet(viewsets.ModelViewSet):
    permission_classes = [EsAdminOSoloLectura]
    queryset = Producto.objects.select_related('categoria')
    serializer_class = ProductoSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        categoria_id = self.request.query_params.get('categoria')
        if categoria_id:
            queryset = queryset.filter(categoria_id=categoria_id)
        return queryset

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'No se puede eliminar el producto porque aparece en pedidos existentes.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class EscalonPrecioViewSet(viewsets.ModelViewSet):
    permission_classes = [EsAdminOSoloLectura]
    queryset = EscalonPrecio.objects.select_related('categoria')
    serializer_class = EscalonPrecioSerializer
