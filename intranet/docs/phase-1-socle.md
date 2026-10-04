# Phase 1 — Socle technique

## Périmètre livré

- **Authentification** JWT (access 15 min + refresh 7 j avec rotation/blacklist),
  login e-mail + mot de passe, verrouillage temporaire après 5 échecs,
  politique de mot de passe configurable, 2FA TOTP (socle activable, non imposé).
- **Utilisateurs / rôles / permissions**
  - `User` (UUID, e-mail, rôle, département, manager, statut, langue, fuseau).
  - 4 rôles système (`employe`, `chef`, `rh`, `admin`) avec socle par défaut (matrice 4.2).
  - **Super Administrateur** (`is_super_admin`, 1–2 comptes) — outrepasse tout.
  - **Exceptions individuelles** (`UserPermissionOverride`) : accorder/retirer une
    permission à un membre, avec périmètre (global / module / département / projet),
    motif, auteur, horodatage, révocation immédiate.
  - Moteur de **permission effective** (deny > grant > socle du rôle) + classe DRF
    `HasPermission` utilisée sur toutes les vues.
  - Vue de synthèse « permissions effectives » par utilisateur.
- **Organisation** : départements (hiérarchie), équipes, appartenances.
- **Journal d'audit** : `AuditLogEntry` append-only, couche d'écriture centralisée,
  signaux automatiques sur les modèles sensibles, actions critiques → alerte admins,
  API lecture seule filtrable, export CSV, purge planifiée (12 mois glissants).
- **Notifications** : modèle + service + centre de notifications (in-app, e-mail).
- **Tableau de bord** de base adapté au rôle.
- **Amorçage** : commande `manage.py createsuperadmin` (refuse un 2ᵉ Super Admin).
- **Infra** : Docker Compose (8 services), Nginx (TLS, en-têtes sécurité, rate-limit),
  Dockerfiles backend/frontend, script de sauvegarde.
- **CI/CD** : GitHub Actions (lint + tests + build images ; déploiement SSH).
- **Frontend** : PWA Next.js — connexion, tableau de bord, mon compte (libre-service
  + mot de passe + 2FA), administration (comptes, rôles/permissions, exceptions,
  journal d'audit), notifications.

## Definition of Done — Phase 1

| Critère | État |
|---|---|
| Modèles créés et migrés | ✅ `accounts`, `organization`, `permissions`, `audit`, `notifications` |
| API testée (nominal + permissions) | ✅ 55 tests `pytest` |
| Front fonctionnel connecté à l'API | ✅ 10 écrans, build OK |
| Notifications en place | ✅ modèle + service + alertes d'audit |
| Actions sensibles tracées | ✅ signaux + `record()` (connexion, création/modif/suppression compte, changement de permission, export) |
| Documentation ajoutée à `/docs` | ✅ architecture, schéma BDD, backend, frontend, déploiement, roadmap |

## Règles métier tranchées (voir aussi `roadmap.md`)

| Question | Réponse retenue |
|---|---|
| Rétention du journal d'audit | 12 mois glissants (`AUDIT_RETENTION_DAYS=365`), archive CSV → MinIO puis purge |
| Circuits de validation | Modélisation multi-niveaux configurable dès le départ (mise en œuvre phases 2/6) |
| 2FA | Socle prêt, non imposé ; enforcement par rôle en phase 6 |
| Auth | JWT SimpleJWT access + refresh (blacklist) |
| Nombre de Super Admins | 2 maximum (`SUPER_ADMIN_MAX`) |
| Seuil de verrouillage | 5 échecs → 15 min |

## Démo rapide

```bash
# Backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py createsuperadmin --noinput --email admin@wagadu.africa --password 'Wagadu2026!Hub'
python manage.py runserver
pytest

# Frontend (autre terminal)
cd frontend && npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1 npm run dev
```

Se connecter sur http://localhost:3000 avec le compte Super Admin, puis créer
départements, rôles et comptes.

## Reste à faire / limites connues

- 2FA : pas de codes de récupération ni d'enforcement (prévu phase 6).
- Notifications e-mail : `fail_silently`, pas encore de digest quotidien/hebdo.
- Recherche globale, i18n complète de l'interface (labels FR en dur pour l'instant),
  organigramme visuel : phases ultérieures.
- Rocket.Chat / Jitsi / Agenda : phase 5.
