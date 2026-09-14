#!/usr/bin/env bash
# estado.sh — verifica el estado de AAM:
#   contenedores (PostgreSQL, MongoDB, MinIO) + servicios npm (API y web)
# Uso: ./estado.sh

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_PORT=3001
WEB_PORT=3000

green() { echo -e "\e[1;32m[OK]\e[0m $*"; }
red()   { echo -e "\e[1;31m[FALLO]\e[0m $*"; }
warn()  { echo -e "\e[1;33m[--]\e[0m $*"; }
title() { echo; echo -e "\e[1;36m== $* ==\e[0m"; }

command -v podman >/dev/null 2>&1 || { red "No se encuentra podman"; exit 1; }
command -v curl  >/dev/null 2>&1 || { red "No se encuentra curl"; exit 1; }

title "Contenedores (podman)"

required_containers=(saas-pos-db saas-pos-mongo saas-pos-minio)

for name in "${required_containers[@]}"; do
  row="$(podman ps --format '{{.Names}}|{{.Status}}' | grep "^$name|" || true)"
  if [ -z "$row" ]; then
    red "$name — NO está corriendo"
  else
    state="$(echo "$row" | cut -d'|' -f2)"
    case "$state" in
      *healthy*) green "$name — $state" ;;
      *)         warn "$name — $state (aún no 'healthy')" ;;
    esac
  fi
done

title "Servicios npm (procesos)"

api_procs="$(pgrep -af "apps/api|nest start" | grep -v "grep" || true)"
web_procs="$(pgrep -af "apps/web|next dev" | grep -v "grep" || true)"

if [ -n "$api_procs" ]; then
  green "API (npm run start:dev) corre:"
  echo "$api_procs" | sed 's/^/    /'
else
  red "API (npm run start:dev) NO está corriendo"
fi

if [ -n "$web_procs" ]; then
  green "Web (npm run dev) corre:"
  echo "$web_procs" | sed 's/^/    /'
else
  red "Web (npm run dev) NO está corriendo"
fi

title "Puertos y respuesta HTTP"

api_http="$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 \
  "http://localhost:$API_PORT/catalogo" || true)"
if [ "$api_http" = "200" ]; then
  green "API  http://localhost:$API_PORT/catalogo -> HTTP 200"
else
  red "API  http://localhost:$API_PORT responde HTTP $api_http (esperado 200)"
fi

web_http="$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 \
  "http://localhost:$WEB_PORT" || true)"
if [ "$web_http" = "200" ]; then
  green "Web  http://localhost:$WEB_PORT -> HTTP 200"
else
  red "Web  http://localhost:$WEB_PORT responde HTTP $web_http (esperado 200)"
fi

echo
echo "Resumen de accesos:"
echo "  Web:                http://localhost:$WEB_PORT"
echo "  API:                http://localhost:$API_PORT"
echo "  MinIO consola:      http://localhost:9101  (S3 http://localhost:9100)"

total_ok=0
total_fail=0
[ "$api_http" = "200" ] && total_ok=$((total_ok+1)) || total_fail=$((total_fail+1))
[ "$web_http" = "200" ] && total_ok=$((total_ok+1)) || total_fail=$((total_fail+1))
[ -n "$(podman ps --filter name=saas-pos-db --filter "status=running" -q)" ] && total_ok=$((total_ok+1)) || total_fail=$((total_fail+1))
[ -n "$(podman ps --filter name=saas-pos-mongo --filter "status=running" -q)" ] && total_ok=$((total_ok+1)) || total_fail=$((total_fail+1))
[ -n "$(podman ps --filter name=saas-pos-minio --filter "status=running" -q)" ] && total_ok=$((total_ok+1)) || total_fail=$((total_fail+1))

echo
if [ "$total_fail" -eq 0 ]; then
  echo -e "\e[1;32mTODO CORRIENDO: $total_ok/5 componentes activos.\e[0m"
else
  echo -e "\e[1;31mFALTAN $total_fail COMPONENTE(S): $total_ok/5 activos.\e[0m"
  echo "Revisa GUIA_ESTADO.md para comandos de arranque/verificación."
fi
exit 0