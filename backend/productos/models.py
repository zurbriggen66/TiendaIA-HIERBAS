from decimal import Decimal

from django.db import models
from django.utils.text import slugify


class Categoria(models.Model):
    UNIDADES = [
        ('kg', 'Kilogramo'),
        ('pack', 'Pack'),
        ('caja', 'Caja'),
        ('unidad', 'Unidad'),
    ]

    nombre = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    descripcion = models.TextField(blank=True)
    imagen = models.ImageField(upload_to='productos/categorias/', null=True, blank=True)
    unidad_medida = models.CharField(max_length=10, choices=UNIDADES, default='kg')
    # Cantidad mínima (en unidad_medida) que hay que juntar ENTRE TODOS los productos de
    # esta categoría para poder cerrar el pedido (ej: 5 packs de La Paz, 40kg de Importadas
    # repartidos como se quiera entre variedades). Se valida contra la suma del carrito
    # para la categoría, no contra cada producto por separado.
    cantidad_minima = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    orden = models.PositiveIntegerField(default=0)
    activa = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['orden', 'nombre']
        verbose_name_plural = 'Categorías'

    def __str__(self):
        return self.nombre

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.nombre)
        super().save(*args, **kwargs)

    def precio_para_cantidad(self, cantidad):
        """Precio por unidad del escalón alcanzado con `cantidad` total de la categoría
        (el escalón más alto cuyo mínimo no supera la cantidad). None si no hay ningún
        escalón cargado todavía o la cantidad no llega al primero."""
        escalon = self.escalones.filter(cantidad_desde__lte=cantidad).order_by('-cantidad_desde').first()
        return escalon.precio_unitario if escalon else None


class EscalonPrecio(models.Model):
    """Precio mayorista por volumen: a partir de `cantidad_desde` unidades/kg/packs
    comprados EN TOTAL dentro de la categoría, cada unidad de esa categoría en el
    pedido pasa a costar `precio_unitario` (precio fijo por escalón, no un %)."""

    categoria = models.ForeignKey(Categoria, related_name='escalones', on_delete=models.CASCADE)
    etiqueta = models.CharField(max_length=100, blank=True, help_text='Ej: "Pallet mayorista"')
    cantidad_desde = models.DecimalField(max_digits=10, decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['categoria', 'cantidad_desde']
        unique_together = ('categoria', 'cantidad_desde')

    def __str__(self):
        return f'{self.categoria.nombre}: desde {self.cantidad_desde} → ${self.precio_unitario}'


class Producto(models.Model):
    categoria = models.ForeignKey(Categoria, related_name='productos', on_delete=models.PROTECT)
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    # Ej: "Pack x10 (500g c/u)", "Bolsa 30g", "Caja x50 paquetes surtidos".
    contenido = models.CharField(max_length=100, blank=True)
    # Solo se usa si la categoría NO tiene escalones de precio cargados (ej. las cajas de
    # precio fijo de Yuyitos). Si la categoría tiene escalones, esos mandan y este campo
    # se ignora — ver Producto.precio_para_cantidad_categoria.
    precio_base = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    imagen = models.ImageField(upload_to='productos/productos/', null=True, blank=True)
    destacado = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)
    orden = models.PositiveIntegerField(default=0)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['categoria', 'orden', 'nombre']

    def __str__(self):
        return self.nombre

    def precio_para_cantidad_categoria(self, cantidad_categoria):
        """Precio unitario vigente para este producto, dada la cantidad TOTAL ya
        acumulada en su categoría (todas las variedades juntas, no solo esta)."""
        precio_escalon = self.categoria.precio_para_cantidad(cantidad_categoria)
        if precio_escalon is not None:
            return precio_escalon
        return self.precio_base or Decimal('0')
