from django.contrib import admin
from .models import Proveedor, Compra


@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'telefono', 'email')
    search_fields = ('nombre',)


@admin.register(Compra)
class CompraAdmin(admin.ModelAdmin):
    list_display = ('proveedor', 'fecha', 'numero_factura', 'total', 'pagado')
    list_filter = ('proveedor',)
    search_fields = ('numero_factura',)
