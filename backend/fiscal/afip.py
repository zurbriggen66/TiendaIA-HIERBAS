"""Wrapper fino sobre pyafipws (WSAA + WSFEv1) para pedir un CAE a ARCA (ex AFIP).

Homologación por defecto (`ConfiguracionFiscal.homologacion=True`): para pasar a
producción real no se toca este archivo, solo esa opción, una vez que el
certificado de producción esté cargado en la carpeta de certificados.
"""
import re
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

# pyafipws se instala desde git y arrastra dependencias viejas (ver requirements.txt).
# Si la instalación falló, el resto del sistema tiene que seguir funcionando: la
# tienda no se cae, solo no se puede facturar (y se dice por qué).
try:
    from pyafipws.wsaa import WSAA
    from pyafipws.wsfev1 import WSFEv1
except Exception:  # noqa: BLE001 - ImportError, pero pyafipws también rompe de otras formas
    WSAA = WSFEv1 = None

WSAA_URL_HOMO = 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms'
WSAA_URL_PROD = 'https://wsaa.afip.gov.ar/ws/services/LoginCms'
WSFE_URL_HOMO = 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL'
WSFE_URL_PROD = 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'

# Va en DATA_DIR (no en el checkout): en el VPS es un volumen de Docker, así un
# `git pull` o un redeploy no se lleva puestos los certificados.
CERTS_DIR = Path(settings.DATA_DIR) / 'fiscal_certs'

FACTURA_A, FACTURA_B, FACTURA_C = 1, 6, 11
LETRA_POR_TIPO = {FACTURA_A: 'A', FACTURA_B: 'B', FACTURA_C: 'C'}
# Código de alícuota de IVA de ARCA por porcentaje (los que puede tener un Producto).
IVA_ID_POR_ALICUOTA = {
    Decimal('0'): 3,
    Decimal('10.5'): 4,
    Decimal('21'): 5,
    Decimal('27'): 6,
}


class ErrorFiscal(Exception):
    """Rechazo de ARCA o error de comunicación al pedir un CAE."""


def _exigir_pyafipws():
    if WSFEv1 is None:
        raise ErrorFiscal(
            'La librería pyafipws no está instalada en el servidor: '
            'no se puede facturar hasta instalarla (ver requirements.txt).'
        )


def _rutas_certificado(config):
    if not config.cert_ref:
        raise ErrorFiscal('No hay un certificado configurado (el campo "cert_ref" está vacío).')
    cert = CERTS_DIR / f'{config.cert_ref}.crt'
    key = CERTS_DIR / f'{config.cert_ref}.key'
    if not cert.exists() or not key.exists():
        raise ErrorFiscal(
            f'No se encontró el certificado/clave "{config.cert_ref}" en {CERTS_DIR}.'
        )
    return str(cert), str(key)


def _obtener_ticket(config):
    """Token+Sign de WSAA para el CUIT de `config`, cacheados ~11hs.

    El ticket real dura 12hs y ARCA rechaza pedir uno nuevo mientras el anterior
    siga vigente, así que el cache no es una optimización: es lo que evita que ARCA
    nos rechace por pedir de más. Por eso tiene que ser un cache compartido entre
    procesos (ver CACHES en config/settings.py).
    """
    cache_key = f'wsaa-ticket:{config.cuit}:{config.homologacion}'
    ticket = cache.get(cache_key)
    if ticket:
        return ticket

    cert, key = _rutas_certificado(config)
    url = WSAA_URL_HOMO if config.homologacion else WSAA_URL_PROD

    wsaa = WSAA()
    try:
        ticket_xml = wsaa.Autenticar('wsfe', cert, key, wsdl=url)
    except Exception as exc:  # noqa: BLE001
        raise ErrorFiscal(f'No se pudo autenticar con ARCA (WSAA): {exc}') from exc
    if not ticket_xml:
        raise ErrorFiscal(f'ARCA rechazó la autenticación: {wsaa.Excepcion or wsaa.LeerError()}')

    ticket = {'token': wsaa.Token, 'sign': wsaa.Sign}
    cache.set(cache_key, ticket, timeout=11 * 60 * 60)
    return ticket


def _solo_digitos(texto):
    return re.sub(r'\D', '', texto or '')


def _parsear_fecha(valor):
    """La fecha de vencimiento del CAE viene de ARCA como texto y el formato cambia
    según la versión de pyafipws ("20260901", "2026-09-01", "01/09/2026"). Se
    normaliza acá: si esto reventara más arriba, el CAE ya estaría emitido en ARCA
    pero no guardado de este lado, que es el peor escenario posible."""
    texto = str(valor or '').strip()
    for formato in ('%Y%m%d', '%Y-%m-%d', '%d/%m/%Y'):
        try:
            return datetime.strptime(texto, formato).date()
        except ValueError:
            continue
    return None


def _tipo_comprobante(config, pedido):
    """Qué comprobante corresponde emitir.

    Simplificado: no consulta el padrón de ARCA para la condición de IVA real del
    comprador, solo mira si el pedido tiene un CUIT cargado. Alcanza para el caso
    típico (mayoristas con CUIT -> A, consumidores finales -> B).
    """
    if config.condicion_iva == 'monotributo':
        return FACTURA_C
    if config.condicion_iva == 'responsable_inscripto' and _solo_digitos(pedido.cuit):
        return FACTURA_A
    return FACTURA_B


