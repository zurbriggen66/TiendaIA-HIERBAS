from django.db import models
from django.utils import timezone

from gastos.models import Insumo
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
    """Una factura/compra a un proveedor, de un insumo puntual (opcional). El
    seguimiento de pago es simple (monto pagado acumulado, no un listado de pagos
    individuales) — alcanza para saber cuánto se debe sin la complejidad de un
    libro de pagos como el de Pedido/Pago."""

    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name='compras')
    insumo = models.ForeignKey(Insumo, null=True, blank=True, on_delete=models.SET_NULL, related_name='compras')
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
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
        return f'{self.proveedor.nombre} - {self.fecha}'

    def saldo(self):
        return self.total - self.pagado

    def estado_pago(self):
        if self.pagado <= 0:
            return 'pendiente'
        if self.pagado >= self.total:
            return 'pagado'
        return 'parcial'
