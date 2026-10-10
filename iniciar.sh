#!/bin/bash
# =====================================================
#  AAM - Iniciar todos los servicios (PM2)
#  - Contenedores (PostgreSQL, MongoDB, MinIO)
#  - Cloudflared Tunnel
#  - Backend NestJS (pm2)
#  - Frontend Next.js (pm2)
# =====================================================
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"
LOG_DIR="$ROOT/.logs"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

info()  { echo -e "\e[1;34m[INFO]\e[0m $1"; }
ok()    { echo -e "\e[1;32m[OK]\e[0m   $1"; }
fail()  { echo -e "\e[1;31m[ERROR]\e[0m $1"; exit 1; }
need_build() { [ ! -f "$1/.next/BUILD_ID" ]; }

# --------------------------------------------
# 1) Verificar Cloudflared
# --------------------------------------------
info "Verificando Cloudflared..."
if pgrep -f "cloudflared.*config.yml" > /dev/null 2>&1; then
    ok "Cloudflared ya está corriendo"
else
    info "Iniciando Cloudflared..."
    cloudflared --config /home/arminserver/.cloudflared/config.yml tunnel run 9c10117d-e974-4194-8bc8-32f772aea14e > /tmp/cloudflared.log 2>&1 &
    sleep 2
    ok "Cloudflared iniciado"
fi

# --------------------------------------------
# 2) Contenedores
# --------------------------------------------
info "Levantando contenedores..."
cd "$ROOT"
podman-compose up -d 2>&1 | tail -3 || fail "No se pudieron iniciar los contenedores"

for i in $(seq 1 30); do
    status=$(podman inspect --format '{{.State.Health.Status}}' saas-pos-db saas-pos-mongo saas-pos-minio 2>/dev/null | grep -vc healthy || true)
    if [ "$status" = "0" ] && [ -n "$(podman ps -q -f name=saas-pos-db)" ]; then
        ok "Contenedores healthy"
        break
    fi
    [ "$i" = "30" ] && fail "Contenedores no quedaron healthy"
    sleep 2
done

# --------------------------------------------
# 3) Backend - PM2
# --------------------------------------------
info "Preparando backend..."
cd "$API_DIR"
[ -f .env ] || fail "No existe apps/api/.env"

if [ ! -d dist/src ] || [ -z "$(ls -A dist/src 2>/dev/null)" ]; then
    info "Compilando backend..."
    npm run build || fail "Falló el build del backend"
fi

pm2 delete aam-backend 2>/dev/null || true
info "Iniciando aam-backend en pm2..."
cd "$API_DIR" && pm2 start dist/src/main.js --name aam-backend

for i in $(seq 1 15); do
    if curl -sf -o /dev/null http://localhost:3001/catalogo 2>/dev/null; then
        ok "Backend listo"
        break
    fi
    [ "$i" = "15" ] && fail "Backend no respondió a tiempo"
    sleep 1
done

# --------------------------------------------
# 4) Frontend - PM2
# --------------------------------------------
info "Preparando frontend..."
cd "$WEB_DIR"

if need_build "$WEB_DIR"; then
    info "Compilando frontend..."
    npm run build || fail "Falló el build del frontend"
fi

pm2 delete aam-frontend 2>/dev/null || true
info "Iniciando aam-frontend en pm2..."
cd "$WEB_DIR" && pm2 start npm --name aam-frontend -- start -- -H 0.0.0.0 -p 3000

for i in $(seq 1 20); do
    if curl -sf -o /dev/null http://localhost:3000 2>/dev/null; then
        ok "Frontend listo"
        break
    fi
    [ "$i" = "20" ] && fail "Frontend no respondió a tiempo"
    sleep 1
done

pm2 save

echo ""
echo "==================================================="
echo "  AAM INICIADO"
echo "==================================================="
echo "  Frontend : https://aam.segtecam.space"
echo "  Backend  : http://localhost:3001"
echo "==================================================="
pm2 list
