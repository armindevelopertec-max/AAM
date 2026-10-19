#!/bin/bash
# =====================================================
#  AAM - Desarrollo local (laptop)
#  - Contenedores (PostgreSQL, MongoDB, MinIO)
#  - Backend NestJS  con recarga en caliente  (:3001)
#  - Frontend Next.js con recarga en caliente (:3000)
#
#  NO toca Cloudflared ni pm2: eso es de produccion (./iniciar.sh)
#
#  Uso:
#    ./iniciar-dev.sh          levanta todo
#    Ctrl+C                    detiene API y web (contenedores quedan arriba)
#    ./apagar.sh               detiene todo
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

mkdir -p "$LOG_DIR"

API_PID=""
WEB_PID=""

# --------------------------------------------
# Ctrl+C -> detener API y web
# --------------------------------------------
cleanup() {
    echo ""
    info "Deteniendo API y web..."
    [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null || true
    [ -n "$WEB_PID" ] && kill "$WEB_PID" 2>/dev/null || true
    wait 2>/dev/null || true
    ok "Desarrollo detenido (contenedores siguen arriba)"
}
trap cleanup INT TERM

# --------------------------------------------
# 1) Contenedores
# --------------------------------------------
info "Comprobando contenedores..."
cd "$ROOT"

CONTAINERS="saas-pos-db saas-pos-mongo saas-pos-minio"
ALL_HEALTHY=1

for c in $CONTAINERS; do
    if ! podman ps -q -f name="^${c}$" | grep -q .; then
        ALL_HEALTHY=0
        break
    fi
    H=$(podman inspect --format '{{.State.Health.Status}}' "$c" 2>/dev/null || echo "unknown")
    if [ "$H" != "healthy" ]; then
        ALL_HEALTHY=0
        break
    fi
done

if [ "$ALL_HEALTHY" -eq 1 ]; then
    ok "Contenedores ya están arriba y healthy"
else
    info "Levantando contenedores..."
    podman-compose up -d 2>&1 | tail -3 || fail "No se pudieron iniciar los contenedores"

    for i in $(seq 1 60); do
        bad=0
        for c in $CONTAINERS; do
            if ! podman ps -q -f name="^${c}$" | grep -q .; then
                bad=1; break
            fi
            H=$(podman inspect --format '{{.State.Health.Status}}' "$c" 2>/dev/null || echo "unknown")
            if [ "$H" != "healthy" ]; then
                bad=1; break
            fi
        done
        if [ "$bad" -eq 0 ]; then
            ok "Contenedores healthy"
            break
        fi
        [ "$i" = "60" ] && fail "Contenedores no quedaron healthy"
        sleep 2
    done
fi

# --------------------------------------------
# 2) Verificaciones previas
# --------------------------------------------
[ -f "$API_DIR/.env" ] || fail "No existe apps/api/.env (ver README §2.1)"
[ -d "$API_DIR/node_modules" ] || fail "Falta node_modules en apps/api  -> cd apps/api && npm install"
[ -d "$WEB_DIR/node_modules" ]  || fail "Falta node_modules en apps/web  -> cd apps/web && npm install"

# Cliente Prisma (si nunca se generó)
if [ ! -d "$API_DIR/node_modules/.prisma" ]; then
    info "Generando cliente Prisma..."
    (cd "$API_DIR" && npx prisma generate) || fail "Falló prisma generate"
fi

# --------------------------------------------
# 3) Backend - dev con recarga (log: .logs/api.log)
# --------------------------------------------
if curl -sf -o /dev/null http://localhost:3001 2>/dev/null; then
    info "Ya hay algo corriendo en :3001, se omite el backend"
else
    info "Iniciando backend (npm run start:dev)..."
    (cd "$API_DIR" && npm run start:dev > "$LOG_DIR/api.log" 2>&1) &
    API_PID=$!

    info "Esperando backend en :3001 ..."
    for i in $(seq 1 60); do
        if curl -sf -o /dev/null http://localhost:3001/catalogo 2>/dev/null; then
            ok "Backend listo en http://localhost:3001"
            break
        fi
        [ "$i" = "60" ] && fail "Backend no respondió. Revisa: tail -f .logs/api.log"
        sleep 1
    done
fi

# --------------------------------------------
# 4) Frontend - dev con hot reload (log: .logs/web.log)
# --------------------------------------------
if curl -sf -o /dev/null http://localhost:3000 2>/dev/null; then
    info "Ya hay algo corriendo en :3000, se omite el frontend"
else
    info "Iniciando frontend (npm run dev)..."
    (cd "$WEB_DIR" && npm run dev > "$LOG_DIR/web.log" 2>&1) &
    WEB_PID=$!

    info "Esperando frontend en :3000 ..."
    for i in $(seq 1 60); do
        if curl -sf -o /dev/null http://localhost:3000 2>/dev/null; then
            ok "Frontend listo en http://localhost:3000"
            break
        fi
        [ "$i" = "60" ] && fail "Frontend no respondió. Revisa: tail -f .logs/web.log"
        sleep 1
    done
fi

echo ""
echo "==================================================="
echo "  AAM DEV - modo desarrollo"
echo "==================================================="
echo "  Web    : http://localhost:3000"
echo "  API    : http://localhost:3001"
echo "  Logs   : tail -f .logs/api.log | .logs/web.log"
echo "  Parar  : Ctrl+C (contenedores quedan arriba)"
echo "==================================================="
echo ""

# Esperar hasta que el usuario pulse Ctrl+C
wait
