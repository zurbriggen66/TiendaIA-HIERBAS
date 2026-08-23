from rest_framework import serializers
from .models import Proveedor, Compra


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = '__all__'


class CompraSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    insumo_nombre = serializers.CharField(source='insumo.nombre', read_only=True)
    metodo_pago_label = serializers.CharField(source='get_metodo_pago_display', read_only=True)
    saldo = serializers.SerializerMethodField()
    estado_pago = serializers.SerializerMethodField()

    class Meta:
        model = Compra
        fields = [
            'id', 'proveedor', 'proveedor_nombre', 'insumo', 'insumo_nombre', 'cantidad',
            'numero_factura', 'fecha', 'metodo_pago', 'metodo_pago_label', 'total', 'pagado',
            'saldo', 'estado_pago', 'nota', 'creado',
        ]

    def get_saldo(self, obj):
        return obj.saldo()

    def get_estado_pago(self, obj):
        return obj.estado_pago()

    def create(self, validated_data):
        compra = Compra.objects.create(**validated_data)
        insumo = compra.insumo
        if insumo and compra.cantidad:
            insumo.cantidad_disponible += compra.cantidad
            insumo.save(update_fields=['cantidad_disponible'])
        return compra
