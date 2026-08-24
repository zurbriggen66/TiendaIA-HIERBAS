# Carga el catálogo real que pasó el cliente: mismas ~70 variedades de hierba en dos
# listas de precio distintas (por Kg = lista de fábrica, a Granel = lista con descuento),
# más los 10 blends artesanales. Ver conversación con el cliente para el origen de estos
# precios (listas "Hierbas por kg Junio 2026" y "Lista_Precios_Hierbas_Medicinales_2026").
from django.db import migrations

# nombre: (precio por Kg, precio a Granel)
HIERBAS = {
    'Ajenjo': (6072, 5520),
    'Alcachofa': (6325, 5750),
    'Amargon': (6958, 6325),
    'Apio': (6325, 5750),
    'Artemisa': (6072, 5520),
    'Atamique': (4428, 4025),
    'Baila bien': (6325, 5750),
    'Bardana': (9235, 8395),
    'Burrito': (8855, 8050),
    'Cachiyuyo': (5060, 4600),
    'Cancha del agua': (10120, 9200),
    'Carqueja': (4807, 4370),
    'Cáscara de chañar': (5060, 4600),
    'Cedrón hoja': (16445, 14950),
    'Cedrón molido 70/30': (6958, 6325),
    'Cola de caballo': (6958, 6325),
    'Cola de quirquincho': (16445, 14950),
    'Eucaliptus': (7590, 6900),
    'Espina colorada': (5693, 5175),
    'Fresno': (7590, 6900),
    'Hibiscus': (19800, 18000),
    'Higuera hoja': (5187, 4715),
    'Hisopo': (12650, 11500),
    'Incayuyo hoja': (10120, 9200),
    'Incayuyo palo': (6325, 5750),
    'Jarilla hoja': (5693, 5175),
    'Jaramajo': (5693, 5175),
    'Laurel': (12650, 11500),
    'Llantén': (11385, 10350),
    'Malva': (6958, 6325),
    'Manzanilla': (36300, 33000),
    'Marcela': (6325, 5750),
    'Melisa hoja': (16445, 14950),
    'Melisa molida': (7920, 7200),
    'Menta 70/30': (6325, 5750),
    'Menta hoja': (9488, 8625),
    'Menta palo': (2530, 2300),
    'Menta peperita': (15180, 13800),
    'Muérdago o Ligia': (6705, 6095),
    'Muña muña': (7590, 6900),
    'Nogal hoja': (4428, 4025),
    'Ombú': (6705, 6095),
    'Orégano': (5693, 5175),
    'Ortiga': (7590, 6900),
    'Paico': (7590, 6900),
    'Pájaro bobo': (6325, 5750),
    'Palo azul': (5060, 4600),
    'Palo pichi': (5060, 4600),
    'Palo santo': (6325, 5750),
    'Pasionaria': (7464, 6785),
    'Peperina 70/30': (17710, 16100),
    'Peperina hoja': (24035, 21850),
    'Poleo': (8855, 8050),
    'Pulmonaria': (7590, 6900),
    'Quebracho': (5060, 4600),
    'Quiebra arado': (6325, 5750),
    'Romero': (8855, 8050),
    'Ruda': (6325, 5750),
    'Salvia blanca': (7970, 7245),
    'Sanguinaria': (4807, 4370),
    'Suico': (5693, 5175),
    'Toronjil molido': (6705, 6095),
    'Usio hoja': (9235, 8395),
    'Vira vira': (5693, 5175),
    'Yerba buena molida': (6325, 5750),
    'Yerba carnicera': (6072, 5520),
    'Yerba de la perdís': (5693, 5175),
    'Yerba de pollo': (6958, 6325),
    'Yerba de sapo': (6325, 5750),
    'Yerba Larca': (5693, 5175),
    'Yerba lucera': (5693, 5175),
    'Yerba meona': (5693, 5175),
}

