#!/bin/sh
# Exécuté une seule fois par l'image postgres, au tout premier démarrage sur
# un volume vide (docker-entrypoint-initdb.d) — crée la base/rôle dédiés à
# Directus, en plus de POSTGRES_DB (Hub), sur le même serveur Postgres.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER ${DIRECTUS_DB_USER:-directus_app} WITH PASSWORD '${DIRECTUS_DB_PASSWORD}';
    CREATE DATABASE ${DIRECTUS_DB_NAME:-wagadu_cms} OWNER ${DIRECTUS_DB_USER:-directus_app};
EOSQL