def _totales_por_alicuota(pedido, total):
    """Neto/IVA agrupado por alícuota a partir de los items, prorrateando envío,
    descuento y canje de puntos para que neto+iva cierre EXACTO con el total del
    pedido (ARCA valida esa suma de forma estricta y rechaza el comprobante si no
    da)."""
    items = list(pedido.items.select_related('producto'))
    bruto_items = sum((item.calcular_subtotal() for item in items), Decimal('0')) or Decimal('1')
    factor = total / bruto_items

    grupos = {}
    for item in items:
        alicuota = item.producto.alicuota_iva if item.producto else Decimal('21')
        ajustado = item.calcular_subtotal() * factor
        neto = (ajustado / (1 + alicuota / 100)).quantize(Decimal('0.01'))
        iva = (ajustado - neto).quantize(Decimal('0.01'))
        acumulado = grupos.setdefault(alicuota, [Decimal('0'), Decimal('0')])
        acumulado[0] += neto
        acumulado[1] += iva
    return grupos


def solicitar_cae(pedido, config):
    """Pide el CAE a WSFEv1 para un pedido ya cargado.

    Devuelve un dict con cae/cae_vencimiento/numero/tipo_cbte/punto_vta, o levanta
    ErrorFiscal (rechazo de ARCA o problema de comunicación). Nunca toca el pedido:
    de eso se encarga el que llama (ver services.emitir_factura).
    """
    _exigir_pyafipws()
    if not config.punto_venta or not config.cuit:
        raise ErrorFiscal('Falta configurar el CUIT o el punto de venta del negocio.')

    total = pedido.calcular_total()
    if total <= 0:
        raise ErrorFiscal('El pedido tiene total 0: no hay nada que facturar.')

    ticket = _obtener_ticket(config)

    wsfe = WSFEv1()
    wsfe.Token = ticket['token']
    wsfe.Sign = ticket['sign']
    wsfe.Cuit = config.cuit
    url = WSFE_URL_HOMO if config.homologacion else WSFE_URL_PROD
    try:
        # cacert=True: usa el bundle de CAs públicas (certifi) para verificar el
        # servidor de ARCA. NO es el certificado del negocio — ese autentica contra
        # WSAA, no valida al server.
        wsfe.Conectar(wsdl=url, cacert=True)
    except Exception as exc:  # noqa: BLE001
        raise ErrorFiscal(f'No se pudo conectar con ARCA (WSFEv1): {exc}') from exc

    punto_vta = int(config.punto_venta)
    tipo_cbte = _tipo_comprobante(config, pedido)

    try:
        ultimo = wsfe.CompUltimoAutorizado(tipo_cbte, punto_vta)
    except Exception as exc:  # noqa: BLE001
        raise ErrorFiscal(f'No se pudo consultar el último comprobante autorizado: {exc}') from exc
    numero = int(ultimo or 0) + 1

    # Un monotributista no discrimina IVA: ARCA rechaza (10047/10048/10071) una
    # Factura C con imp_iva != 0 o con detalle de AgregarIva. Todo va como neto.
    if tipo_cbte == FACTURA_C:
        grupos = {}
        imp_neto = total
        imp_iva = Decimal('0')
    else:
        grupos = _totales_por_alicuota(pedido, total)
        imp_neto = sum((g[0] for g in grupos.values()), Decimal('0'))
        imp_iva = sum((g[1] for g in grupos.values()), Decimal('0'))

    # Con CUIT cargado la factura sale a nombre del comprador (tipo_doc 80); sin
    # CUIT, consumidor final sin documento (99/0), que es lo que ARCA permite para
    # comprobantes chicos.
    cuit_comprador = _solo_digitos(pedido.cuit)
    tipo_doc, nro_doc = (80, int(cuit_comprador)) if cuit_comprador else (99, 0)

    wsfe.CrearFactura(
        concepto=1,  # productos
        tipo_doc=tipo_doc, nro_doc=nro_doc,
        tipo_cbte=tipo_cbte, punto_vta=punto_vta,
        cbt_desde=numero, cbt_hasta=numero,
        imp_total=float(total), imp_neto=float(imp_neto), imp_iva=float(imp_iva),
        imp_tot_conc=0, imp_op_ex=0, imp_trib=0,
        # La fecha del comprobante es la de HOY, no la del pedido: ARCA solo acepta
        # comprobantes de productos con hasta 5 días de antigüedad, y un pedido se
        # puede facturar bastante después de cargarlo.
        fecha_cbte=timezone.localdate().strftime('%Y%m%d'),
        moneda_id='PES', moneda_ctz='1.0000',
    )
    for alicuota, (neto, iva) in grupos.items():
        iva_id = IVA_ID_POR_ALICUOTA.get(Decimal(alicuota), 5)
        wsfe.AgregarIva(iva_id=iva_id, base_imp=float(neto), importe=float(iva))

    try:
        ok = wsfe.CAESolicitar()
    except Exception as exc:  # noqa: BLE001
        raise ErrorFiscal(f'Error al pedir el CAE: {exc}') from exc
    if not ok or not wsfe.CAE:
        raise ErrorFiscal(wsfe.ErrMsg or wsfe.Obs or 'ARCA rechazó el comprobante.')

    return {
        'cae': wsfe.CAE,
        'cae_vencimiento': _parsear_fecha(wsfe.Vencimiento),
        'numero': numero,
        'punto_vta': punto_vta,
        'tipo_cbte': tipo_cbte,
    }
