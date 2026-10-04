# Wagadu Hub (W-HUB)

Plateforme interne de gestion de **Wagadu Africa** (ONG) — projet Blue-Track.

Portail unique, sécurisé, mobile-first (PWA), pour centraliser RH, courrier, tâches,
documents, messagerie, visioconférence et agenda.

## Stack

| Composant | Techno |
|---|---|
| API / logique métier | Django 5 + Django REST Framework |
| Front web + mobile | Next.js / React (PWA) |
| Base de données | PostgreSQL 16 |
| Tâches asynchrones | Celery + Redis |
| Stockage fichiers | MinIO (compatible S3) |
| CDN / sécurité | Cloudflare |
| Messagerie | Rocket.Chat (SSO) — Phase 5 |
| Visioconférence | Jitsi Meet — Phase 5 |
| Reverse proxy | Nginx |

## Structure du dépôt

```
/backend            API Django (DRF)
/frontend           Application Next.js / React (PWA)
/infra              Docker Compose, Nginx, scripts de déploiement
/.github/workflows  Pipelines CI/CD
/docs               Documentation technique et fonctionnelle
```

## Démarrage rapide (développement)

```bash
cp infra/.env.example infra/.env
docker compose -f infra/docker-compose.yml up -d --build
docker compose -f infra/docker-compose.yml exec backend python manage.py migrate
docker compose -f infra/docker-compose.yml exec backend python manage.py loaddata initial_permissions initial_roles
docker compose -f infra/docker-compose.yml exec backend python manage.py createsuperadmin
```

- Front : http://localhost/
- API : http://localhost/api/v1/
- Doc API (Swagger) : http://localhost/api/v1/schema/swagger/

## Plan de livraison

Voir [docs/roadmap.md](docs/roadmap.md). **Les 6 phases sont livrées** (RH, courrier,
tâches, documents, communication temps réel, demandes transverses & finalisation) —
159 tests `pytest` + 77 vérifications de bout en bout, CI verte.

## Documentation

- [Architecture](docs/architecture.md)
- [Schéma de base de données](docs/database-schema.md)
- [Backend](docs/backend.md)
- [Frontend](docs/frontend.md)
- [Déploiement](docs/deployment.md)
