#!/bin/bash
# =====================================================
#  Inicia todo el proyecto AAM:
#  - Contenedores (PostgreSQL, MongoDB, MinIO) con Podman
#  - Backend NestJS (apps/api)
#  - Frontend Next.js (apps/web)
# =====================================================
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"
LOG_DIR="$ROOT/.logs"
SERVER_IP="$(hostname -I | awk '{print $1}')"
mkdir -p "$LOG_DIR"

# Cargar Node.js vía nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

info()  { echo -e "\e[1;34m[INFO]\e[0m $1"; }
ok()    { echo -e "\e[1;32m[OK]\e[0m   $1"; }
fail()  { echo -e "\e[1;31m[ERROR]\e[0m $1"; exit 1; }

# --------------------------------------------
# 1) Contenedores
# --------------------------------------------
info "Levantando contenedores (Podman)..."
cd "$ROOT"
podman-compose up -d 2>&1 | tail -3 || fail "No se pudieron iniciar los contenedores"

# Esperar a que estén healthy
echo "Esperando que los servicios estén listos..."
for i in $(seq 1 30); do
    status=$(podman inspect --format '{{.State.Health.Status}}' saas-pos-db saas-pos-mongo saas-pos-minio 2>/dev/null | grep -vc healthy || true)
    if [ "$status" = "0" ] && [ -n "$(podman ps -q -f name=saas-pos-db)" ]; then
        ok "Contenedores healthy"
        break
    fi
    [ "$i" = "30" ] && fail "Los contenedores no quedaron healthy a tiempo"
    sleep 2
done

# --------------------------------------------
# 2) Backend (NestJS)
# --------------------------------------------
info "Preparando backend (API)..."
cd "$API_DIR"
[ -f .env ] || fail "No existe apps/api/.env"

# Permitir CORS desde localhost y desde la IP actual (para laptop en la red)
if grep -q "CORS_ORIGIN" "$API_DIR/.env"; then
    if ! grep -q "$SERVER_IP" "$API_DIR/.env"; then
        sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=\"http://localhost:3000,http://${SERVER_IP}:3000\"|" "$API_DIR/.env"
        info "Actualizado CORS_ORIGIN en apps/api/.env con ${SERVER_IP}"
    fi
fi

if [ ! -d dist ] || [ -z "$(ls -A dist 2>/dev/null)" ]; then
    info "Compilando backend..."
    npm run build || fail "Falló el build del backend"
fi

if ! curl -sf -o /dev/null http://localhost:3001/catalogo 2>/dev/null; then
    info "Iniciando backend en http://localhost:3001 ..."
    ( cd "$API_DIR" && setsid npm run start:prod > "$LOG_DIR/api.log" 2>&1 < /dev/null & )
    for i in $(seq 1 25); do
        if curl -sf -o /dev/null http://localhost:3001/catalogo 2>/dev/null; then
            ok "Backend listo"
            break
        fi
        [ "$i" = "25" ] && fail "El backend no respondió a tiempo. Revisa $LOG_DIR/api.log"
        sleep 1
    done
else
    ok "Backend ya estaba corriendo"
fi

# --------------------------------------------
# 3) Frontend (Next.js)
# --------------------------------------------
info "Preparando frontend (Next.js)..."
cd "$WEB_DIR"
if [ ! -d node_modules ]; then
    info "Instalando dependencias del frontend..."
    npm install || fail "Falló npm install en el frontend"
fi

# Configurar la API URL del frontend para el acceso en red
if [ ! -f "$WEB_DIR/.env" ]; then
    echo "NEXT_PUBLIC_API_URL=http://${SERVER_IP}:3001" > "$WEB_DIR/.env"
    info "Creado apps/web/.env con NEXT_PUBLIC_API_URL=http://${SERVER_IP}:3001"
    NEED_RESTART=1
fi

# Permitir el acceso cross-origin en dev desde la IP actual (y localhost)
if grep -q "allowedDevOrigins" "$WEB_DIR/next.config.ts"; then
    if ! grep -q "$SERVER_IP" "$WEB_DIR/next.config.ts"; then
        sed -i "s|allowedDevOrigins: \[[^]]*\]|allowedDevOrigins: [\"localhost\", \"127.0.0.1\", \"${SERVER_IP}\"]|" "$WEB_DIR/next.config.ts"
        info "Actualizado allowedDevOrigins en next.config.ts con ${SERVER_IP}"
        NEED_RESTART=1
    fi
fi

if ! curl -sf -o /dev/null http://localhost:3000 2>/dev/null; then
    info "Iniciando frontend en http://${SERVER_IP}:3000 ..."
    ( cd "$WEB_DIR" && setsid npx next dev -H 0.0.0.0 -p 3000 > "$LOG_DIR/web.log" 2>&1 < /dev/null & )
    for i in $(seq 1 40); do
        if curl -sf -o /dev/null http://localhost:3000 2>/dev/null; then
            ok "Frontend listo"
            break
        fi
        [ "$i" = "40" ] && fail "El frontend no respondió a tiempo. Revisa $LOG_DIR/web.log"
        sleep 1
    done
else
    ok "Frontend ya estaba corriendo"
    if [ "$NEED_RESTART" = "1" ]; then
        info "Reiniciando frontend para aplicar NEXT_PUBLIC_API_URL..."
        pkill -f "next dev" 2>/dev/null
        sleep 2
        ( cd "$WEB_DIR" && setsid npx next dev -H 0.0.0.0 -p 3000 > "$LOG_DIR/web.log" 2>&1 < /dev/null & )
        sleep 8
        ok "Frontend reiniciado"
    fi
fi

echo ""
echo "==================================================="
echo "  PROYECTO AAM INICIADO"
echo "==================================================="
echo "  Frontend : http://${SERVER_IP}:3000"
echo "  Backend  : http://localhost:3001"
echo "  MinIO    : http://localhost:9001"
echo "  Logs     : $LOG_DIR"
echo "  Usuario  : admin@demo.mx  /  admin123"
echo ""
echo "  Si no puedes acceder desde tu laptop en la red, abre el"
echo "            firewall: sudo firewall-cmd --permanent --add-port=3000-3001/tcp"
echo "                     sudo firewall-cmd --reload"
echo "==================================================="
