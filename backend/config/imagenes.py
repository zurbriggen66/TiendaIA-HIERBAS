"""Comprime a WebP cualquier imagen que se suba desde el admin (logo, banners,
fotos de categoría/producto, etc.), para no depender de que quien sube la foto
la achique a mano antes. Se llama desde el save() de cada modelo con un
ImageField — ver negocio/models.py y productos/models.py.
"""

import io

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

# 1600px de lado más largo alcanza de sobra para cualquier pantalla (incluso
# retina) sin acercarse al peso de la foto original de una cámara/celular.
LADO_MAXIMO = 1600
CALIDAD = 82


def comprimir_imagen(campo, lado_maximo=LADO_MAXIMO, calidad=CALIDAD, forzar=False):
    """Reemplaza el contenido de un ImageField por su versión WebP redimensionada,
    en el momento del guardado. No hace nada si el campo está vacío o si el
    archivo no cambió en este save() (evita recomprimir un WebP ya guardado en
    cada save posterior, que perdería calidad de forma acumulativa) — salvo que
    se pase `forzar=True`, que es lo que usa el comando `comprimir_imagenes`
    para procesar lo que ya estaba subido antes de este cambio."""
    if not campo or (campo._committed and not forzar):
        return
    try:
        # Se lee todo el contenido y se cierra el archivo original antes de escribir el
        # nuevo: en Windows (y con `forzar=True`, que después borra el archivo viejo) no
        # se puede reemplazar/borrar un archivo que Pillow sigue teniendo abierto.
        campo.open('rb')
        contenido_original = campo.read()
        campo.close()
        imagen = Image.open(io.BytesIO(contenido_original))
        imagen = ImageOps.exif_transpose(imagen)  # respeta la rotación de fotos de celular
        if imagen.mode not in ('RGB', 'RGBA'):
            imagen = imagen.convert('RGBA' if 'A' in imagen.getbands() else 'RGB')
        imagen.thumbnail((lado_maximo, lado_maximo), Image.LANCZOS)

        buffer = io.BytesIO()
        imagen.save(buffer, format='WEBP', quality=calidad, method=6)
    except Exception:
        # Un archivo que Pillow no puede abrir (formato raro, corrupto) se guarda
        # tal cual llegó: mejor una foto sin comprimir que un alta que falla.
        return

    nombre_sin_extension = campo.name.rsplit('.', 1)[0]
    campo.save(f'{nombre_sin_extension}.webp', ContentFile(buffer.getvalue()), save=False)
