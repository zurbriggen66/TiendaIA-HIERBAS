from decimal import Decimal

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
