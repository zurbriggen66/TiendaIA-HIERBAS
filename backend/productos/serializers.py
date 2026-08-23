from rest_framework import serializers
from .models import Categoria, EscalonPrecio, Producto


class EscalonPrecioSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscalonPrecio
        fields = ['id', 'categoria', 'etiqueta', 'cantidad_desde', 'precio_unitario']


class CategoriaSerializer(serializers.ModelSerializer):
    escalones = EscalonPrecioSerializer(many=True, read_only=True)

    class Meta:
        model = Categoria
        fields = [
            'id', 'nombre', 'slug', 'descripcion', 'imagen', 'unidad_medida',
            'cantidad_minima', 'orden', 'activa', 'escalones', 'creado',
        ]


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    unidad_medida = serializers.CharField(source='categoria.unidad_medida', read_only=True)

    class Meta:
        model = Producto
        fields = [
            'id', 'categoria', 'categoria_nombre', 'unidad_medida', 'nombre', 'descripcion',
            'contenido', 'precio_base', 'imagen', 'destacado', 'activo', 'orden', 'creado',
        ]
