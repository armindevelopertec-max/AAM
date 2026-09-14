# AAM — POS + Catálogo + Cotizador + Scraping

Sistema de punto de venta con catálogo compartido de productos (CCTV/electrónica),
cotizaciones, PDFs de ventas/cotizaciones y scraping/sincronización de productos
desde tiendas en línea.

| Capa          | Tecnología                              | Puerto |
|---------------|-----------------------------------------|--------|
| Frontend      | Next.js 16 (`apps/web`)                 | 3000   |
| Backend       | NestJS 11 (`apps/api`)                  | 3001   |
| PostgreSQL    | `postgres:16-alpine` (datos POS)        | 5434   |
| MongoDB       | `mongo:7` (catálogo maestro + scraping) | 27017  |
| MinIO         | `minio/minio` (imágenes y PDFs, S3)     | 9000/9001 |

La API y la web **solo escuchan en localhost**. En producción el tráfico público
entra por un túnel de Cloudflare. El frontend consume la API por la ruta relativa
`/api`, que Next.js reescribe hacia `localhost:3001` (`apps/web/next.config.ts`),
así nunca se expone el backend.

---

## 1) Levantar los servicios de datos (PostgreSQL, MongoDB, MinIO)

```bash
cd AAM
podman-compose up -d          # o: podman compose up -d
podman ps                     # esperar a que los 3 estén "healthy"
```

Contenedores: `saas-pos-db`, `saas-pos-mongo`, `saas-pos-minio`.
Credenciales internas: usuario/clave `pos`/`pos`; MinIO admin `minioadmin`/`minioadmin`.
Los datos quedan en los volúmenes nombrados `aam_db-data`, `aam_mongo-data`, `aam_minio-data`.

> **Conflicto de puertos (laptop):** si ya tienes un MinIO (p. ej. otro stack en
> Docker) ocupando `9000/9001`, cambia el mapping del contenedor de podman, p. ej.
> a `9100/9101`, y apunta la API al puerto nuevo:
>
> ```yaml
> # docker-compose.local.yml  (ignorado en git)
> services:
>   minio:
>     ports:
>       - "9100:9000"
>       - "9101:9001"
> ```
>
> ```bash
> podman-compose -f docker-compose.yml -f docker-compose.local.yml up -d
> ```
>
> y en `apps/api/.env`: `S3_ENDPOINT="http://localhost:9100"`.
> De igual forma, si ya usas el puerto `27017` con otro MongoDB local, cambia el mapping.

---

## 2) Desarrollo local (laptop)

Requisitos: Node 20+, podman + podman-compose (o docker compose), OpenSSL.

### 2.1 Backend (API NestJS)

```bash
cd apps/api
npm install
npx prisma generate          # genera el cliente Prisma
```

Crear `apps/api/.env`:

```env
DATABASE_URL="postgresql://pos:pos@localhost:5434/pos?schema=public"
JWT_SECRET="$(openssl rand -hex 32)"
# S3_ENDPOINT solo cambia si moviste MinIO de puerto:
S3_ENDPOINT="http://localhost:9000"
# Opcionales (tienen defaults que calzan con docker-compose.yml):
# MONGO_URI="mongodb://pos:pos@localhost:27017/pos_crm?authSource=admin"
# S3_BUCKET="pos-productos"
# S3_ACCESS_KEY="minioadmin"
# S3_SECRET_KEY="minioadmin"
# CORS_ORIGIN="http://localhost:3000"
# STORE_NAME="SEGTECAM"
# PORT=3001
```

Levantar con recarga en caliente:

```bash
npm run start:dev            # http://localhost:3001
```

### 2.2 Frontend (Next.js)

```bash
cd apps/web
npm install
npm run dev                  # http://localhost:3000
```

El proxy `/api` -> `localhost:3001` funciona igual en dev y en producción
(está en `apps/web/next.config.ts`, no requiere configuración adicional).

### 2.3 Acceso

- Web: <http://localhost:3000>
- API: <http://localhost:3001> (directa) — en el navegador entra siempre por `/api`
- MinIO consola: <http://localhost:9001> (admin) o <http://localhost:9101> si cambiaste puertos
- Login: usuarios reales de producción (ver §5).

### 2.4 Atajo con un solo comando

Existe `./iniciar-dev.sh` que levanta contenedores + API + web (dev) juntos.
`Ctrl+C` detiene la API y la web; los contenedores quedan arriba.

---

## 3) Producción (servidor)

El servidor real usa `./iniciar.sh` (levanta contenedores + backend + frontend
compilados + túnel Cloudflare). Detalles completos en:

- `GUIA_DE_DESARROLLO.txt` — arquitectura, deploy, reglas de seguridad y verificación.
- `GUIA_ENCENDIDO_APAGADO_TXT.txt` — encendido/apagado del servidor y del túnel cloudflared.

### 3.1 Procedimiento de deploy

```bash
cd apps/api
npm run build                # genera dist/ (obligatorio: detecta errores TS)
# ...
cd apps/web
npm run build                # compila y hace typecheck
# ...
cd ..
./iniciar.sh                 # todo: contenedores + backend + frontend + túnel
```

Verificar que quedó publicada:

