# Architecture — Wagadu Hub

## Vue d'ensemble

```
                      ┌─────────────┐
   Navigateur / PWA   │  Cloudflare │  CDN, cache, protection
   (poste ou mobile)  └──────┬──────┘
                             │ HTTPS
                      ┌──────▼──────┐
                      │    Nginx    │  reverse proxy, TLS, en-têtes sécurité, rate-limit
                      └──┬───────┬──┘
             /  , /_next │       │ /api/ , /django-admin/
                  ┌──────▼──┐ ┌──▼───────────┐
                  │ Next.js │ │  Django + DRF │  logique métier, auth, permissions, workflows
                  │  (PWA)  │ └──┬────────┬───┘
                  └─────────┘    │        │
                        ┌────────▼──┐  ┌──▼──────┐
                        │ PostgreSQL│  │  Redis  │──► Celery worker + beat
                        └───────────┘  └─────────┘     (notifications, rappels, e-mails,
                        ┌───────────┐                    PDF, purge du journal d'audit)
                        │   MinIO   │  fichiers (documents, pièces jointes, livrables, archives d'audit)
                        └───────────┘
   Phase 5 : Rocket.Chat (messagerie, SSO) et Jitsi (visio) — services additionnels derrière Nginx
```

## Composants

| Composant | Rôle | Détail |
|---|---|---|
| **Next.js / React** | Interface unique web + mobile, installable (PWA) | App Router, service worker pour l'app shell hors-ligne, design tokens Wagadu |
| **Django + DRF** | API REST, logique métier, permissions, audit | `wagadu.settings.{base,dev,prod}`, apps sous `backend/apps/` |
| **PostgreSQL** | Données structurées | version 16 |
| **Redis + Celery** | Traitements asynchrones et planifiés | file d'attente + `celery-beat` (purge d'audit quotidienne, rappels) |
| **MinIO** | Stockage objet S3-compatible | documents, pièces jointes, archives du journal d'audit |
| **Nginx** | Point d'entrée unique | TLS, HSTS/CSP/X-Frame-Options, `limit_req` sur `/api/v1/auth/` |
| **Cloudflare** | CDN, cache, sécurité périmétrique | certificat Origin ou Let's Encrypt |

## Découpage backend (apps Django)

| App | Responsabilité |
|---|---|
| `accounts` | Modèle `User` (UUID, login e-mail), authentification JWT, verrouillage, politique de mot de passe, 2FA (socle), libre-service, administration des comptes, commande `createsuperadmin` |
| `organization` | `Department`, `Team`, `TeamMembership`, rattachements hiérarchiques (organigramme) |
| `permissions` | `Permission` (catalogue), `Role` + `RolePermission` (socle), `UserPermissionOverride` (exceptions), **moteur de permission effective** + classe DRF `HasPermission` |
| `audit` | `AuditLogEntry` append-only, middleware de contexte de requête, couche d'écriture `record()`, signaux génériques, purge planifiée, API lecture seule + export |
| `notifications` | `Notification`, `NotificationPreference`, service `notify()` / `notify_admins()`, résumés e-mail (digests) |
| `dashboard` | Agrégation de la vue d'accueil selon le rôle |
| `validation` | Circuits de validation configurables réutilisables (`ValidationFlow`/`Step`, `ApprovalProcess` via GFK, moteur `engine.py`) — congés + demandes |
| `hr` | Fiches employés, contrats, carrière, suivi médical/habilitations, congés (solde, décompte jours ouvrés), tableau de bord RH |
| `correspondence` | Courrier entrant/sortant : numérotation auto, affectation, traçabilité, accusé de réception, modèles, export |
| `tasks` | Tâches (kanban, sous-tâches, checklists, étiquettes), assignation, soumission + validation par assigné, récurrence, rappels, performance |
| `documents` | Bibliothèque + diffusion ciblée avec suivi de lecture, versions, visibilité, liens de partage externes, corbeille, signature simple, extraction PDF |
| `agenda` | `CalendarEvent` + feed unifié (tâches / réunions / congés virtuels), invitations, rappels, vue d'équipe, iCal |
| `meetings` | Réunions Jitsi : lien + JWT, participants, ordre du jour, compte-rendu, sondages |
| `integrations` | Client Rocket.Chat, `ChatAccount`/`ChatChannel`, SSO par jeton personnel, provisionnement — config-gated |
| `demands` | Demandes transverses (`RequestType` à formulaire configurable, `Request`), s'appuie sur `validation` |
| `engagement` | Fil d'annonces internes, sondages / votes org-wide |
| `search` | Recherche globale transverse (aucun modèle propre) |
| `reports` | Exports XLSX (openpyxl) et PDF (reportlab) par module |

## Sécurité (rappel)

- HTTPS partout ; HSTS, CSP, `X-Frame-Options`, `X-Content-Type-Options` (Nginx + Django).
- Permissions vérifiées **côté serveur** via `HasPermission` / `has_permission()` ; le front n'affiche/masque que par confort.
- Mots de passe hashés (PBKDF2 Django) ; politique configurable ; verrouillage temporaire après N échecs.
- Journal d'audit non modifiable (aucune route `UPDATE`/`DELETE`, `save()` refuse la modification).
- Secrets hors dépôt (`.env` non versionné, secrets GitHub Actions).
