from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase

from pedidos.models import DetallePedido, Pago, Pedido
from productos.models import Categoria, Producto

from .afip import FACTURA_A, FACTURA_B, FACTURA_C, ErrorFiscal, solicitar_cae
from .models import ComprobanteFiscal, ConfiguracionFiscal
from .services import facturar_si_corresponde


def crear_pedido(total_unitario='121', cantidad='1', **extra):
    categoria = Categoria.objects.get_or_create(nombre='Hierbas')[0]
    producto = Producto.objects.create(
        categoria=categoria, nombre=f'Hierba {Producto.objects.count()}',
        precio_base=Decimal(total_unitario), alicuota_iva=Decimal('21'),
    )
    pedido = Pedido.objects.create(**extra)
    DetallePedido.objects.create(
        pedido=pedido, producto=producto,
        cantidad=Decimal(cantidad), precio_unitario=Decimal(total_unitario),
    )
    return pedido


class SolicitarCaeTests(TestCase):
    """ARCA rechaza (10047/10048/10071) una Factura C con IVA discriminado: un
    monotributista no lo factura por separado. Se prueba mockeando WSFEv1, porque
    no se le puede pegar a ARCA de verdad en un test."""

    def setUp(self):
        self.pedido = crear_pedido()

    def _mockear_wsfe(self, mock_wsfev1_cls):
        wsfe = mock_wsfev1_cls.return_value
        wsfe.CompUltimoAutorizado.return_value = 5
        wsfe.CAE = '12345'
        wsfe.Vencimiento = '20260901'
        wsfe.CAESolicitar.return_value = True
        return wsfe

    def _config(self, **extra):
        return ConfiguracionFiscal.objects.create(
            cuit='20458023426', punto_venta='2', cert_ref='test', **extra)

    @patch('fiscal.afip._rutas_certificado', return_value=('cert.crt', 'cert.key'))
    @patch('fiscal.afip._obtener_ticket', return_value={'token': 't', 'sign': 's'})
    @patch('fiscal.afip.WSFEv1')
    def test_factura_c_no_discrimina_iva(self, mock_wsfev1_cls, mock_ticket, mock_certs):
        config = self._config(condicion_iva='monotributo')
        wsfe = self._mockear_wsfe(mock_wsfev1_cls)

        resultado = solicitar_cae(self.pedido, config)

        _, kwargs = wsfe.CrearFactura.call_args
        self.assertEqual(kwargs['tipo_cbte'], FACTURA_C)
        self.assertEqual(kwargs['imp_iva'], 0.0)
        self.assertEqual(kwargs['imp_neto'], float(self.pedido.calcular_total()))
        wsfe.AgregarIva.assert_not_called()
        self.assertEqual(resultado['cae'], '12345')
        self.assertEqual(str(resultado['cae_vencimiento']), '2026-09-01')

    @patch('fiscal.afip._rutas_certificado', return_value=('cert.crt', 'cert.key'))
    @patch('fiscal.afip._obtener_ticket', return_value={'token': 't', 'sign': 's'})
    @patch('fiscal.afip.WSFEv1')
    def test_factura_b_si_discrimina_iva(self, mock_wsfev1_cls, mock_ticket, mock_certs):
        config = self._config(condicion_iva='responsable_inscripto')
        wsfe = self._mockear_wsfe(mock_wsfev1_cls)

        resultado = solicitar_cae(self.pedido, config)

        _, kwargs = wsfe.CrearFactura.call_args
        self.assertEqual(kwargs['tipo_cbte'], FACTURA_B)
        self.assertEqual(kwargs['tipo_doc'], 99, 'sin CUIT es consumidor final')
        self.assertGreater(kwargs['imp_iva'], 0)
        # Lo que ARCA valida de forma estricta: neto + iva tiene que dar el total.
        self.assertAlmostEqual(kwargs['imp_neto'] + kwargs['imp_iva'], kwargs['imp_total'], places=2)
        wsfe.AgregarIva.assert_called_once()
        self.assertEqual(resultado['cae'], '12345')

    @patch('fiscal.afip._rutas_certificado', return_value=('cert.crt', 'cert.key'))
    @patch('fiscal.afip._obtener_ticket', return_value={'token': 't', 'sign': 's'})
    @patch('fiscal.afip.WSFEv1')
    def test_con_cuit_del_comprador_sale_factura_a(self, mock_wsfev1_cls, mock_ticket, mock_certs):
        config = self._config(condicion_iva='responsable_inscripto')
        pedido = crear_pedido(cuit='30-71234567-8')
        wsfe = self._mockear_wsfe(mock_wsfev1_cls)

        solicitar_cae(pedido, config)

        _, kwargs = wsfe.CrearFactura.call_args
        self.assertEqual(kwargs['tipo_cbte'], FACTURA_A)
        self.assertEqual(kwargs['tipo_doc'], 80)
        self.assertEqual(kwargs['nro_doc'], 30712345678, 'el CUIT va sin guiones')

    @patch('fiscal.afip._rutas_certificado', return_value=('cert.crt', 'cert.key'))
    @patch('fiscal.afip._obtener_ticket', return_value={'token': 't', 'sign': 's'})
    @patch('fiscal.afip.WSFEv1')
    def test_el_total_facturado_incluye_envio_y_descuentos(self, mock_wsfev1_cls, mock_ticket, mock_certs):
        """El total del pedido no es la suma de los items: lleva envío, descuento y
        canje de puntos. Es lo que tiene que ir en el comprobante."""
        config = self._config(condicion_iva='responsable_inscripto')
        pedido = crear_pedido(total_unitario='1000', cantidad='10', costo_envio=Decimal('500'))
        wsfe = self._mockear_wsfe(mock_wsfev1_cls)

        solicitar_cae(pedido, config)

        _, kwargs = wsfe.CrearFactura.call_args
        self.assertEqual(kwargs['imp_total'], 10500.0)
        self.assertAlmostEqual(kwargs['imp_neto'] + kwargs['imp_iva'], 10500.0, places=2)


