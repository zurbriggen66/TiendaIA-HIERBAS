from decimal import Decimal

from rest_framework import serializers
from .models import Pedido, DetallePedido, Localidad, Pago
from productos.models import Producto
from negocio.models import ConfiguracionSitio
from clientes.puntos import calcular_descuento as calcular_descuento_puntos


class LocalidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Localidad
        fields = '__all__'


class PagoSerializer(serializers.ModelSerializer):
    metodo_label = serializers.CharField(source='get_metodo_display', read_only=True)

    class Meta:
        model = Pago
        fields = ['id', 'pedido', 'metodo', 'metodo_label', 'monto', 'creado']


class DetallePedidoSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.SerializerMethodField()
    categoria_id = serializers.IntegerField(source='producto.categoria_id', read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = DetallePedido
        fields = ['id', 'producto', 'producto_nombre', 'categoria_id', 'cantidad', 'precio_unitario', 'subtotal']
        read_only_fields = ['precio_unitario']

    def get_producto_nombre(self, obj):
        return obj.producto.nombre

    def get_subtotal(self, obj):
        return obj.calcular_subtotal()


class PedidoSerializer(serializers.ModelSerializer):
    items = DetallePedidoSerializer(many=True)
    localidad_nombre = serializers.CharField(source='localidad.nombre', read_only=True)
    pagos = PagoSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    cobrado = serializers.SerializerMethodField()
    estado_cobro = serializers.SerializerMethodField()
    usar_puntos = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Pedido
        fields = [
            'id', 'cliente', 'telefono', 'tipo_entrega', 'direccion', 'estado', 'creado', 'items',
            'localidad', 'localidad_nombre', 'origen', 'confirmado', 'costo_envio', 'descuento_pct',
            'nota', 'pagos', 'subtotal', 'total', 'cobrado', 'estado_cobro',
            'puntos_usados', 'descuento_puntos', 'usar_puntos',
        ]
        extra_kwargs = {
            'localidad': {'required': False, 'allow_null': True},
            'confirmado': {'read_only': True},
            # El monto del canje lo decide el servidor; el frontend solo pide usar_puntos.
            'puntos_usados': {'read_only': True},
            'descuento_puntos': {'read_only': True},
        }

    def get_subtotal(self, obj):
        return obj.calcular_subtotal()

    def get_total(self, obj):
        return obj.calcular_total()

    def get_cobrado(self, obj):
        return obj.calcular_cobrado()

    def get_estado_cobro(self, obj):
        return obj.calcular_estado_cobro()

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('El pedido necesita al menos un producto.')
        return value

    def validate(self, data):
        # El interruptor de "tienda abierta" solo frena los pedidos que llegan por la
        # web pública; lo cargado a mano en el admin (origen='admin', el default) sigue
        # funcionando siempre, para no trabar al mostrador con un cliente presente.
        if data.get('origen') == 'web':
            config = ConfiguracionSitio.objects.order_by('id').last()
            if config and not config.tienda_abierta:
                raise serializers.ValidationError(
                    config.mensaje_cerrado or 'La tienda está cerrada en este momento. No se pueden recibir pedidos.'
                )

        # Mínimo de compra por categoría: se valida sobre la suma de cantidades de TODOS
        # los productos del pedido que pertenecen a una misma categoría (no por producto
        # individual) — así se puede "armar" el pedido combinando variedades.
        cantidades_por_categoria = {}
        cantidades_por_producto = {}
        for item in data.get('items', []):
            producto = item['producto']
            cantidades_por_categoria.setdefault(producto.categoria, Decimal('0'))
            cantidades_por_categoria[producto.categoria] += item['cantidad']
            cantidades_por_producto.setdefault(producto, Decimal('0'))
            cantidades_por_producto[producto] += item['cantidad']
        for categoria, cantidad in cantidades_por_categoria.items():
            if categoria.cantidad_minima and cantidad < categoria.cantidad_minima:
                raise serializers.ValidationError(
                    f'"{categoria.nombre}" tiene un mínimo de compra de {categoria.cantidad_minima} '
                    f'{categoria.get_unidad_medida_display().lower()}(s); el pedido junta {cantidad}.'
                )

        # Mínimo por variedad (ej: Hierbas Importadas exige al menos 5kg de CADA hierba
        # elegida, no solo el total de la categoría): a diferencia del chequeo de arriba,
        # este es por producto individual dentro de la categoría.
        for producto, cantidad in cantidades_por_producto.items():
            minimo_variedad = producto.categoria.cantidad_minima_variedad
            if minimo_variedad and cantidad < minimo_variedad:
                raise serializers.ValidationError(
                    f'"{producto.nombre}" tiene un mínimo de {minimo_variedad} '
                    f'{producto.categoria.get_unidad_medida_display().lower()}(s) si se incluye en el pedido; '
                    f'el pedido tiene {cantidad}.'
                )

        # Cantidad fija (ej: Hierbas a Granel solo se compra en packs de 25/50/100kg):
        # cada línea tiene que coincidir EXACTO con alguna cantidad permitida de su
        # categoría, no vale cualquier número intermedio.
        cantidades_fijas_por_categoria = {}
        for producto, cantidad in cantidades_por_producto.items():
            categoria = producto.categoria
            if not categoria.venta_cantidad_fija:
                continue
            if categoria.id not in cantidades_fijas_por_categoria:
                cantidades_fijas_por_categoria[categoria.id] = list(
                    categoria.cantidades_fijas.values_list('cantidad', flat=True)
                )
            permitidas = cantidades_fijas_por_categoria[categoria.id]
            if cantidad not in permitidas:
                opciones = ', '.join(str(c) for c in sorted(permitidas))
                raise serializers.ValidationError(
                    f'"{producto.nombre}" solo se puede comprar en estas cantidades: {opciones} '
                    f'{categoria.get_unidad_medida_display().lower()}(s); el pedido tiene {cantidad}.'
                )
        return data

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        usar_puntos = validated_data.pop('usar_puntos', False)

        # El pedido se asocia al cliente logueado (si lo hay), nunca a uno que venga por body.
        usuario = getattr(self.context.get('request'), 'user', None)
        cliente = getattr(usuario, 'cliente', None) if usuario and usuario.is_authenticated else None
        pedido = Pedido.objects.create(cliente_registrado=cliente, **validated_data)

        # Precio por escalón: se calcula una vez la cantidad total por categoría (todas
        # las variedades del pedido que caen en esa categoría), y ese precio se congela
        # en cada línea.
        cantidades_por_categoria = {}
        cantidades_por_producto = {}
        for item in items_data:
            producto = item['producto']
            cantidades_por_categoria.setdefault(producto.categoria, Decimal('0'))
            cantidades_por_categoria[producto.categoria] += item['cantidad']
            cantidades_por_producto.setdefault(producto, Decimal('0'))
            cantidades_por_producto[producto] += item['cantidad']

        # Modo "a granel" (ej: Hierbas Medicinales por Kg): TODO el pedido de esa
        # categoría pasa a precio_granel si junta el mínimo total Y cada variedad
        # elegida llega a su propio mínimo — si una sola variedad no llega, ninguna
        # línea de esa categoría entra en modo granel (no se mezclan los dos precios).
        categorias_en_modo_granel = set()
        for categoria, cantidad_total in cantidades_por_categoria.items():
            if not categoria.granel_cantidad_minima or cantidad_total < categoria.granel_cantidad_minima:
                continue
            productos_de_categoria = [p for p in cantidades_por_producto if p.categoria_id == categoria.id]
            if all(
                cantidades_por_producto[p] >= categoria.granel_cantidad_minima_variedad
                for p in productos_de_categoria
            ):
                categorias_en_modo_granel.add(categoria.id)

        for item in items_data:
            producto = item['producto']
            cantidad_categoria = cantidades_por_categoria[producto.categoria]
            if producto.categoria_id in categorias_en_modo_granel and producto.precio_granel is not None:
                precio_unitario = producto.precio_granel
            else:
                precio_unitario = producto.precio_para_cantidad_categoria(cantidad_categoria)
            DetallePedido.objects.create(
                pedido=pedido,
                producto=producto,
                cantidad=item['cantidad'],
                precio_unitario=precio_unitario,
            )

        # El canje va al final: recién acá se conoce el total real del pedido.
        if usar_puntos and cliente:
            puntos, descuento = calcular_descuento_puntos(cliente, pedido.calcular_total())
            if puntos > 0:
                pedido.puntos_usados = puntos
                pedido.descuento_puntos = descuento
                pedido.save(update_fields=['puntos_usados', 'descuento_puntos'])
                cliente.puntos -= puntos
                cliente.save(update_fields=['puntos'])

        return pedido
