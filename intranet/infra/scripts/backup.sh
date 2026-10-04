#!/usr/bin/env bash
# Sauvegarde PostgreSQL + MinIO vers un stockage externe.
# À planifier via cron sur le serveur (hors pipeline CI/CD) — voir section 5.7.
set -euo pipefail

STAMP=$(date +%Y%m%d-%H%M%S)
DEST=${BACKUP_DEST:-/opt/wagadu-hub/backups}
mkdir -p "$DEST"

echo "→ Dump PostgreSQL"
docker compose -f "$(dirname "$0")/../docker-compose.yml" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-wagadu}" "${POSTGRES_DB:-wagadu}" | gzip > "$DEST/db-$STAMP.sql.gz"

echo "→ Archive MinIO"
docker compose -f "$(dirname "$0")/../docker-compose.yml" exec -T minio \
  tar czf - /data > "$DEST/minio-$STAMP.tar.gz"

echo "→ Rétention : 14 jours"
find "$DEST" -type f -mtime +14 -delete

# Externalisation (exemple) :
# rclone copy "$DEST" remote-externe:wagadu-hub-backups
echo "Sauvegarde terminée : $DEST (db-$STAMP, minio-$STAMP)"
