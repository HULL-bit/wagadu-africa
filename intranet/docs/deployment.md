# Déploiement & maintenance — Wagadu Hub

Cible : **un serveur (VPS) + `docker compose`**. HTTPS automatique via **Caddy**,
fichiers utilisateurs sur **Cloudflare R2**. Aucun certificat à gérer à la main.

| Env | Branche | Settings backend | Secrets |
|---|---|---|---|
| Développement | toute branche | `wagadu.settings.dev` | `infra/.env` local |
| Production | `main` | `wagadu.settings.prod` | `infra/.env` sur le serveur |

## Stack (`infra/docker-compose.yml`)

`caddy` (reverse-proxy + TLS), `backend` (gunicorn), `frontend` (Next standalone),
`postgres`, `redis`, `celery-worker`, `celery-beat`. Profil optionnel `chat`
(`mongodb` + `rocketchat`). `docker-compose.override.yml` (chargé automatiquement)
bascule le tout en mode développement local.

- `caddy` lit `infra/caddy/Caddyfile` (prod, domaine `{$SITE_DOMAIN}`) ou
  `Caddyfile.dev` (HTTP local via l'override).
- Caddy route `/api/*`, `/django-admin/*`, `/static/*` → backend, `/chat/*` →
  Rocket.Chat, le reste → frontend. Même origine ⇒ pas de CORS ni de proxy Next.
- Les fichiers médias ne transitent pas par Caddy : R2 renvoie des URLs signées
  publiques.

---

## 1. Provisionner le serveur

VPS conseillé : **Hetzner CX22** (2 vCPU / 4 Go / 40 Go, ~4,5 €/mois) ou
équivalent DigitalOcean / Scaleway. Ubuntu 24.04.

```bash
# En root sur le serveur
apt update && apt -y upgrade
curl -fsSL https://get.docker.com | sh
adduser --disabled-password --gecos "" wagadu
usermod -aG docker wagadu

# En tant que wagadu
git clone https://github.com/HULL-bit/W-HUB.git /opt/wagadu-hub
cd /opt/wagadu-hub/infra
cp .env.example .env
```

### DNS

Créer un enregistrement **A** (et **AAAA** si IPv6) :
`hub.mondomaine.org` → IP du serveur. Caddy obtiendra le certificat au premier
démarrage (port 80 + 443 doivent être ouverts).

### Cloudflare R2

1. R2 → **Create bucket** (ex. `wagadu-hub-media`).
2. R2 → **Manage R2 API Tokens** → *Create API token* : permission
   **Object Read & Write**, limité au bucket.
3. Noter **Access Key ID**, **Secret Access Key** et l'**endpoint**
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

### `infra/.env` (extrait à renseigner)

```
SITE_DOMAIN=hub.mondomaine.org
ACME_EMAIL=admin@mondomaine.org
DJANGO_SECRET_KEY=<python -c "import secrets;print(secrets.token_urlsafe(50))">
DJANGO_ALLOWED_HOSTS=hub.mondomaine.org
DJANGO_CSRF_TRUSTED_ORIGINS=https://hub.mondomaine.org
CORS_ALLOWED_ORIGINS=https://hub.mondomaine.org
POSTGRES_PASSWORD=<mot de passe fort>
MINIO_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
MINIO_BUCKET=wagadu-hub-media
MINIO_ACCESS_KEY=<R2 Access Key ID>
MINIO_SECRET_KEY=<R2 Secret Access Key>
EMAIL_HOST=...          # SMTP pour les notifications e-mail
DEFAULT_FROM_EMAIL=wagadu-hub@mondomaine.org
```

## 2. Premier démarrage

```bash
cd /opt/wagadu-hub
# Tirer les images publiées par la CI (ou `up -d --build` pour construire localement)
docker compose -f infra/docker-compose.yml pull
docker compose -f infra/docker-compose.yml up -d

# Compte Super Administrateur (une seule fois)
docker compose -f infra/docker-compose.yml exec backend \
  python manage.py createsuperadmin
```

`entrypoint.sh` du backend applique `migrate` + `collectstatic` à chaque
démarrage. Vérifier : `https://hub.mondomaine.org` (front), `/api/v1/schema/` (API),
`/django-admin/` (admin Django).

Messagerie temps réel : la **messagerie native** fonctionne sans configuration.
Pour Rocket.Chat en plus : renseigner `ROCKETCHAT_URL` puis
`docker compose -f infra/docker-compose.yml --profile chat up -d`.

## 3. Déploiement continu (GitHub Actions)

`.github/workflows/deploy.yml` : à chaque push sur `main`,
1. `build-push` : construit et pousse `ghcr.io/<owner>/wagadu-hub-{backend,frontend}:latest` ;
2. `deploy` : SSH → `git pull` → `docker compose pull backend frontend` →
   `up -d` → `migrate`.

Le job `deploy` est **ignoré** tant que la variable `DEPLOY_ENABLED` n'est pas
`true`. Pour l'activer (Settings → Secrets and variables → Actions) :

| Type | Nom | Valeur |
|---|---|---|
| Variable | `DEPLOY_ENABLED` | `true` |
| Secret | `SERVER_HOST` / `SERVER_USER` / `SERVER_SSH_KEY` | connexion SSH |
| Secret | `DEPLOY_PATH` | `/opt/wagadu-hub` |

Sur le serveur : `docker login ghcr.io` (PAT `read:packages`) si le paquet GHCR
est privé.

## 4. Sauvegardes

`infra/backup.sh` — `pg_dump` gzip + rotation (`BACKUP_KEEP`, défaut 14).

```bash
crontab -e
# tous les jours à 03:00
0 3 * * * cd /opt/wagadu-hub/infra && ./backup.sh >> /var/log/wagadu-backup.log 2>&1
```

Externalisation conseillée : `rclone copy infra/backups/ r2:wagadu-hub-backups`
en fin de script. **Tester la restauration** régulièrement (commande en
commentaire dans `backup.sh`). Les fichiers médias sont déjà sur R2 (versioning
activable côté Cloudflare).

## 5. Journal d'audit — rétention

Tâche Celery `apps.audit.tasks.purge_audit_log` : purge les entrées de plus de
365 jours (archive CSV vers R2). Planifiée via `django_celery_beat` (admin Django,
tous les jours à 03:00).

## Check-list mise en production

- [ ] `DJANGO_SECRET_KEY` unique, `DJANGO_DEBUG=0`
- [ ] `DJANGO_ALLOWED_HOSTS` / `CSRF_TRUSTED_ORIGINS` / `CORS_ALLOWED_ORIGINS` = domaine réel
- [ ] DNS A/AAAA en place, ports 80 + 443 ouverts (Caddy → certificat auto)
- [ ] `POSTGRES_PASSWORD` fort ; clés R2 limitées au bucket
- [ ] `createsuperadmin` lancé une fois ; comptes créés ensuite via l'appli
- [ ] `backup.sh` planifié **et restauration testée**
- [ ] SMTP configuré (sinon pas de notifications e-mail)