class FacturacionAutomaticaTests(TestCase):
    """Regla de facturación automática: qué pedidos entran y qué pasa cuando ARCA
    no responde. Se prueba la decisión, no la emisión (cubierta arriba)."""

    def setUp(self):
        self.config = ConfiguracionFiscal.objects.create(
            cuit='20111111112', punto_venta='1', condicion_iva='monotributo', activo=True,
            facturar_automatico=True, facturar_medios=['transferencia'],
        )

    def _pedido(self, precio='10000', pagos=None, **extra):
        pedido = crear_pedido(total_unitario=precio, **extra)
        for metodo, monto in (pagos or []):
            Pago.objects.create(pedido=pedido, metodo=metodo, monto=Decimal(monto))
        return pedido

    def test_factura_el_pedido_pagado_por_transferencia(self):
        pedido = self._pedido(pagos=[('transferencia', '10000')])
        self.assertTrue(self.config.debe_facturarse(pedido))

    def test_no_factura_el_pedido_pagado_en_efectivo(self):
        pedido = self._pedido(pagos=[('efectivo', '10000')])
        self.assertFalse(self.config.debe_facturarse(pedido))

    def test_pago_mixto_entra_si_alguna_parte_fue_por_el_medio_elegido(self):
        """Si algo entró por transferencia quedó registrado en el banco, así que el
        pedido se factura aunque el resto haya sido en efectivo."""
        pedido = self._pedido(pagos=[('efectivo', '9000'), ('transferencia', '1000')])
        self.assertTrue(self.config.debe_facturarse(pedido))

    def test_no_factura_un_pedido_cobrado_a_medias(self):
        """Un pedido a medio pagar todavía puede cambiar; el CAE no se puede
        modificar después."""
        pedido = self._pedido(pagos=[('transferencia', '4000')])
        self.assertFalse(self.config.debe_facturarse(pedido))

    def test_respeta_el_monto_minimo(self):
        self.config.facturar_monto_minimo = Decimal('50000')
        chico = self._pedido(precio='10000', pagos=[('transferencia', '10000')])
        self.assertFalse(self.config.debe_facturarse(chico), 'no llega al mínimo')
        grande = self._pedido(precio='60000', pagos=[('transferencia', '60000')])
        self.assertTrue(self.config.debe_facturarse(grande))

    def test_no_factura_si_esta_apagado_o_ya_facturado_o_cancelado_o_excluido(self):
        pedido = self._pedido(pagos=[('transferencia', '10000')])
        self.config.facturar_automatico = False
        self.assertFalse(self.config.debe_facturarse(pedido))

        self.config.facturar_automatico = True
        pedido.facturado = True
        self.assertFalse(self.config.debe_facturarse(pedido))

        pedido.facturado = False
        pedido.estado = 'cancelado'
        self.assertFalse(self.config.debe_facturarse(pedido))

        pedido.estado = 'pendiente'
        pedido.excluir_fiscal = True
        self.assertFalse(self.config.debe_facturarse(pedido))

    def test_sin_medios_elegidos_no_factura_nada(self):
        """Prendido pero sin marcar ningún medio no puede significar "todos":
        emitir un CAE es irreversible."""
        self.config.facturar_medios = []
        pedido = self._pedido(pagos=[('transferencia', '10000')])
        self.assertFalse(self.config.debe_facturarse(pedido))

    @patch('fiscal.services.solicitar_cae')
    def test_si_arca_falla_el_pedido_sobrevive_y_queda_pendiente(self, mock_cae):
        """Lo más importante: un problema con ARCA no puede romper un pedido que el
        cliente ya pagó."""
        mock_cae.side_effect = ErrorFiscal('ARCA no responde')
        pedido = self._pedido(pagos=[('transferencia', '10000')])

        self.assertFalse(facturar_si_corresponde(pedido))
        pedido.refresh_from_db()
        self.assertFalse(pedido.facturado)
        comprobante = ComprobanteFiscal.objects.get(pedido=pedido)
        self.assertEqual(comprobante.estado, 'error', 'queda en la cola para reintentar')
        self.assertIn('ARCA no responde', comprobante.error_msg)


