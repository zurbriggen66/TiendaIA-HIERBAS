from django.db import migrations
from django.utils.text import slugify


CATEGORIAS = [
    dict(orden=1, nombre='Hierbas Serranas La Paz', unidad_medida='pack', cantidad_minima=5,
         descripcion='Packs de 10 unidades de 500g, directo de fábrica (Traslasierra, Córdoba).'),
    dict(orden=2, nombre='Hierbas Medicinales por Kg', unidad_medida='kg', cantidad_minima=10,
         descripcion='Lista de hierbas medicinales vendidas por kilo.'),
    dict(orden=3, nombre='Blends Artesanales', unidad_medida='unidad', cantidad_minima=10,
         descripcion='Mezclas propias, 10 variedades. Se puede armar el pedido combinando variedades.'),
    dict(orden=4, nombre='Yuyitos Combo Emprendedor', unidad_medida='caja', cantidad_minima=1,
         descripcion='Cajas de paquetitos surtidos de 25/30g, pensadas para reventa.'),
    dict(orden=5, nombre='Hierbas Importadas', unidad_medida='kg', cantidad_minima=40,
         descripcion='Envíos a todo el país. Se puede variar dentro del mínimo entre distintas variedades.'),
    dict(orden=6, nombre='Hierbas a Granel', unidad_medida='kg', cantidad_minima=50,
         descripcion='Compra combinando variedades hasta llegar al mínimo.'),
]


def crear_categorias(apps, schema_editor):
    # Los modelos históricos de una migración no corren el save() personalizado del
    # modelo real (el que autogenera el slug), así que acá hay que armarlo a mano.
    Categoria = apps.get_model('productos', 'Categoria')
    for datos in CATEGORIAS:
        Categoria.objects.get_or_create(nombre=datos['nombre'], defaults={**datos, 'slug': slugify(datos['nombre'])})


def eliminar_categorias(apps, schema_editor):
    Categoria = apps.get_model('productos', 'Categoria')
    Categoria.objects.filter(nombre__in=[c['nombre'] for c in CATEGORIAS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('productos', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(crear_categorias, eliminar_categorias),
    ]
