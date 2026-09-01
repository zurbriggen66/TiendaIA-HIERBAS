from django.db import models
from django.utils import timezone

from pedidos.models import METODOS_PAGO


class Proveedor(models.Model):
    nombre = models.CharField(max_length=150, unique=True)
    telefono = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    direccion = models.CharField(max_length=200, blank=True)
    nota = models.TextField(blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Compra(models.Model):
    """Una factura/compra. El proveedor es opcional (puede ser un gasto suelto), y en
    vez de vincular un insumo se anota en texto qué se compró. El seguimiento de pago
    es simple (monto pagado acumulado, no un libro de pagos como Pedido/Pago)."""

    proveedor = models.ForeignKey(
        Proveedor, on_delete=models.PROTECT, related_name='compras', null=True, blank=True,
    )
    detalle = models.CharField(max_length=200, blank=True)
    numero_factura = models.CharField(max_length=50, blank=True)
    fecha = models.DateField(default=timezone.localdate)
    metodo_pago = models.CharField(max_length=20, choices=METODOS_PAGO, default='efectivo')
    total = models.DecimalField(max_digits=12, decimal_places=2)
    pagado = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    nota = models.TextField(blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha', '-id']

    def __str__(self):
        nombre = self.proveedor.nombre if self.proveedor else 'Sin proveedor'
        return f'{nombre} - {self.fecha}'

    def saldo(self):
        return self.total - self.pagado

    def estado_pago(self):
        if self.pagado <= 0:
            return 'pendiente'
        if self.pagado >= self.total:
            return 'pagado'
        return 'parcial'
