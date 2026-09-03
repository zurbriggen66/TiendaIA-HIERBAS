# Deploy en el VPS (tienda-ia)

Este proyecto se sirve desde el VPS de TIENDA-IA, junto a MONKEYGYM y la landing.
La orquestación vive en el repo **TIENDA-IA-DEPLOY** (Compose + Nginx + Certbot);
acá solo está la app.

| | |
|---|---|
| Frontend | `https://hierbas.tiendaia.cloud` — SPA de Vite, Nginx sirve `frontend/dist` |
| API | `https://api-hierbas.tiendaia.cloud/api` — Django + gunicorn, servicio `hierbas-api` |
| Checkout | `/opt/tienda-ia/TIENDAIA-HIERBAS` |
| Datos | volumen Docker `hierbas-data` → `/data` (base SQLite, `media/`, `staticfiles/`) |

La base y las imágenes viven **fuera del checkout** a propósito: el workflow de
deploy hace `git pull` y Compose recrea contenedores, y nada de eso toca `/data`.

---

## Puesta en marcha (una sola vez)

### 0. DNS — hacer esto primero, tarda en propagar

Dos registros **A** apuntando a la IP del VPS:

```
hierbas.tiendaia.cloud       A    <IP del VPS>
api-hierbas.tiendaia.cloud   A    <IP del VPS>
```

Verificar antes de seguir (si no resuelve, Certbot no puede emitir el certificado):

```bash
dig +short hierbas.tiendaia.cloud
dig +short api-hierbas.tiendaia.cloud
```

### 1. Repo en la organización

Crear `TIENDA-IA/TIENDAIA-HIERBAS` (privado, vacío) y empujar el código:

```bash
# en la máquina de desarrollo
git remote add org https://github.com/TIENDA-IA/TIENDAIA-HIERBAS.git
git push org main
```

### 2. Checkout y build del frontend en el VPS

El `dist/` tiene que existir **antes** del `docker compose up`: si no, Docker crea
el bind mount como carpeta vacía y el SPA responde 404.

```bash
su - github-runner
cd /opt/tienda-ia
git clone https://github.com/TIENDA-IA/TIENDAIA-HIERBAS.git
cd TIENDAIA-HIERBAS/frontend
npm ci --include=dev
npm run build
ls dist/index.html          # tiene que existir
```

### 3. Configuración del deploy repo

```bash
cd /opt/tienda-ia/TIENDA-IA-DEPLOY
git fetch origin
git merge origin/feat/hierbas       # o mergear el PR desde GitHub y hacer git pull
```

Agregar los dominios al `.env` de infraestructura:

```bash
cat >> .env <<'ENV'
HIERBAS_DOMAIN=hierbas.tiendaia.cloud
HIERBAS_API_DOMAIN=api-hierbas.tiendaia.cloud
ENV
```

Crear el `.env.hierbas-api` con una `SECRET_KEY` **nueva** (no reutilizar la de dev):

```bash
SECRET=$(docker run --rm python:3.13-slim python -c \
  "import secrets,string; print(''.join(secrets.choice(string.ascii_letters+string.digits+'!@#\$%^&*(-_=+)') for _ in range(50)))")

cat > .env.hierbas-api <<ENV
DJANGO_SECRET_KEY=$SECRET
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=api-hierbas.tiendaia.cloud
DJANGO_CORS_ALLOWED_ORIGINS=https://hierbas.tiendaia.cloud
ENV

chmod 600 .env.hierbas-api
```

Validar que el Compose arma bien antes de levantar nada:

```bash
docker compose config >/dev/null && echo "compose OK"
docker compose config | grep -A5 "hierbas-api:"
```

### 4. Migrar los datos de PythonAnywhere

**En una consola bash de PythonAnywhere** — `.backup` toma una copia consistente
aunque la app esté sirviendo:

```bash
cd ~/TiendaIA-HIERBAS/backend
sqlite3 db.sqlite3 ".backup /tmp/db.sqlite3"     # si no está sqlite3: cp db.sqlite3 /tmp/
tar czf ~/hierbas-data.tar.gz -C /tmp db.sqlite3 -C ~/TiendaIA-HIERBAS/backend media
```

