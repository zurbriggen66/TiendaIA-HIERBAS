from django.contrib import admin
from .models import Categoria, EscalonPrecio, Producto


class EscalonPrecioInline(admin.TabularInline):
    model = EscalonPrecio
    extra = 1


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'unidad_medida', 'cantidad_minima', 'activa', 'orden')
    list_filter = ('activa', 'unidad_medida')
    search_fields = ('nombre',)
    prepopulated_fields = {'slug': ('nombre',)}
    inlines = [EscalonPrecioInline]


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'contenido', 'precio_base', 'activo', 'destacado', 'orden')
    list_filter = ('categoria', 'activo', 'destacado')
    search_fields = ('nombre',)
