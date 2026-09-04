from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .afip import ErrorFiscal
from .models import ComprobanteFiscal, ConfiguracionFiscal
from .serializers import ComprobanteFiscalSerializer, ConfiguracionFiscalSerializer
from .services import config_vigente, emitir_factura

# Cuántos comprobantes se reintentan por llamada: cada uno es un ida y vuelta contra
# ARCA, y una request colgada varios minutos la corta el proxy antes de terminar.
MAX_REINTENTOS_POR_LLAMADA = 50


class ConfiguracionFiscalViewSet(viewsets.ModelViewSet):
    """Datos fiscales del negocio. Solo admin (el permiso por defecto del proyecto
    es EsAdmin, ver config/settings.py)."""

    queryset = ConfiguracionFiscal.objects.all().order_by('-id')
    serializer_class = ConfiguracionFiscalSerializer


class ComprobanteFiscalViewSet(viewsets.ReadOnlyModelViewSet):
    """Cola de comprobantes. Solo lectura: se crean facturando un pedido
    (ver PedidoViewSet.facturar y fiscal.services)."""

    queryset = ComprobanteFiscal.objects.select_related('pedido').prefetch_related(
        'pedido__items__producto',
    )
    serializer_class = ComprobanteFiscalSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        estado = self.request.query_params.get('estado')
        return queryset.filter(estado=estado) if estado else queryset

    @action(detail=False, methods=['post'], url_path='procesar-pendientes')
    def procesar_pendientes(self, request):
        """Reintenta los pedidos que quedaron sin CAE.

        Es la contraparte de la facturación automática: si ARCA estaba caído
        cuando se cobró, el pedido quedó acá en "error" y desde este botón se
        emiten todos juntos.
        """
        config = config_vigente()
        if config is None:
            return Response({'detail': 'Todavía no hay datos fiscales cargados.'}, status=400)

        pendientes = (
            ComprobanteFiscal.objects.filter(estado__in=['pendiente', 'error'])
            .select_related('pedido')
            .prefetch_related('pedido__items__producto')[:MAX_REINTENTOS_POR_LLAMADA]
        )
        emitidas, fallidas, errores = 0, 0, []
        for comprobante in pendientes:
            pedido = comprobante.pedido
            if pedido.estado == 'cancelado' or pedido.facturado:
                continue
            try:
                emitir_factura(pedido, config)
                emitidas += 1
            except ErrorFiscal as exc:
                fallidas += 1
                if len(errores) < 3:
                    errores.append(str(exc))

        return Response({'emitidas': emitidas, 'fallidas': fallidas, 'errores': errores})
