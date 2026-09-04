# Facturación electrónica (ARCA / ex AFIP)

El módulo ya está en el código (app `backend/fiscal/`, pantalla **Facturación** en el
panel). Lo que falta es el trámite ante ARCA y cargar el certificado en el servidor.
Nada de esto emite comprobantes reales hasta el último paso.

Arranca **todo apagado**: `homologacion=True` (ambiente de pruebas) y
`facturar_automatico=False`. Un CAE emitido no se puede borrar — solo se corrige con
una nota de crédito — así que el orden de los pasos importa.

---

## 1. Trámite en ARCA (lo hace el dueño con su clave fiscal)

Hace falta **clave fiscal nivel 3** del CUIT del negocio.

### 1.1 Generar la clave privada y el pedido de certificado (CSR)

En cualquier máquina con `openssl` (una sola vez; la `.key` no se comparte con nadie):

```bash
openssl genrsa -out hierbas.key 2048
openssl req -new -key hierbas.key \
  -subj "/C=AR/O=RAZON SOCIAL DEL NEGOCIO/CN=hierbas/serialNumber=CUIT 20123456789" \
  -out hierbas.csr
```

Reemplazar la razón social y el CUIT (sin guiones). Quedan dos archivos:
`hierbas.key` (privada, no sale del servidor) y `hierbas.csr` (el que se sube a ARCA).

### 1.2 Certificado de PRUEBA (homologación)

1. Entrar a <https://wsass-homo.afip.gob.ar/wsass/> con clave fiscal.
2. "Crear certificado": pegar el contenido del `.csr` y darle un alias.
3. Descargar el `.crt` que devuelve → guardarlo como `hierbas-homo.crt`.
4. En el mismo sitio, "Crear autorización a servicio" → servicio **wsfe**.

### 1.3 Certificado de PRODUCCIÓN

1. Portal de ARCA con clave fiscal → **Administración de Certificados Digitales**.
2. "Agregar alias" → subir el `.csr` → descargar el `.crt` → guardarlo como `hierbas.crt`.
3. Portal de ARCA → **Administrador de Relaciones de Clave Fiscal** → "Nuevo servicio"
   → AFIP → WebServices → **Facturación Electrónica (wsfe)**, y como representante
   elegir el certificado (alias) creado en el paso anterior.

### 1.4 Alta del punto de venta

Portal de ARCA → **Comprobantes en línea** → "ABM puntos de venta" → nuevo punto de
venta de tipo **Web Services (RECE / WS)**. Anotar el número (ej. `2`).

> Homologación y producción tienen **certificados y puntos de venta distintos**. La
> numeración de comprobantes de cada uno es independiente.

---

## 2. Cargar el certificado en el servidor

Los archivos van en `fiscal_certs/` **dentro de la carpeta de datos**, no del checkout:
en el VPS eso es `/data/fiscal_certs/` (el volumen que sobrevive a los redeploys), y en
local `backend/fiscal_certs/`. El nombre base tiene que ser el mismo para el `.crt` y el
`.key` — ese nombre es lo que se carga después en el panel (campo "Nombre del
certificado").

```bash
# en el VPS
mkdir -p /data/fiscal_certs
# copiar hierbas-homo.crt y hierbas.key (y más adelante hierbas.crt)
chmod 600 /data/fiscal_certs/*
```

`.gitignore` ya excluye `fiscal_certs/`: **la clave privada nunca va al repo.**

## 3. Desplegar el backend

La única dependencia nueva es `pyafipws`, que se instala **desde GitHub** (la versión de
PyPI no compila en Python 3.12+), así que el servidor necesita `git` disponible al
instalar:

```bash
pip install -r requirements.txt
python manage.py migrate
```

Las migraciones son todas aditivas (campos nuevos con default): no tocan ningún dato
existente.

## 4. Configurar desde el panel

**Admin → Facturación**:

| Campo | Qué va |
|---|---|
| CUIT | el del negocio, sin guiones |
| Razón social | como figura en ARCA |
| Punto de venta | el del paso 1.4 (el de homologación mientras se prueba) |
| Condición frente al IVA | Monotributo → Factura C · Responsable Inscripto → A/B |
| Nombre del certificado | `hierbas-homo` (después `hierbas`) |
| Modo prueba | **tildado** |

## 5. Probar en homologación

Facturar un pedido cualquiera con el botón **Facturar** de Ventas & Pedidos. Si sale
bien, el pedido queda con el CAE y aparece en la lista de comprobantes. Si falla, el
motivo que devolvió ARCA queda escrito ahí mismo y se puede reintentar.

Conviene probar los dos casos: un pedido sin CUIT (consumidor final) y uno con CUIT
cargado (sale a nombre del comprador).

## 6. Pasar a producción

Recién cuando el paso 5 funcione:

1. Copiar `hierbas.crt` (el de producción) a `/data/fiscal_certs/`.
2. En el panel cambiar **Nombre del certificado** a `hierbas`, poner el **punto de venta
   de producción** y **destildar "Modo prueba"**. El panel pide confirmación.

Desde ahí, cada factura emitida es un comprobante fiscal real.

## 7. Facturación automática (opcional)

En la misma pantalla se puede prender "Facturar solo los pedidos". Solo dispara cuando
el pedido queda **totalmente cobrado** y se pagó con alguno de los medios tildados
(típicamente transferencia, que ya quedó registrada en el banco). Si ARCA no responde en
ese momento, el pedido **no se rompe**: queda en la lista de comprobantes en "Error" y se
reintenta con el botón "Reintentar pendientes".

---

## Cómo está armado (para el próximo proyecto)

- `backend/fiscal/afip.py` — el único archivo que habla con ARCA (WSAA + WSFEv1). Sin
  Django adentro salvo settings/cache.
- `backend/fiscal/services.py` — un solo camino de emisión, que usan el botón manual, la
  facturación automática y el reintento en lote.
- `backend/fiscal/models.py` — la configuración del negocio y la cola de comprobantes.
- Lo que toca el dominio: campos fiscales en `pedidos.Pedido`, `alicuota_iva` en
  `productos.Producto`, el botón en `PedidoViewSet.facturar` y el disparo automático en
  `PagoViewSet.perform_create`.

Es un port del módulo de la forrajería (repo `TIENDA-IA/FORRAJERIA-BACK`, app `fiscal/`).
Allá el sistema es multi-comercio y factura ventas de un POS; acá es un solo negocio y se
facturan pedidos, así que los modelos cambian, pero `afip.py` es prácticamente el mismo.
