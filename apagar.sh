#!/usr/bin/env bash
# apagar.sh — detiene TODOS los servicios de AAM:
#   procesos npm (API + web) y contenedores (PostgreSQL, MongoDB, MinIO).
# Los datos se conservan (no se borran volúmenes).
# Uso:
#   ./apagar.sh                  # apaga API, web y contenedores
#   ./apagar.sh --solo-npm       # solo API + web (contenedores quedan arriba)
#   ./apagar.sh --solo-contenedores  # solo los contenedores (API/web quedan)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

green() { echo -e "\e[1;32m[OK]\e[0m $*"; }
red()   { echo -e "\e[1;31m[FALLO]\e[0m $*"; }
info()  { echo -e "\e[1;34m[INFO]\e[0m $*"; }
warn()  { echo -e "\e[1;33m[--]\e[0m $*"; }

SOLO_NPM=false
SOLO_CONT=false
case "${1:-}" in
  --solo-npm)       SOLO_NPM=true ;;
  --solo-contenedores) SOLO_CONT=true ;;
  -h|--help) grep '^#' "$0" | head -6; exit 0 ;;
esac

detener_npm() {
  info "Deteniendo API y web..."
  kill_matches=("nest start" "next dev")
  for pat in "${kill_matches[@]}"; do
    pids="$(pgrep -f "$pat" || true)"
    if [ -n "$pids" ]; then
      kill $pids 2>/dev/null || true
      warn "Enviado SIGTERM a: $pids  ($pat)"
    fi
  done
  sleep 2
  for pat in "${kill_matches[@]}"; do
    pids="$(pgrep -f "$pat" || true)"
    if [ -n "$pids" ]; then
      kill -9 $pids 2>/dev/null || true
      warn "Forzado apagado de: $pids  ($pat)"
    fi
  done
  if [ -z "$(pgrep -f 'nest start|next dev' || true)" ]; then
    green "API y web detenidos."
  else
    red "Algunos procesos npm siguen vivos."
  fi
}

detener_contenedores() {
  command -v podman-compose >/dev/null 2>&1 && {
    info "Deteniendo contenedores (podman-compose down)..."
    podman-compose -f "$ROOT/docker-compose.yml" down
    return
  }
  command -v podman >/dev/null 2>&1 && {
    info "Deteniendo contenedores (podman stop)..."
    podman stop saas-pos-db saas-pos-mongo saas-pos-minio 2>/dev/null || true
    return
  }
  red "No se encontró podman/podman-compose."
}

[ "$SOLO_NPM" = true ] && { detener_npm; exit 0; }
[ "$SOLO_CONT" = true ] && { detener_contenedores; }
[ "$SOLO_CONT" = false ] && { detener_npm; detener_contenedores; }

echo
warn "Datos conservados (los volúmenes db-data, mongo-data y minio-data persisten)."
echo "Para volver a encender: ./iniciar-dev.sh y ./estado.sh"