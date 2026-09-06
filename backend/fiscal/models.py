from django.db import models

from pedidos.models import METODOS_PAGO


def medios_de_pago(pedido):
    """Métodos con los que se cobró un pedido: {'efectivo', 'transferencia', ...}.
    Sale de los Pago reales, no de un campo suelto, así un pedido cobrado en dos
    veces (mitad efectivo, mitad transferencia) declara los dos medios."""
    return {pago.metodo for pago in pedido.pagos.all() if pago.metodo}


class ConfiguracionFiscal(models.Model):
    """Identidad fiscal del negocio ante ARCA (ex AFIP) y reglas de emisión.

    El negocio es uno solo, así que en la práctica hay una sola fila: se lee
    siempre con `fiscal.services.config_vigente()`.
    """

    CONDICIONES_IVA = [
        ('monotributo', 'Monotributo'),
        ('responsable_inscripto', 'Responsable Inscripto'),
        ('exento', 'Exento'),
    ]

    cuit = models.CharField(max_length=20, blank=True)
    razon_social = models.CharField(max_length=200, blank=True)
    punto_venta = models.CharField(max_length=20, blank=True)
    condicion_iva = models.CharField(max_length=60, choices=CONDICIONES_IVA, blank=True)
    # OJO: el certificado y la clave privada de ARCA NO van en la base ni en el repo.
    # `cert_ref` es solo el nombre base de los archivos <cert_ref>.crt / <cert_ref>.key
    # que el que administra el servidor deja a mano en la carpeta de datos
    # (DJANGO_DATA_DIR/fiscal_certs/, ver fiscal/afip.py). No hay upload por la web:
    # es un paso de operaciones, hecho una vez.
    cert_ref = models.CharField(max_length=200, blank=True)
    # True = homologación, el ambiente de PRUEBAS de ARCA: los CAE que devuelve no
    # valen como factura. Pasar a False recién cuando el certificado de producción
    # esté cargado y probado.
    homologacion = models.BooleanField(default=True)
    activo = models.BooleanField(default=True)

    # --- Facturación automática -------------------------------------------
    # Qué pedidos se facturan solos al terminar de cobrarlos, sin apretar
    # "Facturar". Apagado por defecto: emitir un CAE es irreversible.
    facturar_automatico = models.BooleanField(default=False)
    # Métodos de pago que disparan la factura (los de pedidos.METODOS_PAGO). Un
    # pedido cobrado en varias partes entra si CUALQUIERA de sus medios está en la
    # lista: si algo entró por transferencia quedó registrado en el banco.
    facturar_medios = models.JSONField(default=list, blank=True)
    # Piso opcional: 0 = sin mínimo.
    facturar_monto_minimo = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuración fiscal'
        verbose_name_plural = 'Configuración fiscal'

    def __str__(self):
        ambiente = 'homologación' if self.homologacion else 'PRODUCCIÓN'
        return f'{self.razon_social or self.cuit or "sin datos"} ({ambiente})'

    @property
    def medios_validos(self):
        return [m for m in (self.facturar_medios or []) if m in dict(METODOS_PAGO)]

    def debe_facturarse(self, pedido):
        """¿Este pedido entra en la regla de facturación automática?"""
        if not self.facturar_automatico or not self.activo:
            return False
        if pedido.estado == 'cancelado' or not pedido.confirmado:
            return False
        if pedido.facturado or pedido.excluir_fiscal:
            return False
        # Solo pedidos terminados de cobrar. Un pedido a medio pagar todavía puede
        # cambiar (se agregan productos, se ajusta el envío) y el CAE ya emitido no
        # se puede modificar: facturar de más obliga a una nota de crédito.
        if pedido.calcular_estado_cobro() != 'pagado':
            return False
        if self.facturar_monto_minimo and pedido.calcular_total() < self.facturar_monto_minimo:
            return False
        medios = set(self.medios_validos)
        if not medios:
            return False
        return bool(medios & medios_de_pago(pedido))


class ComprobanteFiscal(models.Model):
    """Un intento de facturar un pedido: el CAE si salió, o el motivo si no.

    Es también la cola de reintentos — todo lo que quedó en "error" se puede
    volver a emitir desde el panel (ARCA caído, o un rechazo ya corregido).
    """

    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('procesando', 'Procesando'),
        ('ok', 'Emitido'),
        ('error', 'Error'),
    ]

    pedido = models.OneToOneField(
        'pedidos.Pedido', on_delete=models.CASCADE, related_name='comprobante',
    )
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    cae = models.CharField(max_length=40, blank=True)
    cae_vencimiento = models.DateField(null=True, blank=True)
    punto_venta = models.CharField(max_length=20, blank=True)
    numero_factura = models.CharField(max_length=40, blank=True)
    tipo_comprobante = models.CharField(max_length=20, blank=True)
    error_msg = models.TextField(blank=True)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creado']
        verbose_name = 'Comprobante fiscal'
        verbose_name_plural = 'Comprobantes fiscales'

    def __str__(self):
        return f'Pedido #{self.pedido_id} — {self.get_estado_display()}'
