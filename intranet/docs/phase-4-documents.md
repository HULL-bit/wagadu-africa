# Phase 4 — Documents

## Périmètre livré (app `documents`)

### Modèles
- `Folder` — dossiers / catégories thématiques (arborescence).
- `Document` — conteneur : `title`, `description`, `keywords`, `folder`, `owner`,
  `is_in_library`, `visibility` (`public`/`restricted`), `current_version`,
  `deleted_at`/`deleted_by` (corbeille).
- `DocumentVersion` — `version_number` (auto), `file` (MinIO), `size`,
  `content_type`, `note` (changelog), `text_content` (indexation). **Historique
  conservé** ; `current_version` pointe la dernière.
- `DocumentVisibilityRule` — restrictions par `role` / `department` / `project`.
- `DocumentDistribution` + `DocumentRecipient` — un envoi + **une ligne de suivi
  de lecture par destinataire** (`is_read`, `read_at`, `reminded_at`).
- `ShareLink` — lien externe : `token`, `version`, `expires_at`, `password_hash`,
  `max_downloads`, `download_count`, `is_revoked`.

### Règles
- **Diffusion ciblée** (`POST /documents/{id}/distribute/` `{mode, user_ids?, message}`) :
  `user` / `selection` / `broadcast`. Broadcast = **snapshot des employés actifs**
  → suivi individuel + relance ciblée (`/document-distributions/{id}/remind/`).
- **Suivi de lecture** : marqué lu à l'ouverture (`preview`/`download`) ou via
  `POST /documents/{id}/mark-read/`.
- **Versions** : `POST /documents/{id}/versions/` ; l'historique reste consultable.
- **Bibliothèque** : `public` visible de tous ; `restricted` filtré par les
  règles de visibilité (rôle / département).
- **Aperçu navigateur** : `GET /documents/{id}/preview/` (Content-Disposition inline).
- **Liens de partage externes** : endpoints publics **sans authentification**
  `GET/POST /api/v1/public/share/{token}/` (mot de passe, expiration, quota de
  téléchargements), débit limité (scope `auth`).
- **Corbeille** : `DELETE` = suppression douce ; `POST /documents/{id}/restore/` ;
  purge Celery après **30 jours** (`WAGADU["DOC_TRASH_RETENTION_DAYS"]`).

### Recherche « full-text »
`search_documents()` : Postgres `SearchVector` (config française, titre pondéré A,
description/mots-clés B, texte extrait + dossier C) en production ; repli
`icontains` en dev/test SQLite. Extraction de texte immédiate pour `txt/md/csv/json` ;
**PDF et bureautique différés** (Phase 6, `pypdf`).

### Stockage
`STORAGES["default"]` bascule sur `storages.backends.s3.S3Storage` (MinIO) dès que
`MINIO_ACCESS_KEY` est défini ; `FileSystemStorage` en local.

### Permission ajoutée
`documents.share_external` (migration `permissions/0005_phase4_catalog`) — ajoutée
aux socles `chef`, `rh`, `admin`.

### Celery beat
`purge_trashed_documents` (03:30).

### Audit + notifications
Auto-track `documents.Document` / `DocumentVisibilityRule`. `record()` sur import,
nouvelle version, diffusion (broadcast = `warning`), relance, création de lien
externe, **téléchargement externe** (acteur `système`), suppression / restauration,
changement de visibilité, téléchargement authentifié. Notification à la réception
d'un document et à la relance.

## API `/api/v1/`
`documents/folders/` · `documents/` (CRUD multipart, filtres `folder`/`library`/`mine`/`trashed`/`search`) ·
`documents/{id}/` `versions` · `download` · `preview` · `mark-read` · `visibility` (PUT) ·
`distribute` · `restore` · `share-links` (GET/POST) · `share-links/{id}/revoke` ·
`documents/received/` · `document-distributions/` (`/remind/`) ·
**public** `public/share/{token}/`.

## Écrans front
`/documents` (bibliothèque : recherche, dossiers, import) · `/documents/[id]`
(versions, aperçu, diffusion, visibilité, liens externes) · `/documents/received`
(lu / non lu) · `/documents/sent` (suivi de lecture + relance) · `/documents/trash` ·
**`/share/[token]`** (page publique hors espace connecté). Dashboard : documents non lus.

## Definition of Done — Phase 4

| Critère | État |
|---|---|
| Modèles créés et migrés | ✅ app `documents` |
| API testée (nominal + permissions) | ✅ +13 tests (109 au total) |
| Front connecté | ✅ 6 écrans (dont page publique), build OK |
| Notifications | ✅ réception, relance |
| Actions sensibles tracées | ✅ voir « Audit » |
| Documentation `/docs` | ✅ ce document + schéma BDD |

## Reporté
Extraction de texte PDF / bureautique pour la recherche → Phase 6.
Aperçu bureautique riche (visionneuse) → selon besoins, Phase 6.
