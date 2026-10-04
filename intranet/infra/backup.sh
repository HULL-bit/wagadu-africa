#!/usr/bin/env bash
# Sauvegarde de la base PostgreSQL de Wagadu Hub.
#   cd /opt/wagadu-hub/infra && ./backup.sh
# Cron quotidien (3 h) :
#   0 3 * * * cd /opt/wagadu-hub/infra && ./backup.sh >> /var/log/wagadu-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")"
set -a; [ -f .env ] && . ./.env; set +a

DEST="${BACKUP_DIR:-./backups}"
KEEP="${BACKUP_KEEP:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$DEST/wagadu-${STAMP}.sql.gz"

mkdir -p "$DEST"

echo "→ pg_dump ${POSTGRES_DB} → ${FILE}"
docker compose -f docker-compose.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists \
  | gzip > "$FILE"

# Rotation : on ne garde que les KEEP plus récents
ls -1t "$DEST"/wagadu-*.sql.gz | tail -n +$((KEEP + 1)) | xargs -r rm -f

echo "→ OK ($(du -h "$FILE" | cut -f1)). Sauvegardes conservées : $(ls -1 "$DEST"/wagadu-*.sql.gz | wc -l)"

# Restauration :
#   gunzip -c infra/backups/wagadu-XXXX.sql.gz \
#     | docker compose -f infra/docker-compose.yml exec -T postgres \
#         psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