Bajar `hierbas-data.tar.gz` desde la pestaña **Files** y subirlo al VPS:

```bash
# desde la máquina local
scp hierbas-data.tar.gz root@<IP del VPS>:/tmp/
```

**En el VPS**, sembrar el volumen antes del primer arranque:

```bash
mkdir -p /tmp/hierbas-seed && tar xzf /tmp/hierbas-data.tar.gz -C /tmp/hierbas-seed
ls /tmp/hierbas-seed                      # db.sqlite3 y media/

docker volume create tienda-ia_hierbas-data
docker run --rm \
  -v tienda-ia_hierbas-data:/data \
  -v /tmp/hierbas-seed:/seed:ro \
  alpine sh -c "mkdir -p /data/media && cp /seed/db.sqlite3 /data/ && cp -a /seed/media/. /data/media/"

# verificar
docker run --rm -v tienda-ia_hierbas-data:/data alpine \
  sh -c "ls -la /data && find /data/media -type f | wc -l"
```

> El nombre real del volumen es `<proyecto>_<volumen>`. El proyecto es `tienda-ia`
> (lo fija `name:` en `docker-compose.yaml`), así que queda `tienda-ia_hierbas-data`.
> Confirmar con `docker volume ls | grep hierbas`.

### 5. Levantar

```bash
cd /opt/tienda-ia/TIENDA-IA-DEPLOY
docker compose up -d
docker compose logs -f hierbas-api      # esperar el "Listening at: http://0.0.0.0:8000"
```

El primer arranque instala dependencias, corre `migrate` sobre la base traída de
PythonAnywhere (idempotente) y hace `collectstatic`.

Certbot detecta los dominios nuevos y expande el certificado SAN existente. Mientras
tanto, Nginx sirve los dominios de hierbas con el certificado viejo y el navegador
avisa que el nombre no coincide — se arregla solo cuando Certbot termina:

```bash
docker compose logs -f certbot          # "Certificate is ready."
```

### 6. Verificar

```bash
curl -sI https://api-hierbas.tiendaia.cloud/api/productos/ | head -1   # 200 o 401
curl -sI https://hierbas.tiendaia.cloud/ | head -1                     # 200
curl -sI https://api-hierbas.tiendaia.cloud/static/admin/css/base.css | head -1  # 200
docker compose exec hierbas-api python -c \
  "import sqlite3;print(sqlite3.connect('/data/db.sqlite3').execute('select count(*) from productos_producto').fetchone())"
```

Abrir `https://hierbas.tiendaia.cloud` y comprobar que **se ven las fotos** (eso
prueba la cadena completa: API → URL absoluta → Nginx sirviendo `/media/`).

### 7. Deploy automático

`.github/workflows/deploy.yml` corre en el runner self-hosted del VPS ante cada push
a `main`: hace `git pull`, rebuildea el frontend y reinicia `hierbas-api`.

Requisitos en el VPS:

- El runner tiene que estar disponible para este repo. Si está registrado a nivel de
  organización ya lo toma; si es por repo, agregar uno en *Settings → Actions → Runners*.
- El usuario `github-runner` necesita poder hacer `git pull` del repo privado
  (misma credencial que usan los repos de MONKEYGYM) y correr `docker compose`.

---

## Operación

```bash
cd /opt/tienda-ia/TIENDA-IA-DEPLOY

docker compose logs -f hierbas-api          # logs
docker compose restart hierbas-api          # reiniciar tras cambios en el backend
docker compose exec hierbas-api python manage.py createsuperuser
docker compose exec hierbas-api python manage.py migrate
```

### Backup de los datos

Todo lo que no se puede perder está en un solo volumen:

```bash
docker run --rm -v tienda-ia_hierbas-data:/data -v /root/backups:/out alpine \
  tar czf /out/hierbas-$(date +%F).tar.gz -C /data .
```

Conviene dejarlo en un cron diario.