# nombre: descripción (ingredientes, según el flyer del cliente)
BLENDS = {
    'Blend Momentos': 'Menta, cedrón y té de burro.',
    'Blend Armonía': 'Melisa, pasionaria y poleo criollo.',
    'Blend Fortalecedor': 'Romero, peperina y cáscara de naranja.',
    'Blend Campestre': 'Poleo criollo, menta y toronjil.',
    'Blend Bienestar': 'Yerba del sapo, matico y manzanilla.',
    'Blend Afrodisíaco': 'Baila bien, muña muña y cola de quirquincho.',
    'Blend Cólicos': 'Manzanilla, menta y jengibre.',
    'Blend Diurético': 'Cola de caballo, palo azul y sanguinaria.',
    'Blend Sabor de la Sierra': 'Marcela, té de burro y salvia blanca.',
    'Blend Descongestivo': 'Eucalipto, menta y pulmonaria.',
}


def cargar_catalogo(apps, schema_editor):
    Categoria = apps.get_model('productos', 'Categoria')
    Producto = apps.get_model('productos', 'Producto')
    EscalonPrecio = apps.get_model('productos', 'EscalonPrecio')

    por_kg = Categoria.objects.get(nombre='Hierbas Medicinales por Kg')
    granel = Categoria.objects.get(nombre='Hierbas a Granel')
    importadas = Categoria.objects.get(nombre='Hierbas Importadas')
    blends = Categoria.objects.get(nombre='Blends Artesanales')

    # Mínimo por variedad dentro del pedido: el total de la categoría (cantidad_minima)
    # ya estaba cargado; esto es lo nuevo (10kg/variedad en Granel, 5kg/variedad en
    # Importadas, según lo que pidió el cliente).
    granel.cantidad_minima_variedad = 10
    granel.save(update_fields=['cantidad_minima_variedad'])
    importadas.cantidad_minima_variedad = 5
    importadas.save(update_fields=['cantidad_minima_variedad'])

    for orden, (nombre, (precio_kg, precio_granel)) in enumerate(HIERBAS.items(), start=1):
        Producto.objects.update_or_create(
            categoria=por_kg, nombre=nombre,
            defaults={'precio_base': precio_kg, 'orden': orden, 'activo': True},
        )
        Producto.objects.update_or_create(
            categoria=granel, nombre=nombre,
            defaults={'precio_base': precio_granel, 'orden': orden, 'activo': True},
        )

    for orden, (nombre, descripcion) in enumerate(BLENDS.items(), start=1):
        Producto.objects.update_or_create(
            categoria=blends, nombre=nombre,
            defaults={'descripcion': descripcion, 'orden': orden, 'activo': True},
        )

    # Precio plano por unidad a partir del mínimo de compra (10): el flyer del cliente
    # trae tramos de 1-5 y 5-10 unidades que no aplican acá porque el mínimo ya es 10.
    # Falta confirmar el precio mayorista a partir de 50 unidades.
    EscalonPrecio.objects.update_or_create(
        categoria=blends, cantidad_desde=10, defaults={'etiqueta': 'Por unidad', 'precio_unitario': 3000},
    )


def revertir_catalogo(apps, schema_editor):
    Categoria = apps.get_model('productos', 'Categoria')
    Producto = apps.get_model('productos', 'Producto')

    por_kg = Categoria.objects.get(nombre='Hierbas Medicinales por Kg')
    granel = Categoria.objects.get(nombre='Hierbas a Granel')
    blends = Categoria.objects.get(nombre='Blends Artesanales')

    Producto.objects.filter(categoria=por_kg, nombre__in=HIERBAS.keys()).delete()
    Producto.objects.filter(categoria=granel, nombre__in=HIERBAS.keys()).delete()
    Producto.objects.filter(categoria=blends, nombre__in=BLENDS.keys()).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('productos', '0003_categoria_cantidad_minima_variedad'),
    ]

    operations = [
        migrations.RunPython(cargar_catalogo, revertir_catalogo),
    ]
