from django.test import TestCase

from .models import Pedido
from productos.models import Categoria, EscalonPrecio, Producto


class MinimoYEscalonPorCategoriaTests(TestCase):
    """Cubre la regla de negocio central de esta etapa: el mínimo de compra y el precio
    por volumen se calculan sumando TODAS las variedades que el cliente eligió dentro de
    una misma categoría, no producto por producto."""

    def setUp(self):
        self.categoria = Categoria.objects.create(
            nombre='Categoría de prueba (unidades)', unidad_medida='unidad', cantidad_minima=10,
        )
        EscalonPrecio.objects.create(categoria=self.categoria, cantidad_desde=10, precio_unitario=500)
        EscalonPrecio.objects.create(categoria=self.categoria, cantidad_desde=50, precio_unitario=400)
        self.manzanilla = Producto.objects.create(categoria=self.categoria, nombre='Manzanilla')
        self.tilo = Producto.objects.create(categoria=self.categoria, nombre='Tilo')

    def test_rechaza_el_pedido_si_no_llega_al_minimo_de_la_categoria(self):
        respuesta = self.client.post('/api/pedidos/', data={
            'items': [
                {'producto': self.manzanilla.id, 'cantidad': 3},
                {'producto': self.tilo.id, 'cantidad': 4},
            ],
        }, content_type='application/json')

        self.assertEqual(respuesta.status_code, 400)

    def test_combinar_variedades_hasta_el_minimo_pasa_y_usa_el_escalon_correcto(self):
        respuesta = self.client.post('/api/pedidos/', data={
            'items': [
                {'producto': self.manzanilla.id, 'cantidad': 6},
                {'producto': self.tilo.id, 'cantidad': 4},
            ],
        }, content_type='application/json')

        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        pedido = Pedido.objects.get(id=respuesta.data['id'])
        for detalle in pedido.items.all():
            self.assertEqual(detalle.precio_unitario, 500)

    def test_escalon_sube_cuando_el_total_de_la_categoria_supera_el_siguiente_umbral(self):
        respuesta = self.client.post('/api/pedidos/', data={
            'items': [
                {'producto': self.manzanilla.id, 'cantidad': 30},
                {'producto': self.tilo.id, 'cantidad': 20},
            ],
        }, content_type='application/json')

        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        pedido = Pedido.objects.get(id=respuesta.data['id'])
        for detalle in pedido.items.all():
            self.assertEqual(detalle.precio_unitario, 400)
