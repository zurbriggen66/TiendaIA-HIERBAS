from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from pedidos.models import DetallePedido, Pago, Pedido
from productos.models import Categoria, Producto


class EstadisticasPorRangoDeFechasTests(TestCase):
    def _crear_pedido(self, fecha, metodo, monto):
        pedido = Pedido.objects.create(confirmado=True)
        Pedido.objects.filter(id=pedido.id).update(creado=fecha)
        pedido.refresh_from_db()
        DetallePedido.objects.create(pedido=pedido, producto=self.producto, cantidad=1, precio_unitario=monto)
        Pago.objects.create(pedido=pedido, metodo=metodo, monto=monto)
        return pedido

    def setUp(self):
        admin = User.objects.create_user('admin-test', is_staff=True)
        self.client.force_login(admin)
        categoria = Categoria.objects.create(nombre='Categoría de prueba (estadísticas)')
        self.producto = Producto.objects.create(categoria=categoria, nombre='Manzanilla', precio_base=1000)
        self._crear_pedido('2026-08-13T12:00:00Z', 'efectivo', Decimal('1000'))
        self._crear_pedido('2026-08-13T18:00:00Z', 'transferencia', Decimal('500'))
        self._crear_pedido('2026-08-14T12:00:00Z', 'efectivo', Decimal('9000'))

    def test_filtra_ventas_y_metodos_de_pago_solo_del_rango_pedido(self):
        respuesta = self.client.get('/api/estadisticas/', {'desde': '2026-08-13', 'hasta': '2026-08-13'})
        datos = respuesta.json()

        self.assertEqual(Decimal(str(datos['ventas_totales'])), Decimal('1500'))
        self.assertEqual(datos['total_pedidos'], 2)
        self.assertEqual(Decimal(str(datos['ticket_promedio'])), Decimal('750'))

        metodos = {f['metodo']: Decimal(str(f['total'])) for f in datos['ventas_por_metodo']}
        self.assertEqual(metodos, {'efectivo': Decimal('1000'), 'transferencia': Decimal('500')})

        # Las 3 ventas del fixture son del mismo producto (misma categoría); en el rango
        # de un solo día entran 2 de ellas ($1000 + $500).
        por_categoria = {c['categoria_nombre']: Decimal(str(c['total'])) for c in datos['ventas_por_categoria']}
        self.assertEqual(por_categoria, {'Categoría de prueba (estadísticas)': Decimal('1500')})
