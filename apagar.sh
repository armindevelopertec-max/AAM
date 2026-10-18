#!/bin/bash
# =====================================================
#  AAM - Apagar todos los servicios
# =====================================================
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

info()  { echo -e "\e[1;34m[INFO]\e[0m $1"; }
ok()    { echo -e "\e[1;32m[OK]\e[0m   $1"; }

info "Deteniendo servicios PM2..."
pm2 delete aam-backend aam-frontend 2>/dev/null || true
pm2 save || true
ok "PM2 limpio"

info "Deteniendo contenedores..."
cd "$ROOT" && podman-compose down > /dev/null 2>&1 || true
ok "Contenedores detenidos"

info "Deteniendo Cloudflared..."
sudo systemctl stop cloudflared-aam.service 2>/dev/null || true
ok "Cloudflared detenido"

echo ""
echo "==================================================="
echo "  AAM APAGADO"
echo "==================================================="
pm2 list
