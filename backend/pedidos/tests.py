from django.contrib.auth import get_user_model
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


class ModoGranelTests(TestCase):
    """Cubre el precio dual (por kg / a granel) de una misma categoría: todo el pedido
    de esa categoría pasa a precio_granel si junta el mínimo total Y cada variedad
    elegida llega a su propio mínimo; si una sola variedad no llega, ninguna línea entra
    en modo granel (no se mezclan los dos precios en un mismo pedido)."""

    def setUp(self):
        self.categoria = Categoria.objects.create(
            nombre='Hierbas de prueba', unidad_medida='kg', cantidad_minima=10,
            granel_cantidad_minima=50, granel_cantidad_minima_variedad=10,
        )
        self.manzanilla = Producto.objects.create(
            categoria=self.categoria, nombre='Manzanilla', precio_base=1000, precio_granel=800,
        )
        self.tilo = Producto.objects.create(
            categoria=self.categoria, nombre='Tilo', precio_base=500, precio_granel=400,
        )

    def test_no_llega_al_total_granel_y_cobra_precio_normal(self):
        respuesta = self.client.post('/api/pedidos/', data={
            'items': [
                {'producto': self.manzanilla.id, 'cantidad': 15},
                {'producto': self.tilo.id, 'cantidad': 15},
            ],
        }, content_type='application/json')

        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        pedido = Pedido.objects.get(id=respuesta.data['id'])
        precios = {d.producto.nombre: d.precio_unitario for d in pedido.items.all()}
        self.assertEqual(precios['Manzanilla'], 1000)
        self.assertEqual(precios['Tilo'], 500)

    def test_llega_al_total_pero_una_variedad_no_llega_a_su_minimo_y_cobra_precio_normal(self):
        respuesta = self.client.post('/api/pedidos/', data={
            'items': [
                {'producto': self.manzanilla.id, 'cantidad': 45},
                {'producto': self.tilo.id, 'cantidad': 8},  # total 53kg, pero Tilo no llega a 10kg
            ],
        }, content_type='application/json')

        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        pedido = Pedido.objects.get(id=respuesta.data['id'])
        precios = {d.producto.nombre: d.precio_unitario for d in pedido.items.all()}
        self.assertEqual(precios['Manzanilla'], 1000)
        self.assertEqual(precios['Tilo'], 500)

    def test_cumple_total_y_minimo_por_variedad_y_cobra_precio_granel(self):
        respuesta = self.client.post('/api/pedidos/', data={
            'items': [
                {'producto': self.manzanilla.id, 'cantidad': 40},
                {'producto': self.tilo.id, 'cantidad': 10},
            ],
        }, content_type='application/json')

        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        pedido = Pedido.objects.get(id=respuesta.data['id'])
        precios = {d.producto.nombre: d.precio_unitario for d in pedido.items.all()}
        self.assertEqual(precios['Manzanilla'], 800)
        self.assertEqual(precios['Tilo'], 400)


class MinimoPorVariedadTests(TestCase):
    """Cubre la regla de "Hierbas a Granel" (10kg de cada variedad elegida, no solo el
    total de la categoría): a diferencia del mínimo de categoría, este es por producto."""

    def setUp(self):
        self.categoria = Categoria.objects.create(
            nombre='Granel de prueba', unidad_medida='kg', cantidad_minima=50, cantidad_minima_variedad=10,
        )
        self.manzanilla = Producto.objects.create(categoria=self.categoria, nombre='Manzanilla', precio_base=100)
        self.tilo = Producto.objects.create(categoria=self.categoria, nombre='Tilo', precio_base=100)

    def test_rechaza_si_alguna_variedad_elegida_no_llega_a_su_propio_minimo(self):
        respuesta = self.client.post('/api/pedidos/', data={
            'items': [
                {'producto': self.manzanilla.id, 'cantidad': 45},
                {'producto': self.tilo.id, 'cantidad': 5},  # cumple el total (50) pero no el mínimo por variedad (10)
            ],
        }, content_type='application/json')

        self.assertEqual(respuesta.status_code, 400)

    def test_pasa_si_cada_variedad_elegida_llega_a_su_propio_minimo(self):
        respuesta = self.client.post('/api/pedidos/', data={
            'items': [
                {'producto': self.manzanilla.id, 'cantidad': 40},
                {'producto': self.tilo.id, 'cantidad': 10},
            ],
        }, content_type='application/json')

        self.assertEqual(respuesta.status_code, 201, respuesta.content)


class EditarPedidoTests(TestCase):
    """Editar un pedido desde el admin (PATCH): se rehacen las líneas y se recalcula
    el precio congelado según el nuevo volumen total de la categoría."""

    def setUp(self):
        self.categoria = Categoria.objects.create(
            nombre='Categoría editable', unidad_medida='unidad', cantidad_minima=10,
        )
        EscalonPrecio.objects.create(categoria=self.categoria, cantidad_desde=10, precio_unitario=500)
        EscalonPrecio.objects.create(categoria=self.categoria, cantidad_desde=50, precio_unitario=400)
        self.manzanilla = Producto.objects.create(categoria=self.categoria, nombre='Manzanilla')
        self.tilo = Producto.objects.create(categoria=self.categoria, nombre='Tilo')

        alta = self.client.post('/api/pedidos/', data={
            'cliente': 'Dietética Sol',
            'items': [{'producto': self.manzanilla.id, 'cantidad': 12}],
        }, content_type='application/json')
        self.assertEqual(alta.status_code, 201, alta.content)
        self.pedido_id = alta.data['id']

        admin = get_user_model().objects.create_user('admin', password='x', is_staff=True)
        self.client.force_login(admin)

    def test_editar_reemplaza_items_y_recalcula_el_escalon(self):
        respuesta = self.client.patch(f'/api/pedidos/{self.pedido_id}/', data={
            'cliente': 'Dietética Sol',
            'items': [
                {'producto': self.manzanilla.id, 'cantidad': 30},
                {'producto': self.tilo.id, 'cantidad': 25},
            ],
        }, content_type='application/json')

        self.assertEqual(respuesta.status_code, 200, respuesta.content)
        pedido = Pedido.objects.get(id=self.pedido_id)
        detalles = {d.producto.nombre: d for d in pedido.items.all()}
        self.assertEqual(set(detalles), {'Manzanilla', 'Tilo'})
        # 55 unidades en total -> escalón de 50+ -> 400 c/u en todas las líneas.
        self.assertEqual(detalles['Manzanilla'].precio_unitario, 400)
        self.assertEqual(detalles['Tilo'].precio_unitario, 400)

    def test_editar_a_un_pedido_bajo_el_minimo_lo_rechaza(self):
        respuesta = self.client.patch(f'/api/pedidos/{self.pedido_id}/', data={
            'items': [{'producto': self.manzanilla.id, 'cantidad': 3}],
        }, content_type='application/json')

        self.assertEqual(respuesta.status_code, 400)
        # El pedido original queda intacto.
        pedido = Pedido.objects.get(id=self.pedido_id)
        self.assertEqual(pedido.items.count(), 1)
        self.assertEqual(pedido.items.first().cantidad, 12)
