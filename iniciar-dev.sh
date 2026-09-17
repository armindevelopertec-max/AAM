#!/usr/bin/env bash
# Inicia AAM para desarrollo: servicios de datos en Podman y API/Web con recarga.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"

info() { echo -e "\e[1;34m[INFO]\e[0m $*"; }
fail() { echo -e "\e[1;31m[ERROR]\e[0m $*" >&2; exit 1; }

# Usa la misma instalación de Node que el iniciador de producción, si existe.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

command -v podman-compose >/dev/null 2>&1 || fail "No se encontró podman-compose"
command -v npm >/dev/null 2>&1 || fail "No se encontró npm"
[ -f "$API_DIR/.env" ] || fail "No existe apps/api/.env"
[ -d "$API_DIR/node_modules" ] || fail "Faltan dependencias de la API: ejecuta cd apps/api && npm install"
[ -d "$WEB_DIR/node_modules" ] || fail "Faltan dependencias del frontend: ejecuta cd apps/web && npm install"

info "Levantando PostgreSQL, MongoDB y MinIO..."
podman-compose -f "$ROOT/docker-compose.yml" up -d

info "Iniciando API con recarga en http://localhost:3001..."
(cd "$API_DIR" && exec npm run start:dev) &
API_PID=$!

info "Iniciando web con recarga en http://localhost:3000..."
(cd "$WEB_DIR" && exec npm run dev -- -H 0.0.0.0 -p 3000) &
WEB_PID=$!

cleanup() {
  echo
  info "Deteniendo servidores de desarrollo..."
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
  wait "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo
echo "AAM en desarrollo"
echo "  Web: http://localhost:3000"
echo "  API: http://localhost:3001"
echo "  MinIO: http://localhost:9101"
echo "  Ctrl+C detiene API y web; los contenedores permanecen activos."
echo

wait "$API_PID" "$WEB_PID"
