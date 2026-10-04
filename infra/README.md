# Infra — Wagadu Africa (site public)

Voir le plan complet : `/home/hull-bit/.claude/plans/robust-forging-zephyr.md` (section A).

## Développement local

Aucune dépendance à l'infrastructure de production du Hub — tout tourne en
conteneurs jetables, y compris le Hub lui-même (`intranet/`) pour un
développement local unifié (voir README racine pour le détail) :

```bash
echo "127.0.0.1  wagadu.local cms.wagadu.local intranet.wagadu.local" | sudo tee -a /etc/hosts
docker compose -f infra/docker-compose.dev.yml up -d
# Site     : http://wagadu.local
# Directus : http://cms.wagadu.local/admin (admin@wagadu-africa.org / voir infra/.env)
# Hub      : http://intranet.wagadu.local
```

Le site tourne lui aussi dans ce compose (service `site`, mode dev — code
monté en volume, hot-reload), donc `docker compose up -d` suffit à tout
démarrer. Nginx (`infra/nginx/default.conf`) route chaque sous-domaine vers
le bon service par son nom Docker.

Puis, pour créer le schéma et injecter le contenu réel migré du brief :

```bash
node cms/seed/schema-and-content.mjs      # languages, piliers, realisations (Blue-Track + Kayar)
node cms/seed/02-valeurs-et-pages.mjs     # valeurs (accueil + qui-sommes-nous), pages_statiques
node cms/seed/03-projets.mjs              # collection projets (structure, sans contenu fabriqué)
node cms/seed/04-realisations-reelles.mjs # fusion Blue-Track/Kayar, O'Crystal, FISH4ACP
node cms/seed/05-contact-newsletter.mjs   # messages_contact, newsletter_abonnes + jetons de service
```

Tous les scripts sont idempotents (relancer ne duplique rien) — à rejouer
intégralement si le volume Postgres de Directus est recréé (ex. après un
`docker compose down -v`), plus rien n'existe alors côté contenu.

Le site Next.js (`/site`) lit `site/.env.local` (via `env_file` dans le
service `site`), sauf `DIRECTUS_URL` qui est réécrit sur `http://directus:8055`
dans `docker-compose.dev.yml` — la valeur du fichier est pensée pour un accès
direct depuis l'hôte, pas depuis un conteneur.

## Production — hébergement Render, pas de Docker Compose partagé

Décision validée avec l'utilisateur (voir plan, section A) : le site et
Directus sont déployés comme **services web Render** (`infra/render.yaml`),
pas dans le docker-compose du Hub. Le seul point de couplage réel avec
l'infrastructure du Hub est le **Postgres partagé**.

### Runbook manuel — à exécuter par l'utilisateur/l'ops sur le VPS du Hub

Ceci touche une base de données de production déjà en service pour le Hub.
Je n'ai pas d'accès SSH à ce serveur depuis cet environnement — ces étapes
ne sont **pas automatisées** et doivent être revues avant exécution.

1. Sur le Postgres du Hub : créer une base et un rôle applicatif dédiés,
   jamais le rôle superuser du Hub :
   ```sql
   CREATE DATABASE wagadu_cms;
   CREATE ROLE directus_app LOGIN PASSWORD '...' NOSUPERUSER;
   GRANT ALL ON DATABASE wagadu_cms TO directus_app;
   ```
2. Publier le port Postgres du conteneur (`ports: ["5432:5432"]` sur le
   service `postgres` de `PORTAIL-INTERNE/infra/docker-compose.yml`) — petite
   PR additive sur ce dépôt, à réviser séparément.
3. Forcer TLS (`ssl = on` côté Postgres, `sslmode=require` côté Directus).
4. Pare-feu (`ufw`/`iptables`) : n'autoriser ce port qu'aux IP sortantes
   statiques des services Render `wagadu-directus`/`wagadu-umami` (visibles
   dans leur dashboard une fois créés) — jamais `0.0.0.0/0`.
5. `pg_hba.conf` : une ligne `hostssl wagadu_cms directus_app <ip>/32
   scram-sha-256` par IP Render autorisée.

Tester le pare-feu avant d'ouvrir le port, et vérifier
`docker compose -f PORTAIL-INTERNE/infra/docker-compose.yml ps` reste
`healthy` après coup (aucune régression attendue sur le Hub).

### Domaines & TLS

Gérés nativement par Render (domaines personnalisés + certificats
automatiques par service) — `wagadu-africa.org` sur `wagadu-site`,
`cms.wagadu-africa.org` sur `wagadu-directus`. `.com`/`.net` redirigent vers
`.org` via `site/proxy.ts`, pas via Caddy. **Aucune modification du Caddy du
Hub n'est nécessaire.**