```bash
curl -I https://segtecam.space               # -> 200
curl -I https://segtecam.space/api/catalogo  # -> 200
```

> Regla de oro: en el servidor real **nunca** uses `next dev` frente a Cloudflare
> (produce 403 en los recursos y 502 en el HMR). Siempre `build` + `next start`.
> Tampoco abras los puertos 3000/3001 al exterior; el tráfico entra solo por el túnel.

---

## 4) Backup y restauración de datos

El respaldo es un tar.gz que contiene:

```
AAM-data-AAAAAMMDD.tar.gz
└── AAAAAMMDD/
    ├── pos.dump           # dump PostgreSQL (pg_dump -Fc)
    ├── mongo.archive      # mongodump (--archive) de la BD pos_crm
    └── minio/
        └── minio-export/  # mc mirror del bucket pos-productos
                          #   (productos/, scraping/, pdfs/)
```

### 4.1 Bajar desde el servidor y descomprimir (laptop)

```bash
scp arminserver@<IP>:~/AAM/backups/AAM-data-20260914.tar.gz .
tar -xzf AAM-data-20260914.tar.gz     # crea AAAAAMMDD/
```

### 4.2 Restaurar (con los contenedores arriba)

PostgreSQL:

```bash
podman cp AAAAAMMDD/pos.dump saas-pos-db:/tmp/pos.dump
podman exec saas-pos-db pg_restore -U pos -d pos --clean --if-exists /tmp/pos.dump
```

MongoDB:

```bash
podman cp AAAAAMMDD/mongo.archive saas-pos-mongo:/tmp/mongo.archive
podman exec saas-pos-mongo mongorestore \
  --uri="mongodb://pos:pos@localhost:27017/pos_crm?authSource=admin" \
  --archive=/tmp/mongo.archive --drop
```

MinIO (objetos: imágenes de productos, scraping y PDFs):

```bash
podman cp AAAAAMMDD/minio saas-pos-minio:/tmp/minio-in
podman exec saas-pos-minio mc alias set local http://localhost:9000 minioadmin minioadmin
podman exec saas-pos-minio mc mb local/pos-productos        # solo la primera vez
podman exec saas-pos-minio mc mirror --overwrite /tmp/minio-in/minio-export local/pos-productos
```

Verificación rápida tras restaurar:

```bash
podman exec saas-pos-db psql -U pos -d pos -c 'SELECT count(*) AS users FROM "User";'
curl -s http://localhost:3001/products/<id>/image -o /dev/null -w '%{http_code}\n'   # -> 200
```

---

## 5) Usuarios y datos de ejemplo

El dump de producción trae los siguientes usuarios (las contraseñas son las reales
del entorno de producción):

| Email                      | Nombre | Rol   |
|----------------------------|--------|-------|
| `admin@root.bo`            | admin  | admin |
| `armindevelopertec@gmail.com` | armin | admin |

El seed (`apps/api/prisma/seed.ts`) crea una tienda de prueba con el usuario
`admin@demo.mx` / `admin123` para entornos limpios.

---

## 6) Variables de entorno (referencia de la API)

| Variable         | Default                          | Descripción                                  |
|------------------|----------------------------------|----------------------------------------------|
| `DATABASE_URL`   | *(obligatoria)*                  | Cadena de conexión PostgreSQL                |
| `JWT_SECRET`     | `dev-secret-change-me`           | Firma de tokens JWT (genera una única en prod) |
| `MONGO_URI`      | `mongodb://pos:pos@localhost:27017/pos_crm?authSource=admin` | Conexión MongoDB |
| `S3_ENDPOINT`    | `http://localhost:9000`          | Endpoint MinIO/S3                            |
| `S3_BUCKET`      | `pos-productos`                  | Bucket de objetos                            |
| `S3_REGION`      | `us-east-1`                      | Región S3                                    |
| `S3_ACCESS_KEY`  | `minioadmin`                     | Clave S3                                     |
| `S3_SECRET_KEY`  | `minioadmin`                     | Secreto S3                                   |
| `PORT`           | `3001`                           | Puerto del backend                           |
| `CORS_ORIGIN`    | `*` (todos)                      | Orígenes permitidos (separados por coma)     |
| `STORE_NAME`     | `SEGTECAM`                       | Nombre en los PDFs                           |
| `STORE_SUBTITLE` | `Distribuidor Autorizado`        | Subtítulo en los PDFs                        |
| `STORE_PHONE`    | *(vacío)*                        | Teléfono en los PDFs                         |

---

## 7) Estructura relevante

```
apps/
  api/        # NestJS (auth, products, sales, quotes, catalogo, scraping, files, pdf, dashboard)
  web/        # Next.js App Router (login, POS, catálogo, cotizaciones, scraping, seguimiento)
docker-compose.yml      # PostgreSQL + MongoDB + MinIO
iniciar.sh              # prod: contenedores + build + start + túnel
iniciar-dev.sh          # dev: contenedores + API/web con recarga
GUIA_DE_DESARROLLO.txt          # reglas detalladas de desarrollo/deploy/seguridad
GUIA_ENCENDIDO_APAGADO_TXT.txt  # apagar/encender servidor y cloudflared
```