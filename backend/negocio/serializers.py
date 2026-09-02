from rest_framework import serializers
from .models import ConfiguracionSitio, ContactoWhatsapp


class ContactoWhatsappSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactoWhatsapp
        fields = ['id', 'nombre', 'numero', 'orden']


class ConfiguracionSitioSerializer(serializers.ModelSerializer):
    # La tienda ya trae toda la config en una sola llamada; los contactos de WhatsApp
    # viajan acá para no sumar otro fetch en el cliente.
    contactos_whatsapp = serializers.SerializerMethodField()

    class Meta:
        model = ConfiguracionSitio
        fields = [
            'id',
            'logo',
            'logo_secundario',
            'logo_precarga',
            'imagen_principal',
            'imagen_banner_mayorista',
            'imagen_quienes_somos',
            'video_principal',
            'whatsapp',
            'instagram',
            'instagram_descripcion',
            'instagram_secundario',
            'instagram_secundario_descripcion',
            'contactos_whatsapp',
            'color_navbar',
            'color_fondo',
            'color_superficie',
            'color_acento',
            'color_boton_agregar',
            'tienda_abierta',
            'mensaje_cerrado',
        ]

    def get_contactos_whatsapp(self, obj):
        return ContactoWhatsappSerializer(ContactoWhatsapp.objects.all(), many=True).data
