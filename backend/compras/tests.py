from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from gastos.models import Insumo
from .models import Proveedor, Compra


class CompraTests(TestCase):
    def setUp(self):
        admin = User.objects.create_user('admin-test', is_staff=True)
        self.client.force_login(admin)
        self.proveedor = Proveedor.objects.create(nombre='Distribuidora Test')
        self.insumo = Insumo.objects.create(nombre='Manzanilla a granel', unidad='kg', cantidad_disponible=10)

    def test_saldo_y_estado_de_pago(self):
        compra = Compra.objects.create(proveedor=self.proveedor, total=1000, pagado=0)
        self.assertEqual(compra.saldo(), 1000)
        self.assertEqual(compra.estado_pago(), 'pendiente')

        compra.pagado = 400
        self.assertEqual(compra.saldo(), 600)
        self.assertEqual(compra.estado_pago(), 'parcial')

        compra.pagado = 1000
        self.assertEqual(compra.saldo(), 0)
        self.assertEqual(compra.estado_pago(), 'pagado')

    def test_registrar_compra_con_insumo_repone_el_stock(self):
        respuesta = self.client.post('/api/compras/', {
            'proveedor': self.proveedor.id,
            'insumo': self.insumo.id,
            'cantidad': '25.00',
            'total': '5000.00',
        })

        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        self.insumo.refresh_from_db()
        self.assertEqual(self.insumo.cantidad_disponible, Decimal('35.00'))
