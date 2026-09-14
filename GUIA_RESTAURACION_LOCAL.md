# AAM — Restaurar el backup en un clon local (paso a paso)

Documento **independiente** del `README.md`. Sirve para que un clon del repo
plus el backup de producción corra completo en una laptop/PC local:
PostgreSQL + MongoDB + MinIO con la data real, API en `:3001` y web en `:3000`.

> El texto del README describe la arquitectura y los escenarios (dev/prod).
> Esta guía es **solo la ejecución** de la restauración en local, línea por línea.

---

## Paso 0 — Requisitos (una sola vez)

- Git, Node.js 20+, Podman + podman-compose (o docker compose)
- OpenSSL (`openssl rand -hex 32`)
- Acceso por SSH al servidor de producción (para bajar el backup)

---

## Paso 1 — Clonar el repositorio

```
git clone git@github.com:armindevelopertec-max/AAM.git
cd AAM
```

---

## Paso 2 — Descargar el backup desde el servidor

Desde la laptop/PC (dentro de la carpeta `AAM/`):

```
scp arminserver@<IP-DEL-SERVER>:~/AAM/backups/AAM-data-20260914.tar.gz .
```

- Usa la IP/vía Tailscale o LAN con la que entras por SSH al servidor.
- El tar pesa ~91 MB.

---

## Paso 3 — Descomprimir el backup

```
tar -xzf AAM-data-20260914.tar.gz
```

Esto crea una carpeta con la fecha, p. ej. `20260914/`:

```
20260914/
├── pos.dump          # PostgreSQL
├── mongo.archive     # MongoDB (pos_crm)
└── minio/
    └── minio-export/ # objetos S3 (productos/, scraping/, pdfs/)
```

Si en el futuro es otra fecha, reemplaza `20260914` en todos los pasos.

---

## Paso 4 — Levantar los contenedores (datos)

```
podman-compose up -d
podman ps
```

Espera a que **los 3** estén `healthy`:

| Contenedor       | Imagen           | Puerto host |
|------------------|------------------|-------------|
| `saas-pos-db`    | postgres:16      | 5434        |
| `saas-pos-mongo` | mongo:7          | 27017       |
| `saas-pos-minio` | minio/minio      | 9000/9001   |

### 4.1 Si un puerto ya está ocupado (conflicto local)

Es común que `9000/9001` o `27017` ya los use otro servicio. Cambia el mapping
(dejando el contenedor igual), p. ej. MinIO a `9100/9101`:

```
# crear archivo `docker-compose.local.yml` en la raíz del repo:
services:
  minio:
    ports:
      - "9100:9000"
      - "9101:9001"
```

```
podman-compose -f docker-compose.yml -f docker-compose.local.yml up -d
```

Y luego en `apps/api/.env` usa `S3_ENDPOINT="http://localhost:9100"`.

---

## Paso 5 — Backend: instalar + generar Prisma + crear .env

```
cd apps/api
npm install
npx prisma generate
```

Crea `apps/api/.env`:

```
DATABASE_URL="postgresql://pos:pos@localhost:5434/pos?schema=public"
JWT_SECRET="$(openssl rand -hex 32)"
S3_ENDPOINT="http://localhost:9000"    # o "http://localhost:9100" si cambiaste MinIO de puerto
```

`MONGO_URI`, `S3_*`, `STORE_*`, `PORT` etc. tienen defaults que calzan con el
`docker-compose.yml`; solo agrégalos si los diferencias del default.

> Los datos quedan en los volúmenes nombrados de Podman (`aam_db-data`,
> `aam_mongo-data`, `aam_minio-data`). La restauración (Paso 6) los reescribe,
> así que no importa si traían datos de una sesión anterior.

---

## Paso 6 — Restaurar la data (con los contenedores arriba)

### 6.1 PostgreSQL

```
podman cp 20260914/pos.dump saas-pos-db:/tmp/pos.dump
podman exec saas-pos-db pg_restore -U pos -d pos --clean --if-exists /tmp/pos.dump
```

### 6.2 MongoDB

```
podman cp 20260914/mongo.archive saas-pos-mongo:/tmp/mongo.archive
podman exec saas-pos-mongo mongorestore \
  --uri="mongodb://pos:pos@localhost:27017/pos_crm?authSource=admin" \
  --archive=/tmp/mongo.archive --drop
```

### 6.3 MinIO (imágenes de productos, scraping y PDFs)

```
podman cp 20260914/minio saas-pos-minio:/tmp/minio-in
podman exec saas-pos-minio mc alias set local http://localhost:9000 minioadmin minioadmin
podman exec saas-pos-minio mc mb local/pos-productos
podman exec saas-pos-minio mc mirror --overwrite /tmp/minio-in/minio-export local/pos-productos
```

- El `mc alias set` se hace dentro del contenedor (puerto interno siempre 9000, no importa el host).
- `mc mb` solo la primera vez (crea el bucket si no existe).

---

## Paso 7 — Verificar que la restauración quedó bien

```
podman exec saas-pos-db psql -U pos -d pos -c 'SELECT email FROM "User";'
podman exec saas-pos-mongo mongosh "mongodb://pos:pos@localhost:27017/pos_crm?authSource=admin" \
  --eval 'db.scraped_products.countDocuments()'
podman exec saas-pos-minio mc ls local/pos-productos
```

Esperado: 2 usuarios (`admin@root.bo`, `armindevelopertec@gmail.com`), miles de
documentos de scraping y el bucket `pos-productos` con las carpetas `productos/`,
`scraping/`, `pdfs/`.

---

## Paso 8 — Correr el backend en modo dev

```
cd apps/api
npm run start:dev            # localhost:3001
```

Terminal 1 queda ocupada. Verifica en otra terminal:

```
curl -s http://localhost:3001/catalogo | head -c 200
```

---

## Paso 9 — Correr la web en modo dev

Terminal 2:

```
cd apps/web
npm install
npm run dev                  # localhost:3000
```

El proxy `/api` → `localhost:3001` funciona igual en dev que en producción
(está en `next.config.ts`, no requiere configuración).

---

## Paso 10 — Entrar y probar

```
http://localhost:3000
```

Inicia sesión con las credenciales reales de producción (el dump trae los 2
usuarios). Verifica que aparezcan productos con imagen, ventas y cotizaciones.

---

## Resolución de problemas

| Síntoma                            | Causa/solución                                                            |
|------------------------------------|--------------------------------------------------------------------------|
| `podman compose up` falla con socket| Usar `podman-compose up -d`                                              |
| MinIO no arranca, puerto 9000/9001 | Otro servicio lo usa → override a 9100/9101 (paso 4.1) + `S3_ENDPOINT`    |
| Mongo 27017 ocupado                | Detener tu Mongo local o cambiar el mapping en el compose                 |
| `npx prisma generate` error de .env| Crear `apps/api/.env` con `DATABASE_URL` (paso 5) antes de generar        |
| Imágenes no cargan                 | No se restauró MinIO o `S3_ENDPOINT` apunta a otro puerto (paso 6.3/5)   |
| Backend 401 en `/dashboard`        | Normal: requiere token. `/auth/login` + `/catalogo` son públicos          |

---

**Resumen en una línea:** clon → `scp` del tar → `tar -xzf` → `podman-compose up -d`
→ `.env` + `prisma generate` → `pg_restore` + `mongorestore` + `mc mirror` →
`npm run start:dev` (API) → `npm run dev` (web) → login en `localhost:3000`.