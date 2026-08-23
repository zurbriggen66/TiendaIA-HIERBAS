from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('negocio.urls')),
    path('api/', include('productos.urls')),
    path('api/', include('pedidos.urls')),
    path('api/', include('gastos.urls')),
    path('api/', include('estadisticas.urls')),
    path('api/', include('clientes.urls')),
    path('api/', include('compras.urls')),
]

# Sirve las imágenes subidas (categorías, productos, logo) por Django mismo como
# respaldo. En producción lo ideal es servirlas directo con un mapeo de archivos
# estáticos, que no depende de esta línea ni de DEBUG.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
