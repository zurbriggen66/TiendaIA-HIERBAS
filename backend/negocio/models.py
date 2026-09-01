from django.db import models

class ConfiguracionSitio(models.Model):
    # Usamos blank=True y null=True para que no de error si aún no subieron la imagen
    logo = models.ImageField(upload_to='sitio/logos/', null=True, blank=True)
    # Este negocio opera con dos marcas a la vez (ej. "Hierbas Medicinales Cba" y "La Paz
    # Hierbas Serranas"): el segundo logo se muestra junto al principal en el header.
    logo_secundario = models.ImageField(upload_to='sitio/logos/', null=True, blank=True)
    logo_precarga = models.ImageField(
        upload_to='sitio/logos/',
        null=True,
        blank=True,
        help_text="Imagen que se muestra en la pantalla de carga inicial (recomendado: PNG sin fondo)",
    )
    imagen_principal = models.ImageField(upload_to='sitio/portadas/', null=True, blank=True)
    imagen_banner_mayorista = models.ImageField(
        upload_to='sitio/banners/',
        null=True,
        blank=True,
        help_text="Fondo del banner 'Explorá nuestro catálogo'. Formato cuadrado (1:1) recomendado.",
    )
    imagen_quienes_somos = models.ImageField(
        upload_to='sitio/quienes-somos/',
        null=True,
        blank=True,
        help_text="Reemplaza los 2 logos de la sección de marcas. Formato vertical 9:16 recomendado.",
    )
    whatsapp = models.CharField(max_length=20, blank=True, default='')
    # CharField (no URLField): así se acepta "instagram.com/tu_negocio" o directamente
    # el usuario "@tu_negocio" sin que Django rechace el guardado por faltarle el
    # "https://" — se lo completamos solos en save().
    # El negocio maneja dos cuentas de Instagram (una por marca): la principal va con
    # el logo principal en el footer, la secundaria con el logo secundario. La
    # descripción es el texto que se muestra debajo de cada logo ("Hierbas Serranas",
    # "Hierbas Medicinales Cba", etc.).
    instagram = models.CharField(max_length=250, blank=True, default='')
    instagram_descripcion = models.CharField(max_length=200, blank=True, default='')
    instagram_secundario = models.CharField(max_length=250, blank=True, default='')
    instagram_secundario_descripcion = models.CharField(max_length=200, blank=True, default='')
    video_principal = models.FileField(
        upload_to='videos/', 
        null=True, 
        blank=True, 
        help_text="Video de fondo para el inicio (Formato 9:16 recomendado)"
    )

    # Programa de puntos: cuántos pesos gastados valen 1 punto, y cuánto vale 1 punto
    # al canjearlo. Con los defaults: gastás $100 → 1 punto; 1 punto = $1 de descuento.
    pesos_por_punto = models.PositiveIntegerField(default=100)
    valor_punto = models.DecimalField(max_digits=10, decimal_places=2, default=1)

    # Colores de la vista del cliente (código hex, ej. "#eaf0e6"). Los defaults son
    # la paleta "Apothecary Harvest" (pergamino + verde bosque) del diseño de
    # referencia, así que mientras nadie los cambie desde el admin la tienda
    # arranca ya con ese tono.
    color_navbar = models.CharField(max_length=7, default='#f2f7ef')
    color_fondo = models.CharField(max_length=7, default='#eaf0e6')
    color_superficie = models.CharField(max_length=7, default='#f2f7ef')
    color_acento = models.CharField(max_length=7, default='#1a361b')

    # Apagar esto bloquea los pedidos nuevos de la tienda web (no los cargados a mano
    # en el admin): ver PedidoSerializer.validate en la app "pedidos".
    tienda_abierta = models.BooleanField(default=True)
    mensaje_cerrado = models.CharField(
        max_length=200, blank=True, default='Volvemos pronto, gracias por tu paciencia.'
    )
    color_boton_agregar = models.CharField(max_length=7, default='#1a361b')

    @staticmethod
    def _normalizar_instagram(valor):
        valor = (valor or '').strip()
        if not valor or valor.startswith(('http://', 'https://')):
            return valor
        # "@usuario" o "usuario" sueltos → perfil completo; "instagram.com/x" → + https
        if '/' not in valor:
            return f'https://www.instagram.com/{valor.lstrip("@")}'
        return f'https://{valor}'

    def save(self, *args, **kwargs):
        self.instagram = self._normalizar_instagram(self.instagram)
        self.instagram_secundario = self._normalizar_instagram(self.instagram_secundario)
        # wa.me (y el link de "Escribinos por WhatsApp") solo funcionan bien en
        # Android/iPhone si el número es SOLO dígitos en formato internacional (ej.
        # 5493511234567). Si el dueño lo carga con espacios, guiones o un "+", el botón
        # rompe igual en cualquier celular — no es un problema de plataforma, es el dato.
        if self.whatsapp:
            self.whatsapp = ''.join(ch for ch in self.whatsapp if ch.isdigit())
        super().save(*args, **kwargs)

    def __str__(self):
        return "Configuración General del Sitio"