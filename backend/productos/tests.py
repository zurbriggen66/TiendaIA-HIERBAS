from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Categoria, EscalonPrecio, Producto


class PrecioPorEscalonTests(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(
            nombre='Categoría de prueba (packs)', unidad_medida='pack', cantidad_minima=5,
        )
        EscalonPrecio.objects.create(categoria=self.categoria, cantidad_desde=5, precio_unitario=1000)
        EscalonPrecio.objects.create(categoria=self.categoria, cantidad_desde=20, precio_unitario=900)
        EscalonPrecio.objects.create(categoria=self.categoria, cantidad_desde=50, precio_unitario=800)
        self.producto = Producto.objects.create(categoria=self.categoria, nombre='Manzanilla')

    def test_por_debajo_del_primer_escalon_no_tiene_precio(self):
        self.assertIsNone(self.categoria.precio_para_cantidad(4))

    def test_toma_el_escalon_mas_alto_que_no_supera_la_cantidad(self):
        self.assertEqual(self.categoria.precio_para_cantidad(5), Decimal('1000'))
        self.assertEqual(self.categoria.precio_para_cantidad(19), Decimal('1000'))
        self.assertEqual(self.categoria.precio_para_cantidad(20), Decimal('900'))
        self.assertEqual(self.categoria.precio_para_cantidad(100), Decimal('800'))

    def test_producto_usa_el_escalon_de_su_categoria(self):
        self.assertEqual(self.producto.precio_para_cantidad_categoria(20), Decimal('900'))

    def test_producto_sin_escalones_usa_precio_base(self):
        categoria_sin_escalones = Categoria.objects.create(nombre='Yuyitos', unidad_medida='caja')
        producto = Producto.objects.create(categoria=categoria_sin_escalones, nombre='Caja x50', precio_base=5000)
        self.assertEqual(producto.precio_para_cantidad_categoria(1), Decimal('5000'))


class AjusteMasivoDePreciosTests(TestCase):
    def setUp(self):
        self.cat_a = Categoria.objects.create(nombre='Hierbas A', unidad_medida='kg')
        self.cat_b = Categoria.objects.create(nombre='Hierbas B', unidad_medida='kg')
        self.p_a = Producto.objects.create(categoria=self.cat_a, nombre='Manzanilla', precio_base=1000, precio_granel=800)
        self.p_b = Producto.objects.create(categoria=self.cat_b, nombre='Tilo', precio_base=500)
        self.esc_a = EscalonPrecio.objects.create(categoria=self.cat_a, cantidad_desde=10, precio_unitario=2000)
        admin = get_user_model().objects.create_user('admin', password='x', is_staff=True)
        self.client.force_login(admin)

    def test_porcentaje_sube_precios_base_granel_y_escalones(self):
        resp = self.client.post('/api/productos/ajuste-masivo/', data={'modo': 'porcentaje', 'valor': 10},
                                content_type='application/json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.p_a.refresh_from_db(); self.esc_a.refresh_from_db(); self.p_b.refresh_from_db()
        self.assertEqual(self.p_a.precio_base, Decimal('1100'))
        self.assertEqual(self.p_a.precio_granel, Decimal('880'))
        self.assertEqual(self.esc_a.precio_unitario, Decimal('2200'))
        self.assertEqual(self.p_b.precio_base, Decimal('550'))

    def test_monto_fijo_acotado_a_una_categoria(self):
        resp = self.client.post('/api/productos/ajuste-masivo/',
                                data={'modo': 'monto', 'valor': 300, 'categoria': self.cat_a.id},
                                content_type='application/json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.p_a.refresh_from_db(); self.p_b.refresh_from_db(); self.esc_a.refresh_from_db()
        self.assertEqual(self.p_a.precio_base, Decimal('1300'))
        self.assertEqual(self.esc_a.precio_unitario, Decimal('2300'))
        self.assertEqual(self.p_b.precio_base, Decimal('500'))  # cat_b intacta

    def test_no_deja_precios_negativos(self):
        resp = self.client.post('/api/productos/ajuste-masivo/', data={'modo': 'monto', 'valor': -99999},
                                content_type='application/json')
        self.assertEqual(resp.status_code, 200, resp.content)
        self.p_a.refresh_from_db()
        self.assertEqual(self.p_a.precio_base, Decimal('0'))

    def test_valor_invalido_da_400(self):
        resp = self.client.post('/api/productos/ajuste-masivo/', data={'modo': 'porcentaje', 'valor': 'abc'},
                                content_type='application/json')
        self.assertEqual(resp.status_code, 400)
