"""Emisión de comprobantes: un solo camino para las tres formas de facturar.

Lo usan el botón manual (PedidoViewSet.facturar), la facturación automática al
terminar de cobrar (PagoViewSet) y el reintento en lote de la cola. Tenerlo en un
solo lugar evita que las tres queden escribiendo distinto el pedido y la cola.
"""
from django.db import transaction
from django.utils import timezone

from .afip import LETRA_POR_TIPO, ErrorFiscal, solicitar_cae
from .models import ComprobanteFiscal, ConfiguracionFiscal


def config_vigente():
    """La configuración fiscal activa del negocio (la última cargada, si hubiera
    más de una). None si todavía no se cargó ninguna."""
    return ConfiguracionFiscal.objects.filter(activo=True).order_by('-id').first()


def emitir_factura(pedido, config):
    """Pide el CAE y deja el pedido y el comprobante coherentes.

    Relanza ErrorFiscal si ARCA rechaza o no responde, dejando el comprobante en
    "error" con el motivo. No captura la excepción a propósito: quien llama decide
    si es un error para mostrarle al usuario (botón manual) o algo que no debe
    romper nada (facturación automática).

    Todo lo que quedó en "error" es reintentable desde el panel — sea porque ARCA
    estaba caído o porque rechazó el comprobante; el motivo guardado distingue un
    caso del otro.
    """
    comprobante, _ = ComprobanteFiscal.objects.update_or_create(
        pedido=pedido, defaults={'estado': 'procesando', 'error_msg': ''},
    )

    try:
        resultado = solicitar_cae(pedido, config)
    except ErrorFiscal as exc:
        comprobante.estado = 'error'
        comprobante.error_msg = str(exc)
        comprobante.save(update_fields=['estado', 'error_msg', 'actualizado'])
        raise

    letra = LETRA_POR_TIPO.get(resultado['tipo_cbte'], '')
    with transaction.atomic():
        pedido.facturado = True
        pedido.cae = resultado['cae']
        pedido.cae_vencimiento = resultado['cae_vencimiento']
        pedido.numero_factura = str(resultado['numero'])
        pedido.punto_venta_factura = str(resultado['punto_vta'])
        pedido.tipo_factura = letra
        pedido.fecha_facturacion = timezone.now()
        pedido.save(update_fields=[
            'facturado', 'cae', 'cae_vencimiento', 'numero_factura',
            'punto_venta_factura', 'tipo_factura', 'fecha_facturacion',
        ])

        comprobante.estado = 'ok'
        comprobante.cae = resultado['cae']
        comprobante.cae_vencimiento = resultado['cae_vencimiento']
        comprobante.punto_venta = str(resultado['punto_vta'])
        comprobante.numero_factura = str(resultado['numero'])
        comprobante.tipo_comprobante = letra
        comprobante.error_msg = ''
        comprobante.save(update_fields=[
            'estado', 'cae', 'cae_vencimiento', 'punto_venta',
            'numero_factura', 'tipo_comprobante', 'error_msg', 'actualizado',
        ])

    return pedido


def facturar_si_corresponde(pedido):
    """Facturación automática al terminar de cobrar un pedido.

    Nunca relanza: el pedido YA está cobrado y guardado, y un problema con ARCA no
    puede hacer fallar el registro del pago hacia atrás. Si no se pudo emitir,
    queda en la cola para reintentar desde el panel.

    Devuelve True solo si se emitió el CAE.
    """
    config = config_vigente()
    if config is None or not config.debe_facturarse(pedido):
        return False
    try:
        emitir_factura(pedido, config)
        return True
    except ErrorFiscal:
        return False
    except Exception:  # noqa: BLE001
        # Cualquier otra cosa (un bug del wrapper, un timeout raro de la librería):
        # tampoco puede tumbar el registro de un pago ya cobrado.
        ComprobanteFiscal.objects.update_or_create(
            pedido=pedido,
            defaults={'estado': 'error', 'error_msg': 'Error inesperado al facturar.'},
        )
        return False
