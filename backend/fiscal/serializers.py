from rest_framework import serializers

from pedidos.models import METODOS_PAGO

from .models import ComprobanteFiscal, ConfiguracionFiscal


class ConfiguracionFiscalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionFiscal
        fields = [
            'id', 'cuit', 'razon_social', 'punto_venta', 'condicion_iva',
            'cert_ref', 'homologacion', 'activo',
            'facturar_automatico', 'facturar_medios', 'facturar_monto_minimo',
        ]
        read_only_fields = ['id']

    def validate_facturar_medios(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Tiene que ser una lista de métodos de pago.')
        validos = dict(METODOS_PAGO)
        desconocidos = [m for m in value if m not in validos]
        if desconocidos:
            raise serializers.ValidationError(f'Métodos de pago desconocidos: {", ".join(desconocidos)}.')
        return value

    def validate(self, data):
        # Prender la facturación automática sin medios elegidos no puede significar
        # "todos": emitir un CAE es irreversible.
        automatico = data.get('facturar_automatico', getattr(self.instance, 'facturar_automatico', False))
        medios = data.get('facturar_medios', getattr(self.instance, 'facturar_medios', None) or [])
        if automatico and not medios:
            raise serializers.ValidationError(
                'Elegí al menos un método de pago, o apagá la facturación automática.'
            )
        return data


class ComprobanteFiscalSerializer(serializers.ModelSerializer):
    estado_label = serializers.CharField(source='get_estado_display', read_only=True)
    pedido_cliente = serializers.CharField(source='pedido.cliente', read_only=True)
    pedido_total = serializers.SerializerMethodField()

    class Meta:
        model = ComprobanteFiscal
        fields = [
            'id', 'pedido', 'pedido_cliente', 'pedido_total', 'estado', 'estado_label',
            'cae', 'cae_vencimiento', 'punto_venta', 'numero_factura',
            'tipo_comprobante', 'error_msg', 'creado',
        ]
        read_only_fields = fields

    def get_pedido_total(self, obj):
        return obj.pedido.calcular_total()
