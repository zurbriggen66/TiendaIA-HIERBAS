# La migración 0006 ya había desactivado "Hierbas a Granel" por redundante (el precio
# a granel vive en Producto.precio_granel de "Hierbas Medicinales por Kg" desde
# entonces). Un comando posterior la reactivó por error, creyendo que la categoría
# inactiva era un bug de visibilidad. Esta migración vuelve a dejarla como estaba.
from django.db import migrations


def desactivar(apps, schema_editor):
    Categoria = apps.get_model('productos', 'Categoria')
    Producto = apps.get_model('productos', 'Producto')

    granel = Categoria.objects.get(nombre='Hierbas a Granel')
    Producto.objects.filter(categoria=granel).update(activo=False)
    granel.activa = False
    granel.save(update_fields=['activa'])


def reactivar(apps, schema_editor):
    Categoria = apps.get_model('productos', 'Categoria')
    Producto = apps.get_model('productos', 'Producto')

    granel = Categoria.objects.get(nombre='Hierbas a Granel')
    Producto.objects.filter(categoria=granel).update(activo=True)
    granel.activa = True
    granel.save(update_fields=['activa'])


class Migration(migrations.Migration):

    dependencies = [
        ('productos', '0006_fusionar_granel_en_hierbas_por_kg'),
    ]

    operations = [
        migrations.RunPython(desactivar, reactivar),
    ]
