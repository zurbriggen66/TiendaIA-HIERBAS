from decimal import Decimal

from django.db.models import ProtectedError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from config.permissions import EsAdmin
from .models import Insumo, Gasto, GastoFijo, CategoriaGasto
from .serializers import (
    InsumoSerializer, GastoSerializer, GastoFijoSerializer, CategoriaGastoSerializer,
)


class CategoriaGastoViewSet(viewsets.ModelViewSet):
    permission_classes = [EsAdmin]
    queryset = CategoriaGasto.objects.all()
    serializer_class = CategoriaGastoSerializer


class InsumoViewSet(viewsets.ModelViewSet):
    permission_classes = [EsAdmin]
    queryset = Insumo.objects.all()
    serializer_class = InsumoSerializer

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'No se puede eliminar el insumo porque está vinculado a productos existentes.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class GastoViewSet(viewsets.ModelViewSet):
    permission_classes = [EsAdmin]
    queryset = Gasto.objects.all()
    serializer_class = GastoSerializer

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        gastos = list(self.get_queryset())
        total = sum((g.monto for g in gastos), Decimal('0'))
        rubros = {}
        for g in gastos:
            rubros[g.categoria] = rubros.get(g.categoria, Decimal('0')) + g.monto
        por_categoria = [
            {'categoria': nombre, 'categoria_label': nombre, 'total': monto}
            for nombre, monto in sorted(rubros.items(), key=lambda kv: kv[1], reverse=True)
        ]
        return Response({'total': total, 'por_categoria': por_categoria})


class GastoFijoViewSet(viewsets.ModelViewSet):
    permission_classes = [EsAdmin]
    queryset = GastoFijo.objects.all()
    serializer_class = GastoFijoSerializer

    @action(detail=True, methods=['post'])
    def pagar(self, request, pk=None):
        gasto_fijo = self.get_object()
        # Se crea el Gasto real para que impacte en Estadísticas/ganancia neta,
        # y recién después se corre la fecha al próximo vencimiento.
        Gasto.objects.create(
            categoria=gasto_fijo.categoria,
            descripcion=gasto_fijo.nombre,
            monto=gasto_fijo.monto,
            metodo_pago=request.data.get('metodo_pago') or 'efectivo',
        )
        gasto_fijo.avanzar_vencimiento()
        return Response(self.get_serializer(gasto_fijo).data)

    @action(detail=False, methods=['get'])
    def alertas(self, request):
        activos = self.get_queryset().filter(activo=True)
        total_pendiente = sum((g.monto for g in activos), Decimal('0'))
        return Response({
            'total_pendiente': total_pendiente,
            'gastos': self.get_serializer(activos, many=True).data,
        })
