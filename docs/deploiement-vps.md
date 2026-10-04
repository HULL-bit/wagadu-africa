# Déploiement sur VPS (Fedora)

Déploiement de la stack complète — site public, CMS Directus, Hub/intranet
(Django + Next.js), Postgres, Redis — sur un unique VPS Fedora, via
`intranet/infra/docker-compose.yml` (image Caddy en frontal, HTTPS
automatique Let's Encrypt). Toutes les commandes `docker compose` ci-dessous
s'exécutent depuis `intranet/infra/` sur le VPS.

## 0. Prérequis

- Un VPS Fedora (37+) avec un accès `root` ou `sudo`, IP publique fixe.
- Un nom de domaine dont vous contrôlez la zone DNS (ex. `wagadu-africa.org`).
- Ce dépôt accessible (public sur GitHub : `github.com/HULL-bit/wagadu-africa`).

## 1. Préparer le VPS (Fedora)

Connexion SSH puis, en root :

```bash
# Mise à jour système
dnf -y upgrade

# Pare-feu : Fedora utilise firewalld (pas ufw) — ouvrir HTTP/HTTPS.
# SSH est généralement déjà autorisé par défaut sur un VPS neuf ;
# vérifier avec `firewall-cmd --list-services` si le doute persiste.
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload

# Docker Engine — dépôt officiel (le "docker" des dépôts Fedora standards
# est moby-engine, pas l'édition officielle ; on utilise le dépôt Docker).
dnf -y install dnf-plugins-core
dnf config-manager addrepo --from-repofile=https://download.docker.com/linux/fedora/docker-ce.repo
dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

# Vérification
docker run --rm hello-world

# Swap (2 Go) — nécessaire sur un VPS à 2 Go de RAM : le build simultané de
# plusieurs images Docker (site, backend, frontend) peut dépasser la RAM
# disponible et provoquer un OOM-kill. Vultr ne configure pas de swap par
# défaut.
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h   # vérifier que le swap apparaît
```

### Note SELinux

Fedora a SELinux en mode `enforcing` par défaut. Les montages de fichiers
hôte en lecture seule (Caddyfile, scripts d'init Postgres) utilisent déjà le
suffixe `:ro,z` dans `docker-compose.yml` pour que Docker applique
automatiquement le bon label SELinux — rien à faire manuellement. Si vous
rencontrez malgré tout une erreur `Permission denied` sur un volume monté,
c'est le premier réflexe à vérifier (`ls -laZ` sur le fichier concerné).

## 2. Configurer les noms de domaine (DNS)

Trois domaines doivent pointer vers l'IP du VPS **avant** le premier
démarrage (Caddy a besoin de résoudre le domaine pour obtenir son certificat
Let's Encrypt — sans ça, il réessaiera en boucle sans jamais réussir) :

| Domaine | Sert à |
|---|---|
| `wagadu-africa.org` | Site public (Next.js) |
| `cms.wagadu-africa.org` | Directus (admin + API) |
| `intranet.wagadu-africa.org` | Hub (équipe interne) |

Chez votre registrar/DNS (OVH, Gandi, Cloudflare, etc.), créer des
enregistrements **A** (et **AAAA** si le VPS a une IPv6) :

```
Type  Nom                    Valeur
A     @ (ou wagadu-africa.org)   <IP_DU_VPS>
A     cms                    <IP_DU_VPS>
A     intranet               <IP_DU_VPS>
```

Si `www.wagadu-africa.org` doit aussi fonctionner, ajouter un CNAME vers
`wagadu-africa.org` (ou une 2ᵉ entrée A) et un domaine Caddy supplémentaire —
pas fait par défaut ici pour rester minimal.

Vérifier la propagation avant de continuer :

```bash
dig +short wagadu-africa.org
dig +short cms.wagadu-africa.org
dig +short intranet.wagadu-africa.org
# Les trois doivent renvoyer l'IP du VPS.
```

La propagation peut prendre de quelques minutes à quelques heures selon le
registrar.

## 3. Cloner le dépôt

```bash
mkdir -p /opt/wagadu && cd /opt/wagadu
git clone https://github.com/HULL-bit/wagadu-africa.git
cd wagadu-africa
```

`site/` (public) et `intranet/` (Hub) doivent rester côte à côte tels
quels — `intranet/infra/docker-compose.yml` référence `site/` par chemin
relatif (`../../site`) pour construire son image.

## 4. Configurer les secrets

```bash
cd intranet/infra
cp .env.example .env
nano .env   # ou vim
```

À renseigner obligatoirement dans `.env` :

- `SITE_DOMAIN`, `WEBSITE_DOMAIN`, `CMS_DOMAIN`, `ACME_EMAIL` — vos vrais domaines.
- `DJANGO_SECRET_KEY` — générer avec `openssl rand -hex 32`.
- `POSTGRES_PASSWORD`, `DIRECTUS_DB_PASSWORD` — mots de passe forts distincts.
- `DIRECTUS_KEY`, `DIRECTUS_SECRET` — deux `openssl rand -hex 32` distincts.
- `DIRECTUS_ADMIN_EMAIL`, `DIRECTUS_ADMIN_PASSWORD` — compte admin CMS.
- `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS` — vérifier qu'ils pointent vers `intranet.wagadu-africa.org`.
- Stockage R2 (section MINIO_*) pour les fichiers du Hub, ou laisser
  `MINIO_ACCESS_KEY` vide pour un stockage disque local (suffisant pour
  démarrer).

`DIRECTUS_CONTACT_FORM_TOKEN` / `DIRECTUS_NEWSLETTER_TOKEN` restent vides
pour l'instant — ils se génèrent à l'étape 6.

```bash
chmod 600 .env   # lisible uniquement par root
```

## 5. Démarrer la stack

Sur un VPS à 2 Go de RAM, construire les 3 images une par une plutôt qu'en
parallèle (`--build` tout seul lance les builds simultanément, ce qui peut
dépasser la RAM même avec le swap de l'étape 1) :

```bash
cd /opt/wagadu/wagadu-africa/intranet/infra
docker compose build site
docker compose build backend
docker compose build frontend
docker compose up -d
docker compose ps   # tout doit finir "healthy" ou "running"
```

Premier démarrage : build des images `site`/`backend`/`frontend` (~3-7 min au
total en séquentiel), puis Caddy demande les 3 certificats Let's Encrypt
(quelques secondes à quelques minutes si le DNS est bien propagé).

```bash
docker compose logs -f caddy   # surveiller l'obtention des certificats
```

## 6. Initialiser les données

```bash
# Hub : migrations Django + compte admin
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperadmin

# Site public : schéma Directus + contenu (idempotent)
cd /opt/wagadu/wagadu-africa
DIRECTUS_URL=https://cms.wagadu-africa.org \
DIRECTUS_ADMIN_EMAIL=<celui du .env> \
DIRECTUS_ADMIN_PASSWORD=<celui du .env> \
node cms/seed/schema-and-content.mjs
node cms/seed/02-valeurs-et-pages.mjs
node cms/seed/03-projets.mjs
node cms/seed/04-realisations-reelles.mjs
node cms/seed/05-contact-newsletter.mjs   # affiche 2 jetons à la fin
node cms/seed/06-actualites.mjs
```

Coller les deux jetons affichés par `05-contact-newsletter.mjs` dans
`intranet/infra/.env` (`DIRECTUS_CONTACT_FORM_TOKEN`,
`DIRECTUS_NEWSLETTER_TOKEN`), puis :

```bash
cd intranet/infra
docker compose restart site
```

## 7. Vérifier

```bash
curl -sI https://wagadu-africa.org | head -1
curl -sI https://cms.wagadu-africa.org/admin | head -1
curl -sI https://intranet.wagadu-africa.org | head -1
```

Les trois doivent répondre `200`/`30x` avec un certificat valide (pas
d'avertissement navigateur).

## Opérations courantes

```bash
# Logs
docker compose logs -f site
docker compose logs -f directus

# Mise à jour après un `git pull`
git pull
docker compose up -d --build

# Redémarrer un seul service
docker compose restart site
```

Le Hub (`backend`/`frontend`) est construit depuis des images GHCR par
défaut (`ghcr.io/hull-bit/wagadu-hub-*`) avec fallback sur un `build:` local
si l'image n'existe pas encore — voir `docker-compose.yml`. Le site public et
Directus se construisent/tirent de la même façon.

## ⚠️ Après CHAQUE reconstruction de `site` : revalider le contenu

`docker build` n'a pas accès réseau à Directus (conteneurs séparés, pas
encore démarrés pendant le build) — les pages du site se construisent donc
avec des données vides plutôt que de planter (comportement voulu, voir
`lib/directus.ts`). Résultat : juste après `docker compose build site` +
`up -d site`, les sections connectées à Directus (Nos valeurs, Nos piliers,
Réalisations, Actualités...) apparaissent vides jusqu'à la prochaine
revalidation — automatique au bout d'1h (`revalidate: 3600`), ou immédiate
avec :

```bash
SECRET=$(grep '^REVALIDATE_SECRET=' intranet/infra/.env | cut -d= -f2)
for tag in realisations piliers valeurs pages_statiques projets actualites parametres_site; do
  curl -s -X POST "https://${WEBSITE_DOMAIN:-wagadu-africa.org}/api/revalidate" \
    -H "x-revalidate-secret: $SECRET" -H "Content-Type: application/json" \
    -d "{\"tag\":\"$tag\"}"
done
```

À faire systématiquement après tout `docker compose build site` (ou
`up -d --build site`) en production.
