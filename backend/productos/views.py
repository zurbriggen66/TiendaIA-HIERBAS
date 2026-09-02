from decimal import Decimal, InvalidOperation

from django.db.models import ProtectedError
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from config.permissions import EsAdminOSoloLectura
from .models import Categoria, EscalonPrecio, CantidadFija, ImagenCategoria, Producto
from .serializers import (
    CategoriaSerializer, EscalonPrecioSerializer, CantidadFijaSerializer,
    ImagenCategoriaSerializer, ProductoSerializer,
)


class CategoriaViewSet(viewsets.ModelViewSet):
    # Lectura pública (la tienda muestra las categorías del catálogo); escribir es solo admin.
    permission_classes = [EsAdminOSoloLectura]
    queryset = Categoria.objects.prefetch_related('escalones', 'cantidades_fijas', 'imagenes')
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

    @action(detail=False, methods=['post'], url_path='ajuste-masivo')
    def ajuste_masivo(self, request):
        """Sube (o baja, con valor negativo) todos los precios de una vez: precio_base
        y precio_granel de cada producto, y el precio de cada escalón por volumen.
        `modo`: 'porcentaje' | 'monto'. `categoria` (opcional) acota el ajuste a una
        sola categoría. Los precios se redondean al peso y nunca quedan negativos."""
        modo = request.data.get('modo')
        if modo not in ('porcentaje', 'monto'):
            return Response({'detail': 'Modo inválido (usá "porcentaje" o "monto").'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            valor = Decimal(str(request.data.get('valor')))
        except (InvalidOperation, TypeError):
            return Response({'detail': 'El valor del ajuste no es un número válido.'}, status=status.HTTP_400_BAD_REQUEST)
        if modo == 'porcentaje' and valor <= -100:
            return Response({'detail': 'Un descuento del 100% o más dejaría todo en cero.'}, status=status.HTTP_400_BAD_REQUEST)

        categoria_id = request.data.get('categoria') or None
        productos = Producto.objects.all()
        escalones = EscalonPrecio.objects.all()
        if categoria_id:
            productos = productos.filter(categoria_id=categoria_id)
            escalones = escalones.filter(categoria_id=categoria_id)

        factor = Decimal('1') + valor / Decimal('100')

        def ajustar(precio):
            if precio is None:
                return None
            nuevo = precio * factor if modo == 'porcentaje' else precio + valor
            return max(nuevo.quantize(Decimal('1')), Decimal('0'))

        productos_afectados = 0
        for p in productos:
            if p.precio_base is None and p.precio_granel is None:
                continue
            p.precio_base = ajustar(p.precio_base)
            p.precio_granel = ajustar(p.precio_granel)
            p.save(update_fields=['precio_base', 'precio_granel'])
            productos_afectados += 1

        escalones_afectados = 0
        for e in escalones:
            e.precio_unitario = ajustar(e.precio_unitario)
            e.save(update_fields=['precio_unitario'])
            escalones_afectados += 1

        return Response({'productos': productos_afectados, 'escalones': escalones_afectados})


class EscalonPrecioViewSet(viewsets.ModelViewSet):
    permission_classes = [EsAdminOSoloLectura]
    queryset = EscalonPrecio.objects.select_related('categoria')
    serializer_class = EscalonPrecioSerializer


class CantidadFijaViewSet(viewsets.ModelViewSet):
    permission_classes = [EsAdminOSoloLectura]
    queryset = CantidadFija.objects.select_related('categoria')
    serializer_class = CantidadFijaSerializer


class ImagenCategoriaViewSet(viewsets.ModelViewSet):
    # El "subir varias a la vez" lo resuelve el frontend: manda un POST por archivo
    # elegido en el <input multiple>, no hace falta un endpoint de carga masiva acá.
    permission_classes = [EsAdminOSoloLectura]
    queryset = ImagenCategoria.objects.select_related('categoria')
    serializer_class = ImagenCategoriaSerializer
