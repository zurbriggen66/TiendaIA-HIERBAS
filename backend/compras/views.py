from django.db.models import ProtectedError
from django.utils.dateparse import parse_date
from rest_framework import viewsets, status
from rest_framework.response import Response
from config.permissions import EsAdmin
from .models import Proveedor, Compra
from .serializers import ProveedorSerializer, CompraSerializer


class ProveedorViewSet(viewsets.ModelViewSet):
    permission_classes = [EsAdmin]
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'No se puede eliminar el proveedor porque tiene compras registradas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CompraViewSet(viewsets.ModelViewSet):
    permission_classes = [EsAdmin]
    queryset = Compra.objects.select_related('proveedor', 'insumo')
    serializer_class = CompraSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        proveedor_id = self.request.query_params.get('proveedor')
        if proveedor_id:
            queryset = queryset.filter(proveedor_id=proveedor_id)
        desde = parse_date(self.request.query_params.get('desde') or '')
        hasta = parse_date(self.request.query_params.get('hasta') or '')
        if desde:
            queryset = queryset.filter(fecha__gte=desde)
        if hasta:
            queryset = queryset.filter(fecha__lte=hasta)
        return queryset
