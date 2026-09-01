from rest_framework import serializers
from .models import Insumo, Gasto, GastoFijo, CategoriaGasto


class CategoriaGastoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaGasto
        fields = ['id', 'nombre']


class InsumoSerializer(serializers.ModelSerializer):
    descuento_activo = serializers.SerializerMethodField()

    class Meta:
        model = Insumo
        fields = [
            'id', 'nombre', 'unidad', 'cantidad_disponible', 'stock_minimo', 'precio',
            'descuento_pct', 'descuento_hasta', 'descuento_activo', 'creado',
        ]

    def get_descuento_activo(self, obj):
        return obj.tiene_descuento_activo()

    def validate_cantidad_disponible(self, value):
        if value < 0:
            raise serializers.ValidationError('El stock no puede ser negativo.')
        return value

    def validate_stock_minimo(self, value):
        if value < 0:
            raise serializers.ValidationError('El mínimo no puede ser negativo.')
        return value


class GastoSerializer(serializers.ModelSerializer):
    metodo_pago_label = serializers.CharField(source='get_metodo_pago_display', read_only=True)

    class Meta:
        model = Gasto
        fields = [
            'id', 'categoria', 'descripcion', 'monto', 'metodo_pago', 'metodo_pago_label', 'fecha',
        ]


class GastoFijoSerializer(serializers.ModelSerializer):
    frecuencia_label = serializers.CharField(source='get_frecuencia_display', read_only=True)
    dias_restantes = serializers.SerializerMethodField()
    esta_por_vencer = serializers.SerializerMethodField()

    class Meta:
        model = GastoFijo
        fields = [
            'id', 'nombre', 'categoria', 'monto', 'frecuencia',
            'frecuencia_label', 'proximo_vencimiento', 'dias_aviso', 'activo',
            'dias_restantes', 'esta_por_vencer', 'creado',
        ]

    def get_dias_restantes(self, obj):
        return obj.dias_restantes()

    def get_esta_por_vencer(self, obj):
        return obj.esta_por_vencer()
