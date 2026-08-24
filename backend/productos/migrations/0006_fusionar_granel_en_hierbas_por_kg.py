# El cliente aclaró (audio de WhatsApp, 24/08) que "por kg" y "a granel" NO son dos
# listas de compra separadas: es el MISMO catálogo, y cada producto tiene un segundo
# precio (más barato) que se desbloquea para TODO el pedido cuando junta 50kg en total
# Y cada variedad elegida llega a 10kg. Por eso la categoría "Hierbas a Granel" que se
# había cargado como lista aparte queda redundante: se pasa su precio a precio_granel
# de "Hierbas Medicinales por Kg" y se desactiva (no se borra, por las dudas).
from django.db import migrations


def fusionar(apps, schema_editor):
    Categoria = apps.get_model('productos', 'Categoria')
    Producto = apps.get_model('productos', 'Producto')

    por_kg = Categoria.objects.get(nombre='Hierbas Medicinales por Kg')
    granel = Categoria.objects.get(nombre='Hierbas a Granel')

    por_kg.granel_cantidad_minima = 50
    por_kg.granel_cantidad_minima_variedad = 10
    por_kg.save(update_fields=['granel_cantidad_minima', 'granel_cantidad_minima_variedad'])

    precios_granel = dict(Producto.objects.filter(categoria=granel).values_list('nombre', 'precio_base'))
    for producto in Producto.objects.filter(categoria=por_kg):
        precio = precios_granel.get(producto.nombre)
        if precio is not None:
            producto.precio_granel = precio
            producto.save(update_fields=['precio_granel'])

    Producto.objects.filter(categoria=granel).update(activo=False)
    granel.activa = False
    granel.save(update_fields=['activa'])


def deshacer(apps, schema_editor):
    Categoria = apps.get_model('productos', 'Categoria')
    Producto = apps.get_model('productos', 'Producto')

    por_kg = Categoria.objects.get(nombre='Hierbas Medicinales por Kg')
    granel = Categoria.objects.get(nombre='Hierbas a Granel')

    por_kg.granel_cantidad_minima = 0
    por_kg.granel_cantidad_minima_variedad = 0
    por_kg.save(update_fields=['granel_cantidad_minima', 'granel_cantidad_minima_variedad'])

    Producto.objects.filter(categoria=por_kg).update(precio_granel=None)
    Producto.objects.filter(categoria=granel).update(activo=True)
    granel.activa = True
    granel.save(update_fields=['activa'])


class Migration(migrations.Migration):

    dependencies = [
        ('productos', '0005_categoria_granel_cantidad_minima_and_more'),
    ]

    operations = [
        migrations.RunPython(fusionar, deshacer),
    ]
