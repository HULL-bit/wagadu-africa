# Backend — Wagadu Hub

API Django + Django REST Framework. Code sous `backend/`.

## Prérequis

- Python 3.12+ (développé et testé sur 3.12–3.14)
- PostgreSQL 16 (production) — SQLite utilisé automatiquement en dev/test

## Installation locale

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
python manage.py migrate                 # USE_SQLITE=1 par défaut en dev
python manage.py createsuperadmin        # crée le 1er Super Administrateur
python manage.py runserver
```

Variables d'environnement : voir `infra/.env.example`. En dev, `USE_SQLITE=1`
(défaut) évite d'exiger PostgreSQL ; passer `USE_SQLITE=0` pour viser Postgres.

## Settings

| Module | Usage |
|---|---|
| `wagadu.settings.base` | commun (apps, DRF, JWT, Celery, MinIO, réglages métier `WAGADU`) |
| `wagadu.settings.dev` | `DEBUG=True`, SQLite, Celery eager, throttling désactivé |
| `wagadu.settings.prod` | HSTS/SSL redirect, cookies sécurisés, exige `DJANGO_SECRET_KEY` |

Réglages métier (`settings.WAGADU`) : `SUPER_ADMIN_MAX=2`,
`AUDIT_RETENTION_DAYS=365`, `LOGIN_MAX_FAILED_ATTEMPTS=5`, `LOGIN_LOCKOUT_MINUTES=15`.

## Commandes utiles

```bash
python manage.py createsuperadmin --noinput --email a@b.c --password '...'   # CI
python manage.py makemigrations --check --dry-run    # vérifie que les migrations sont à jour
pytest --cov=apps                                    # tests + couverture
ruff check .                                         # lint
celery -A wagadu worker -l info
celery -A wagadu beat -l info
```

## Authentification (JWT)

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/v1/auth/login/` | POST | `{email, password, totp_code?}` → `{access, refresh, user}` ; gère verrouillage, LoginAttempt, audit |
| `/api/v1/auth/refresh/` | POST | `{refresh}` → `{access, refresh}` (rotation + blacklist) |
| `/api/v1/auth/logout/` | POST | `{refresh}` → 205 ; blacklist + audit |
| `/api/v1/auth/me/` | GET / PATCH | profil courant ; PATCH = libre-service (coordonnées, RIB, contact d'urgence, langue) |
| `/api/v1/auth/change-password/` | POST | applique la politique de mot de passe |
| `/api/v1/auth/2fa/{enable,verify,disable}/` | POST | activation TOTP (socle, non imposé) |

Access token : 15 min. Refresh : 7 jours, rotation + blacklist.

## Administration (permissions requises)

| Endpoint | Permission | Notes |
|---|---|---|
| `/api/v1/users/` | `accounts.view` (lecture) / `accounts.manage` (écriture) | création d'un **admin** → Super Admin requis ; `DELETE` = suspension (soft) |
| `/api/v1/users/{id}/effective-permissions/` | `accounts.view` | vue de synthèse rôle + exceptions |
| `/api/v1/users/{id}/reset-password/` | `accounts.manage` | |
| `/api/v1/users/{id}/unlock/` | Super Admin | |
| `/api/v1/roles/` | `accounts.view` / `accounts.manage_permissions` | rôles système non supprimables |
| `/api/v1/roles/{id}/permissions/` | `accounts.manage_permissions` | PUT `{permission_codes: [...]}` — redéfinit le socle |
| `/api/v1/permissions/` | `accounts.view` | catalogue |
| `/api/v1/permission-overrides/` | `accounts.manage_permissions` | POST crée ; `/revoke/` révoque ; toucher un admin → Super Admin requis |
| `/api/v1/departments/`, `/teams/`, `/team-memberships/` | `organization.view` / `organization.manage` | |
| `/api/v1/audit/` | `audit.view` | lecture seule ; sans `audit.view_admin_actions` les actions d'admins sont masquées |
| `/api/v1/audit/export/` | `audit.export` | CSV |
| `/api/v1/dashboard/` | authentifié | payload adapté au rôle |
| `/api/v1/notifications/` | authentifié | `/read/`, `/read-all/`, `/unread_count/` |

Doc interactive : `/api/v1/schema/swagger/`.

## Rôles système (matrice 4.2)

`employe`, `chef`, `rh`, `admin` — socles définis dans
`apps/permissions/constants.py` et semés par la migration `0002_seed_catalog`.
Le **Super Administrateur** est le drapeau `User.is_super_admin` (1 à 2 comptes),
il outrepasse toute permission.

## Journal d'audit

Toute action sensible passe par `apps.audit.services.record(...)`. Les modèles
`accounts.User`, `organization.Department/Team`, `permissions.Role/RolePermission/UserPermissionOverride`
sont journalisés automatiquement (signaux). Les actions touchant un compte
administrateur sont marquées `critical` et déclenchent une notification aux admins.

## Tests (Phase 1)

`pytest` — 55 tests : moteur de permissions, API permissions/rôles/overrides,
auth (verrouillage, politique, refresh/blacklist, 2FA), administration des comptes,
`createsuperadmin`, immuabilité + purge du journal d'audit, dashboard, organisation,
notifications.
