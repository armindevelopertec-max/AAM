# GUIA_ESTADO.md — Verificación del estado de AAM

Guía para comprobar en un vistazo que el sistema AAM está corriendo:
los **contenedores** (PostgreSQL, MongoDB, MinIO) y los **servicios npm**
(API NestJS y web Next.js).

Estado actual del proyecto: la máquina usa **podman** y los puertos de MinIO
están movidos a **9100/9101** (ver `docker-compose.local.yml` y `apps/api/.env`
con `S3_ENDPOINT="http://localhost:9100"`).

---

## 1) Verificación rápida con un solo comando

```bash
cd AAM
./estado.sh
```

El script `estado.sh` revisa y muestra en pantalla:

| Componente | Qué verifica | Resultado esperado |
|------------|--------------|--------------------|
| `saas-pos-db`    | `podman ps` (PostgreSQL)      | `Up ... (healthy)` |
| `saas-pos-mongo` | `podman ps` (MongoDB)         | `Up ... (healthy)` |
| `saas-pos-minio` | `podman ps` (MinIO)           | `Up ... (healthy)` |
| API  | proceso `npm run start:dev` + `GET http://localhost:3001/catalogo` | proceso activo y **HTTP 200** |
| Web  | proceso `npm run dev` + `GET http://localhost:3000`                | proceso activo y **HTTP 200** |

Al final imprime un resumen `5/5 componentes activos` (verde) o la lista de
lo que falta (rojo).

---

## 2) Comandos manuales de revisión

```bash
# 1. Contenedores
podman ps                       # los 3 deben estar "Up ... (healthy)"
podman ps --format '{{.Names}} {{.Status}}'

# 2. Puertos escuchando
ss -tulpn | grep -E ':(5434|27017|9100|9101|3001|3000)'

# 3. API (endpoint público). 200 = viva
curl -I http://localhost:3001/catalogo

# 4. Web. 200 = viva
curl -I http://localhost:3000

# 5. Procesos npm
ps aux | grep -E 'nest start|next dev' | grep -v grep
```

---

## 3) Accesos al sistema

| Servicio   | URL                          |
|------------|------------------------------|
| Web        | http://localhost:3000        |
| API        | http://localhost:3001        |
| MinIO consola | http://localhost:9101     |
| MinIO S3   | http://localhost:9100        |

---

## 4) Si algo no corre: cómo arrancarlo

```bash
# Contenedores (datos): esperar a que los 3 queden "healthy"
podman-compose up -d

# API (en otra terminal)
cd apps/api
npm run start:dev               # http://localhost:3001

# Web (en otra terminal)
cd apps/web
npm run dev                     # http://localhost:3000
```

Atajo para levantar todo junto (Ctrl+C detiene API/web; los contenedores quedan arriba):

```bash
cd AAM
./iniciar-dev.sh
```

---

## 5) Detener servicios

### Atajo con un solo comando (`./apagar.sh`)

Apaga API + web y detiene los contenedores en un solo paso **sin borrar datos**:

```bash
cd AAM
./apagar.sh                          # API + web + contenedores
./apagar.sh --solo-npm               # solo API y web (contenedores quedan arriba)
./apagar.sh --solo-contenedores      # solo contenedores
```

Para volver a encender: `./iniciar-dev.sh` y luego `./estado.sh`.

### Manualmente

```bash
# API y web: Ctrl+C en sus terminales, o
pkill -f 'nest start' ; pkill -f 'next dev'

# Contenedores (apaga y borra? no: se detienen, los datos persisten)
podman-compose down             # NO borra los volúmenes (db-data, mongo-data, minio-data)
```

Para apagado total con volúmenes: `podman-compose down -v` (**borra los datos**).

---

## 6) Solución de problemas frecuentes

- **MinIO no responde en 9000/9001**: este equipo usa `9100/9101`
  (mapping de `docker-compose.local.yml`). Revisa `S3_ENDPOINT` en
  `apps/api/.env` si lo cambiaste.
- **API responde 401**: es normal para rutas protegidas (`/products`, `/sales`).
  El estado se mide con `/catalogo` (público).
- **API web responde 404**: el script usa el endpoint correcto; 404 en el
  navegador suele ser una ruta que no existe, no que el servicio esté caído.
- **El web da 403/502 tras el deploy**: en producción se usa `npm run build` +
  `next start`, nunca `next dev` frente a Cloudflare.
- **Contenedor "unhealthy"**: revisa logs con
  `podman logs --tail 30 saas-pos-<nombre>` y puertos en uso
  (`ss -tulpn | grep -E ':(5434|27017|9100)'`).