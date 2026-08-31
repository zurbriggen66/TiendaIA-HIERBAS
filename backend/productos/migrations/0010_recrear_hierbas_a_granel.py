# El cliente redefinió la regla de negocio (mensaje del 31/08): "a granel" deja de ser
# un precio que se desbloquea acumulando kilos en "Hierbas Medicinales por Kg" (eso se
# apaga acá abajo) y pasa a ser una categoría propia, con su propio catálogo, donde cada
# variedad se compra en una cantidad fija —25, 50 o 100kg— al precio por kilo que ya
# estaba guardado en Producto.precio_granel (que es justo el precio de esa tabla: el
# mismo por kilo, sin importar si se llevan 25, 50 o 100).
from decimal import Decimal

from django.db import migrations


CANTIDADES_FIJAS = [Decimal('25'), Decimal('50'), Decimal('100')]


def crear(apps, schema_editor):
    Categoria = apps.get_model('productos', 'Categoria')
    Producto = apps.get_model('productos', 'Producto')
    CantidadFija = apps.get_model('productos', 'CantidadFija')

    por_kg = Categoria.objects.get(nombre='Hierbas Medicinales por Kg')

    # El modo granel viejo (desbloquear precio acumulando) queda apagado para esta
    # categoría — ahora "a granel" vive aparte, con reglas propias.
    por_kg.granel_cantidad_minima = 0
    por_kg.granel_cantidad_minima_variedad = 0
    por_kg.save(update_fields=['granel_cantidad_minima', 'granel_cantidad_minima_variedad'])

    granel = Categoria.objects.create(
        nombre='Hierbas a Granel',
        descripcion='Comprá hierbas a granel en cantidad.',
        unidad_medida='kg',
        cantidad_minima=0,
        cantidad_minima_variedad=0,
        granel_cantidad_minima=0,
        granel_cantidad_minima_variedad=0,
        venta_cantidad_fija=True,
        orden=6,
        activa=True,
    )
    for cantidad in CANTIDADES_FIJAS:
        CantidadFija.objects.create(categoria=granel, cantidad=cantidad)

    creados = 0
    for producto in Producto.objects.filter(categoria=por_kg, precio_granel__isnull=False):
        nuevo = Producto.objects.create(
            categoria=granel,
            nombre=producto.nombre,
            descripcion=producto.descripcion,
            contenido=producto.contenido,
            precio_base=producto.precio_granel,
            activo=True,
            orden=producto.orden,
        )
        # Copia la referencia al mismo archivo ya subido (no duplica el archivo en sí,
        # solo la fila apunta a la misma imagen) para no dejar 72 productos sin foto.
        if producto.imagen:
            nuevo.imagen = producto.imagen.name
            nuevo.save(update_fields=['imagen'])
        creados += 1
    print(f'Hierbas a Granel: {creados} productos creados.')


def deshacer(apps, schema_editor):
    Categoria = apps.get_model('productos', 'Categoria')
    Categoria.objects.filter(nombre='Hierbas a Granel').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('productos', '0009_categoria_venta_cantidad_fija_cantidadfija'),
    ]

    operations = [
        migrations.RunPython(crear, deshacer),
    ]
