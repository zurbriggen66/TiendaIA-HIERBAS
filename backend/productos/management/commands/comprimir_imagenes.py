"""Comando de una sola vez: pasa a WebP comprimido todo lo que ya estaba subido
ANTES de que el guardado empezara a comprimir solo (ver config/imagenes.py). Las
fotos nuevas ya se comprimen al subirlas — esto es solo para poner al día el
logo, los banners y las fotos de categoría/producto que ya estaban en el
servidor.

Uso: python manage.py comprimir_imagenes [--dry-run]
"""

from django.core.management.base import BaseCommand

from config.imagenes import comprimir_imagen
from negocio.models import ConfiguracionSitio
from productos.models import Categoria, ImagenCategoria, Producto

CAMPOS_CONFIGURACION = (
    'logo', 'logo_secundario', 'logo_precarga',
    'imagen_principal', 'imagen_banner_mayorista', 'imagen_quienes_somos',
)


class Command(BaseCommand):
    help = 'Comprime a WebP las imágenes que ya estaban subidas antes de este cambio.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Solo muestra qué se comprimiría, sin tocar nada.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        total_antes = 0
        total_despues = 0
        procesadas = 0

        def procesar(instancia, nombre_campo):
            nonlocal total_antes, total_despues, procesadas
            campo = getattr(instancia, nombre_campo)
            if not campo:
                return
            try:
                peso_antes = campo.size
            except (FileNotFoundError, OSError):
                self.stdout.write(self.style.WARNING(f'  falta el archivo en disco: {campo.name}'))
                return

            nombre_viejo = campo.name
            storage = campo.storage
            if dry_run:
                self.stdout.write(f'  {nombre_viejo} ({peso_antes // 1024} KB)')
                return

            comprimir_imagen(campo, forzar=True)
            instancia.save(update_fields=[nombre_campo])

            if campo.name != nombre_viejo and storage.exists(nombre_viejo):
                storage.delete(nombre_viejo)

            peso_despues = campo.size
            total_antes += peso_antes
            total_despues += peso_despues
            procesadas += 1
            self.stdout.write(f'  {nombre_viejo} -> {campo.name}  ({peso_antes // 1024} KB -> {peso_despues // 1024} KB)')

        self.stdout.write('Configuración del sitio:')
        for config in ConfiguracionSitio.objects.all():
            for campo in CAMPOS_CONFIGURACION:
                procesar(config, campo)

        self.stdout.write('Categorías:')
        for categoria in Categoria.objects.all():
            procesar(categoria, 'imagen')

        self.stdout.write('Galería de categorías:')
        for foto in ImagenCategoria.objects.all():
            procesar(foto, 'imagen')

        self.stdout.write('Productos:')
        for producto in Producto.objects.all():
            procesar(producto, 'imagen')

        if dry_run:
            self.stdout.write(self.style.SUCCESS('Dry-run: no se modificó nada.'))
            return

        ahorro = total_antes - total_despues
        pct = (ahorro / total_antes * 100) if total_antes else 0
        self.stdout.write(self.style.SUCCESS(
            f'\n{procesadas} imágenes procesadas. {total_antes // 1024} KB -> {total_despues // 1024} KB '
            f'(ahorro de {ahorro // 1024} KB, {pct:.0f}%).'
        ))
