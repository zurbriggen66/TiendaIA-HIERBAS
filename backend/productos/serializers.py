from rest_framework import serializers
from .models import Categoria, EscalonPrecio, CantidadFija, ImagenCategoria, Producto


class EscalonPrecioSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscalonPrecio
        fields = ['id', 'categoria', 'etiqueta', 'cantidad_desde', 'precio_unitario']


class CantidadFijaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CantidadFija
        fields = ['id', 'categoria', 'cantidad']


class ImagenCategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagenCategoria
        fields = ['id', 'categoria', 'imagen', 'orden']


class CategoriaSerializer(serializers.ModelSerializer):
    escalones = EscalonPrecioSerializer(many=True, read_only=True)
    cantidades_fijas = CantidadFijaSerializer(many=True, read_only=True)
    imagenes = ImagenCategoriaSerializer(many=True, read_only=True)

    class Meta:
        model = Categoria
        fields = [
            'id', 'nombre', 'slug', 'descripcion', 'imagen', 'imagenes', 'unidad_medida',
            'cantidad_minima', 'cantidad_minima_variedad', 'granel_cantidad_minima',
            'granel_cantidad_minima_variedad', 'venta_cantidad_fija', 'cantidades_fijas',
            'orden', 'activa', 'escalones', 'creado',
        ]


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    unidad_medida = serializers.CharField(source='categoria.unidad_medida', read_only=True)

    class Meta:
        model = Producto
        fields = [
            'id', 'categoria', 'categoria_nombre', 'unidad_medida', 'nombre', 'descripcion',
            'contenido', 'precio_base', 'precio_granel', 'imagen', 'destacado', 'activo', 'orden', 'creado',
        ]
