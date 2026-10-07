#!/bin/sh
# Exécuté une seule fois par l'image postgres, au tout premier démarrage sur
# un volume vide — crée la base/rôle dédiés à Umami (analytics), en plus de
# POSTGRES_DB (Hub) et wagadu_cms (Directus), sur le même serveur Postgres.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE USER ${UMAMI_DB_USER:-umami_app} WITH PASSWORD '${UMAMI_DB_PASSWORD}';
    CREATE DATABASE ${UMAMI_DB_NAME:-wagadu_analytics} OWNER ${UMAMI_DB_USER:-umami_app};
EOSQL