class FacturarDesdeElPanelTests(TestCase):
    """El botón "Facturar" del panel: qué contesta el endpoint en cada caso."""

    def setUp(self):
        admin = User.objects.create_user('admin', password='x', is_staff=True)
        self.client.force_login(admin)
        self.pedido = crear_pedido()

    def test_sin_datos_fiscales_avisa_en_vez_de_romper(self):
        respuesta = self.client.post(f'/api/pedidos/{self.pedido.id}/facturar/')
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('datos fiscales', respuesta.json()['detail'])

    @patch('fiscal.services.solicitar_cae')
    def test_emite_y_deja_el_pedido_facturado(self, mock_cae):
        ConfiguracionFiscal.objects.create(
            cuit='20111111112', punto_venta='1', condicion_iva='monotributo', cert_ref='test')
        mock_cae.return_value = {
            'cae': '75000000000001', 'cae_vencimiento': None,
            'numero': 7, 'punto_vta': 1, 'tipo_cbte': FACTURA_C,
        }

        respuesta = self.client.post(f'/api/pedidos/{self.pedido.id}/facturar/')

        self.assertEqual(respuesta.status_code, 200)
        self.pedido.refresh_from_db()
        self.assertTrue(self.pedido.facturado)
        self.assertEqual(self.pedido.tipo_factura, 'C')
        self.assertEqual(self.pedido.numero_factura, '7')
        self.assertEqual(ComprobanteFiscal.objects.get(pedido=self.pedido).estado, 'ok')

        # Un segundo intento no puede volver a emitir: sería facturar dos veces lo mismo.
        repetido = self.client.post(f'/api/pedidos/{self.pedido.id}/facturar/')
        self.assertEqual(repetido.status_code, 400)

    def test_no_se_puede_prender_la_automatica_sin_elegir_medios(self):
        respuesta = self.client.post('/api/fiscal/config/', {
            'cuit': '20111111112', 'punto_venta': '1', 'condicion_iva': 'monotributo',
            'facturar_automatico': True, 'facturar_medios': [],
        }, content_type='application/json')
        self.assertEqual(respuesta.status_code, 400)
