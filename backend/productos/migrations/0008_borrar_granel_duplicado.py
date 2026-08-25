# Desactivar "Hierbas a Granel" (migración 0006/0007) no alcanzaba: el admin sigue
# listando esos 72 productos duplicados igual, así que el dueño terminaba cargándoles
# imagen dos veces (una ahí y otra en su par real de "Hierbas Medicinales por Kg") sin
# ninguna razón, porque el precio a granel ya vive en Producto.precio_granel. Se
# verificó antes de escribir esto que ningún pedido los referencia. Se borran del todo.
from django.db import migrations


def borrar(apps, schema_editor):
    Categoria = apps.get_model('productos', 'Categoria')
    Producto = apps.get_model('productos', 'Producto')

    granel = Categoria.objects.filter(nombre='Hierbas a Granel').first()
    if not granel:
        return
    Producto.objects.filter(categoria=granel).delete()
    granel.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('productos', '0007_redesactivar_granel_duplicado'),
    ]

    operations = [
        migrations.RunPython(borrar, migrations.RunPython.noop),
    ]
