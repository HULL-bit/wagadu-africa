# Wagadu Africa — Site public (refonte)

Refonte du site public `wagadu-africa.org` (WordPress/Elementor → Next.js +
Directus), en remplacement complet du site actuel. Ce dépôt regroupe
désormais aussi **Wagadu Hub** (`intranet/`), l'intranet interne de
l'organisation, pour un développement local unifié.

**Plan complet** (contexte, décisions d'infra, modèle Directus, phases) :
`/home/hull-bit/.claude/plans/robust-forging-zephyr.md`.

## Structure du dépôt

```
/site      Site public — Next.js (App Router, [locale] FR/EN, next-intl)
/intranet  Wagadu Hub — backend Django + frontend Next.js
/cms       Schéma Directus versionné (cms/schema/snapshot.yaml) + scripts de seed
/infra     docker-compose.dev.yml (dev local, tout-en-un), nginx/, render.yaml (prod)
/media     Fichiers hérités du WordPress (source du seed médias)
```

## Démarrage rapide (développement)

Un seul `docker compose` fait tourner **tout** : le site public, Directus, le
Hub (Django + Next.js + Postgres + Redis + Celery) et Nginx en frontal, avec
un sous-domaine par service. Le site tourne en mode dev dans son conteneur
(code monté en volume, hot-reload) — rien à lancer en dehors de Docker.

```bash
# 1. Résolution locale des sous-domaines (une seule fois)
echo "127.0.0.1  wagadu.local cms.wagadu.local intranet.wagadu.local" | sudo tee -a /etc/hosts

# 2. Tout démarrer (premier lancement : ~1 min, le temps du `npm install`
#    dans le conteneur `site` et du build des images Hub)
docker compose -f infra/docker-compose.dev.yml up -d

# 3. Schéma + contenu Directus (idempotent, à rejouer si le volume est recréé)
node cms/seed/schema-and-content.mjs      # languages, piliers, realisations
node cms/seed/02-valeurs-et-pages.mjs     # valeurs, pages_statiques
node cms/seed/03-projets.mjs              # collection projets
node cms/seed/04-realisations-reelles.mjs # Blue-Track+Kayar fusionnés, O'Crystal, FISH4ACP
node cms/seed/05-contact-newsletter.mjs   # messages_contact, newsletter_abonnes + jetons
```

Le seed Directus se fait depuis l'hôte (Node local, pas de conteneur dédié) —
c'est un script ponctuel, pas un service qui tourne en continu.

- Site public : http://wagadu.local (ou http://localhost:3000)
- Directus : http://cms.wagadu.local/admin (ou http://localhost:8055/admin)
- Hub / intranet : http://intranet.wagadu.local (ou http://localhost:3300 pour le frontend seul, :8000 pour l'API Django)

`cms/seed/05-contact-newsletter.mjs` affiche à la fin deux jetons statiques
à coller dans `site/.env.local` (`DIRECTUS_CONTACT_FORM_TOKEN`,
`DIRECTUS_NEWSLETTER_TOKEN`) — ils changent à chaque reconstruction du volume
Postgres de Directus.

### Pourquoi pas Kubernetes ?

Un essai local avec `kind` (Kubernetes-in-Docker) a existé un temps
(dossier `k8s/`, supprimé) pour reproduire la même topologie par
sous-domaine. Retiré au profit d'un unique `docker-compose.dev.yml` :
plus simple à lancer, pas de cluster à gérer, même résultat en dev.

## État d'avancement (voir le plan, section D, pour le détail des phases)

**Fait :**
- Schéma Directus complet : `languages`, `piliers`, `realisations` (Blue-Track
  fusionné avec le récit Kayar, O'Crystal, FISH4ACP), `valeurs`,
  `pages_statiques`, `projets`, `messages_contact`, `newsletter_abonnes` —
  pattern Translations natif, permissions du rôle Public filtrées
  `status=published`, revalidation à la demande (`/api/revalidate`).
- Pages connectées à Directus et rendues en SSG : Accueil, Qui sommes-nous,
  Nos réalisations (liste + détail), Nos Projets, Nos Thématiques, Contact
  (formulaire fonctionnel → `messages_contact`), newsletter (pied de page →
  `newsletter_abonnes`).
- Développement local unifié : site + Directus + Hub (Django/Next.js/Postgres/
  Redis/Celery) + Nginx via un seul `docker-compose.dev.yml`, tout
  conteneurisé, sous-domaines `wagadu.local` / `cms.wagadu.local` /
  `intranet.wagadu.local`.

Pages encore en **stub** (structure + i18n, pas de contenu réel) : `/outils`,
`/actualites`, pages légales, etc. — Phase 4 du plan.

**Pas fait / décisions ouvertes** (voir plan section F) :
- Déploiement réel sur Render + exposition sécurisée du Postgres du Hub.
- Paiement en ligne pour `/don` (quel prestataire — voir discussion en cours),
  comptes réseaux sociaux réels, contenu réel de la plateforme Blue-Track
  (capture d'écran haute résolution).
- Mot du fondateur sur l'accueil : structure prête (`pages_statiques` slug
  `mot-fondateur`), en attente du nom/titre/texte réels à seeder.
