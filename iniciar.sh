#!/bin/bash
# =====================================================
#  AAM - Iniciar todos los servicios (PM2)
#  - Contenedores (PostgreSQL, MongoDB, MinIO)
#  - Cloudflared Tunnel (servicio systemd)
#  - Backend NestJS (pm2)
#  - Frontend Next.js (pm2)
# =====================================================
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

info()  { echo -e "\e[1;34m[INFO]\e[0m $1"; }
ok()    { echo -e "\e[1;32m[OK]\e[0m   $1"; }
fail()  { echo -e "\e[1;31m[ERROR]\e[0m $1"; exit 1; }
need_build() { [ ! -f "$1/.next/BUILD_ID" ]; }

# --------------------------------------------
# 1) Cloudflared (servicio systemd, arranca en el boot)
# --------------------------------------------
info "Verificando Cloudflared..."
if systemctl is-active --quiet cloudflared-aam.service; then
    ok "Cloudflared ya está corriendo"
else
    info "Iniciando Cloudflared (servicio systemd)..."
    sudo systemctl start cloudflared-aam.service || fail "No se pudo iniciar cloudflared"
    sleep 3
    systemctl is-active --quiet cloudflared-aam.service || fail "cloudflared no quedó activo"
    ok "Cloudflared iniciado"
fi

# --------------------------------------------
# 2) Contenedores
# --------------------------------------------
info "Levantando contenedores..."
cd "$ROOT"
podman-compose up -d 2>&1 | tail -3 || fail "No se pudieron iniciar los contenedores"

for i in $(seq 1 60); do
    bad=0
    for c in saas-pos-db saas-pos-mongo saas-pos-minio; do
        if ! podman ps -q -f name="^${c}$" | grep -q .; then
            bad=1; break
        fi
        h=$(podman inspect --format '{{.State.Health.Status}}' "$c" 2>/dev/null || echo "unknown")
        [ "$h" = "healthy" ] || { bad=1; break; }
    done
    if [ "$bad" -eq 0 ]; then
        ok "Contenedores healthy"
        break
    fi
    [ "$i" = "60" ] && fail "Contenedores no quedaron healthy (revisa: podman ps -a)"
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

for i in $(seq 1 120); do
    if curl -sf -o /dev/null http://localhost:3001/catalogo 2>/dev/null; then
        ok "Backend listo"
        break
    fi
    [ "$i" = "120" ] && fail "Backend no respondió a tiempo (revisa: pm2 logs aam-backend)"
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

for i in $(seq 1 60); do
    if curl -sf -o /dev/null http://localhost:3000 2>/dev/null; then
        ok "Frontend listo"
        break
    fi
    [ "$i" = "60" ] && fail "Frontend no respondió a tiempo (revisa: pm2 logs aam-frontend)"
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
