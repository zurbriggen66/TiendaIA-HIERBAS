# Deploy

Este repo es el workspace de desarrollo (monorepo `backend/` + `frontend/`). Lo que
se despliega son los dos repos de la organizacion, que se mantienen sincronizados
con este:

| Repo | Contenido | Checkout en el VPS |
|---|---|---|
| [HIERBAS-BACK](https://github.com/TIENDA-IA/HIERBAS-BACK) | el contenido de `backend/` en la raiz | `/opt/tienda-ia/HIERBAS-BACK` |
| [HIERBAS-FRONT](https://github.com/TIENDA-IA/HIERBAS-FRONT) | el contenido de `frontend/` en la raiz | `/opt/tienda-ia/HIERBAS-FRONT` |

**El runbook completo esta en `DEPLOY.md` de HIERBAS-BACK.** Ahi estan los pasos de
puesta en marcha, la migracion de datos desde PythonAnywhere y la operacion diaria.

La infraestructura (Compose, Nginx, Certbot) vive en
[TIENDA-IA-DEPLOY](https://github.com/TIENDA-IA/TIENDA-IA-DEPLOY), rama `feat/hierbas`.

## Lo unico a recordar al desarrollar aca

`config/settings.py` lee `DJANGO_DATA_DIR`. Sin esa variable (local, PythonAnywhere)
la base SQLite, `media/` y `staticfiles/` siguen viviendo dentro de `backend/`, como
siempre. En el VPS apunta a `/data`, un volumen de Docker fuera del checkout.

`frontend/.env.production` fija la URL de la API para el build de produccion.

## Facturación electrónica (ARCA)

El trámite ante ARCA, el certificado y la puesta en marcha están en
[`FACTURACION.md`](FACTURACION.md). Dos cosas que afectan al deploy:

- `pip install -r requirements.txt` ahora baja `pyafipws` del `.tar.gz` de GitHub por
  HTTPS. No usar la forma `git+https://`: la imagen de la API (`python:3.13-slim`) no
  trae `git` y el arranque falla.
- El certificado y la clave de ARCA viven en `DJANGO_DATA_DIR/fiscal_certs/` (en el VPS,
  `/data/fiscal_certs/`), fuera del checkout y fuera del repo.

