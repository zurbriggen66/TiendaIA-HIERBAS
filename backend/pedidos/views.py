from datetime import timedelta

from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from config.permissions import EsAdmin, es_staff
from .models import Pedido, Localidad, Pago
from .serializers import PedidoSerializer, LocalidadSerializer, PagoSerializer
from clientes.puntos import acreditar as acreditar_puntos
from fiscal.afip import ErrorFiscal
from fiscal.services import config_vigente, emitir_factura, facturar_si_corresponde


class PedidoPermiso(BasePermission):
    """Crear un pedido (POST) es público — así piden los clientes de la tienda, con o
    sin cuenta. Todo lo demás (listar, ver el detalle, confirmar, cancelar, borrar)
    es del panel de administración."""

    def has_permission(self, request, view):
        if request.method == 'POST':
            return True
        return es_staff(request)


class PedidosPagination(PageNumberPagination):
    """Paginación solo para pedidos: el resto de la API sigue devolviendo listas planas."""

    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200


class PedidoViewSet(viewsets.ModelViewSet):
    permission_classes = [PedidoPermiso]
    queryset = Pedido.objects.all()
    serializer_class = PedidoSerializer
    pagination_class = PedidosPagination

    def get_queryset(self):
        queryset = Pedido.objects.prefetch_related(
            'items__producto__categoria', 'pagos',
        ).select_related('localidad')
        desde = parse_date(self.request.query_params.get('desde') or '')
        hasta = parse_date(self.request.query_params.get('hasta') or '')
        if desde:
            queryset = queryset.filter(creado__date__gte=desde)
        if hasta:
            queryset = queryset.filter(creado__date__lte=hasta)

        confirmado = self.request.query_params.get('confirmado')
        if confirmado is not None:
            queryset = queryset.filter(confirmado=(confirmado.lower() == 'true'))
        origen = self.request.query_params.get('origen')
        if origen:
            queryset = queryset.filter(origen=origen)

        ultimas_horas = self.request.query_params.get('ultimas_horas')
        if ultimas_horas:
            try:
                horas = int(ultimas_horas)
            except ValueError:
                horas = None
            if horas:
                queryset = queryset.filter(creado__gte=timezone.now() - timedelta(hours=horas))

        return queryset

    def perform_create(self, serializer):
        origen = serializer.validated_data.get('origen', 'admin')
        if origen == 'web':
            # Los pedidos de la tienda web quedan sin confirmar hasta que el dueño los
            # confirme a mano (ver acción `confirmar`).
            serializer.save(confirmado=False)
        else:
            pedido = serializer.save(confirmado=True)
            acreditar_puntos(pedido)

    @action(detail=True, methods=['post'])
    def confirmar(self, request, pk=None):
        pedido = self.get_object()
        if pedido.confirmado:
            return Response({'detail': 'Este pedido ya está confirmado.'}, status=status.HTTP_400_BAD_REQUEST)
        pedido.confirmado = True
        pedido.save()
        # Los puntos se acreditan recién acá: un pedido web sin confirmar podría no
        # haber existido nunca, y no queremos que se acumulen puntos por pedidos falsos.
        acreditar_puntos(pedido)
        return Response(self.get_serializer(pedido).data)

    @action(detail=True, methods=['post'])
    def facturar(self, request, pk=None):
        """Emite la factura electrónica del pedido contra ARCA (botón manual).

        Devuelve 400 con el motivo si ARCA rechaza o no responde; el pedido queda
        igual que antes y el intento queda registrado en la cola de comprobantes,
        para reintentarlo desde Facturación.
        """
        pedido = self.get_object()
        if pedido.facturado:
            return Response(
                {'detail': 'Este pedido ya está facturado.'}, status=status.HTTP_400_BAD_REQUEST)
        if pedido.estado == 'cancelado':
            return Response(
                {'detail': 'No se puede facturar un pedido cancelado.'}, status=status.HTTP_400_BAD_REQUEST)
        if pedido.excluir_fiscal:
            return Response(
                {'detail': 'Este pedido está marcado como "no facturar".'},
                status=status.HTTP_400_BAD_REQUEST)

        config = config_vigente()
        if config is None:
            return Response(
                {'detail': 'Todavía no hay datos fiscales cargados (Facturación > Datos fiscales).'},
                status=status.HTTP_400_BAD_REQUEST)

        try:
            emitir_factura(pedido, config)
        except ErrorFiscal as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(pedido).data)

    def perform_destroy(self, instance):
        instance.delete()


class LocalidadViewSet(viewsets.ModelViewSet):
    permission_classes = [EsAdmin]
    queryset = Localidad.objects.all()
    serializer_class = LocalidadSerializer


class PagoViewSet(viewsets.ModelViewSet):
    permission_classes = [EsAdmin]
    queryset = Pago.objects.select_related('pedido')
    serializer_class = PagoSerializer

    def perform_create(self, serializer):
        pago = serializer.save()
        # Facturación automática: si con este pago el pedido quedó cobrado y entra en
        # la regla configurada, se emite el CAE solo. Nunca puede fallar hacia atrás —
        # el pago ya está guardado (ver fiscal.services.facturar_si_corresponde).
        facturar_si_corresponde(pago.pedido)
