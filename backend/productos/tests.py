from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from django.core.files.base import ContentFile

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


class CompresionDeImagenesTests(TestCase):
    """La compresión a WebP vive en config/imagenes.py (compartida con `negocio`);
    acá se prueba enchufada a un modelo real, como se usa en la práctica."""

    def _crear_imagen(self, ancho=2000, alto=2000, formato='PNG'):
        from io import BytesIO
        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image

        buffer = BytesIO()
        Image.new('RGB', (ancho, alto), color='green').save(buffer, format=formato)
        return SimpleUploadedFile(f'foto.{formato.lower()}', buffer.getvalue(), content_type=f'image/{formato.lower()}')

    def test_una_imagen_grande_se_guarda_como_webp_achicada(self):
        categoria = Categoria.objects.create(nombre='Con foto', unidad_medida='kg')
        producto = Producto.objects.create(categoria=categoria, nombre='Manzanilla', imagen=self._crear_imagen())

        self.assertTrue(producto.imagen.name.endswith('.webp'))
        from PIL import Image
        with Image.open(producto.imagen) as img:
            self.assertLessEqual(max(img.size), 1600)

    def test_no_recomprime_en_un_save_posterior_sin_cambiar_la_imagen(self):
        categoria = Categoria.objects.create(nombre='Con foto 2', unidad_medida='kg')
        producto = Producto.objects.create(categoria=categoria, nombre='Tilo', imagen=self._crear_imagen())
        nombre_original = producto.imagen.name

        producto.destacado = True
        producto.save()

        self.assertEqual(producto.imagen.name, nombre_original)


class ComandoComprimirImagenesTests(TestCase):
    """El comando `comprimir_imagenes` es para las fotos que ya estaban subidas antes
    de este cambio (`forzar=True`, salta el guard que evita recomprimir). Se prueba
    contra el manejo real de archivos (no mockeado), incluido el borrado del
    original, porque ahí es donde falló la primera vez (archivo todavía abierto)."""

    def _crear_imagen_sin_comprimir(self, categoria):
        # Salteamos Producto.save() (que ya comprimiría solo) escribiendo el archivo
        # directo con el storage, para simular una foto subida ANTES de este cambio.
        from io import BytesIO
        from PIL import Image

        producto = Producto.objects.create(categoria=categoria, nombre='Sin comprimir')
        buffer = BytesIO()
        Image.new('RGB', (2000, 2000), color='blue').save(buffer, format='PNG')
        producto.imagen.storage.save('productos/productos/original.png', ContentFile(buffer.getvalue()))
        Producto.objects.filter(pk=producto.pk).update(imagen='productos/productos/original.png')
        return Producto.objects.get(pk=producto.pk)

    def test_comprime_y_borra_el_archivo_original(self):
        from django.core.management import call_command

        categoria = Categoria.objects.create(nombre='Comando test', unidad_medida='kg')
        producto = self._crear_imagen_sin_comprimir(categoria)
        storage = producto.imagen.storage
        nombre_original = producto.imagen.name
        self.assertTrue(storage.exists(nombre_original))

        call_command('comprimir_imagenes')

        producto.refresh_from_db()
        self.assertTrue(producto.imagen.name.endswith('.webp'))
        self.assertFalse(storage.exists(nombre_original))
        self.assertTrue(storage.exists(producto.imagen.name))

    def test_dry_run_no_modifica_nada(self):
        from django.core.management import call_command

        categoria = Categoria.objects.create(nombre='Comando dry-run', unidad_medida='kg')
        producto = self._crear_imagen_sin_comprimir(categoria)
        nombre_original = producto.imagen.name

        call_command('comprimir_imagenes', '--dry-run')

        producto.refresh_from_db()
        self.assertEqual(producto.imagen.name, nombre_original)
