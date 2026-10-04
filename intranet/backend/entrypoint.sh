#!/usr/bin/env sh
set -e

echo "→ Migrations Django"
python manage.py migrate --noinput

echo "→ Collecte des fichiers statiques"
python manage.py collectstatic --noinput

exec "$@"
