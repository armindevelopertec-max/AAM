#!/usr/bin/env bash
# RespaldAAM todo el stack de datos en un tar.gz listo para copiar por SSH.
# Salida: backups/AAM-data-AAAAAMMDD.tar.gz
set -euo pipefail

FECHA=$(date +%Y%m%d)
DIR="$(cd "$(dirname "$0")" && pwd)"
STAGE="$DIR/backups/$FECHA"

echo "==> Fase 1/4: PostgreSQL (usuarios, ventas, cotizaciones, productos, kits...)"
rm -rf "$STAGE"
mkdir -p "$STAGE/minio"
podman exec saas-pos-db pg_dump -U pos -d pos -Fc > "$STAGE/pos.dump"
echo "    pos.dump: $(du -h "$STAGE/pos.dump" | cut -f1)"

echo "==> Fase 2/4: MongoDB (scraping y catálogo)"
podman exec saas-pos-mongo mongodump \
  --uri="mongodb://pos:pos@localhost:27017/pos_crm?authSource=admin" \
  --archive > "$STAGE/mongo.archive"
echo "    mongo.archive: $(du -h "$STAGE/mongo.archive" | cut -f1)"

echo "==> Fase 3/4: MinIO (imágenes de productos, kits, scraping y PDFs)"
podman exec saas-pos-minio mc alias set local http://localhost:9000 minioadmin minioadmin >/dev/null
podman exec saas-pos-minio rm -rf /tmp/minio-export
podman exec saas-pos-minio mc mirror local/pos-productos /tmp/minio-export
podman cp saas-pos-minio:/tmp/minio-export "$STAGE/minio/minio-export"
podman exec saas-pos-minio rm -rf /tmp/minio-export
echo "    minio/: $(du -sh "$STAGE/minio" | cut -f1)"

echo "==> Fase 4/4: Catálogo JSON y catálogo de la API"
cp "$DIR/jsondata/.catalogo_cctv_normalizado.json" "$STAGE/" 2>/dev/null || true

echo "==> Comprimiendo..."
tar -czf "$DIR/backups/AAM-data-$FECHA.tar.gz" -C "$DIR/backups" "$FECHA"
rm -rf "$STAGE"

echo ""
echo "Listo: backups/AAM-data-$FECHA.tar.gz ($(du -h "$DIR/backups/AAM-data-$FECHA.tar.gz" | cut -f1))"
echo ""
echo "Para copiarlo a otro equipo por SSH:"
echo "  scp backups/AAM-data-$FECHA.tar.gz usuario@IP:~/"
echo "  # o con rsync (reanuda si se corta):"
echo "  rsync -avP backups/AAM-data-$FECHA.tar.gz usuario@IP:~/"
