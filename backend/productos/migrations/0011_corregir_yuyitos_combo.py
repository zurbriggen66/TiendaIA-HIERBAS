# El cliente aclaró (imagen del flyer "Toppings de Hierbas Naturales", 31/08): son 8
# variedades sueltas a $3.000 la unidad, con compra mínima de 50 unidades SURTIDAS (se
# combinan variedades, como Blends). La categoría había quedado mal cargada como "por
# caja" con mínimo 1 cuando ya se cargaron los 8 productos — por eso no aparecía el
# aviso de "compra mínima combinando variedades" que ya existe para Blends, y se sentía
# como si faltara una forma de armar el pedido: en realidad faltaba este dato.
from django.db import migrations


def corregir(apps, schema_editor):
    Categoria = apps.get_model('productos', 'Categoria')
    c = Categoria.objects.filter(nombre='Yuyitos Combo Emprendedor').first()
    if not c:
        return
    c.unidad_medida = 'unidad'
    c.cantidad_minima = 50
    c.descripcion = (
        'Elegí entre nuestras variedades y combiná hasta llegar al mínimo de 50 '
        'unidades surtidas. 100% naturales, ideales para mate, té e infusiones.'
    )
    c.save(update_fields=['unidad_medida', 'cantidad_minima', 'descripcion'])


def deshacer(apps, schema_editor):
    Categoria = apps.get_model('productos', 'Categoria')
    c = Categoria.objects.filter(nombre='Yuyitos Combo Emprendedor').first()
    if not c:
        return
    c.unidad_medida = 'caja'
    c.cantidad_minima = 1
    c.descripcion = 'Cajas de paquetitos surtidos de 25/30g, pensadas para reventa.'
    c.save(update_fields=['unidad_medida', 'cantidad_minima', 'descripcion'])


class Migration(migrations.Migration):

    dependencies = [
        ('productos', '0010_recrear_hierbas_a_granel'),
    ]

    operations = [
        migrations.RunPython(corregir, deshacer),
    ]
