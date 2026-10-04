# Phase 6 — Finalisation

Demandes transverses (§2.10), exports (§2.11), compléments prioritaires (§2.11),
lecteur de documents intégré.

## App `demands` — Demandes transverses (§2.10)

Réutilise l'app `validation` (moteur de circuit, déjà en place pour les congés).

| Modèle | Champs |
|---|---|
| `RequestType` | `code`, `label`, `icon`, `form_schema` (JSON — champs configurables : `text`/`number`/`date`/`textarea`/`select`), `flow` (FK `ValidationFlow`), `is_active` |
| `Request` | `type`, `reference` auto `DEM-AAAA-NNNN`, `requester`, `title`, `data` (JSON du formulaire), `status` (`draft`/`submitted`/`in_review`/`approved`/`rejected`/`cancelled`), lien `ApprovalProcess` |
| `RequestAttachment` / `RequestComment` | pièces jointes MinIO + fil de discussion |

- **3 types semés** : demande d'achat / matériel, demande de mission / déplacement,
  demande de remboursement de frais.
- **Circuit par défaut** (`demande-standard`) : responsable hiérarchique →
  administrateur. Reconfigurable par type.
- Validation du `form_schema` à la soumission (champs obligatoires, types).
- Hooks `on_approval_*` → mise à jour du statut + notification à chaque étape.
- API : `request-types/` (config = `requests.manage_types`) · `requests/` CRUD +
  `/submit/` `/cancel/` `/decide/` `/mine/` `/to-validate/` ·
  `request-attachments/` · `request-comments/`.

## App `reports` — Exports

- `openpyxl` (XLSX) + `reportlab` (PDF). `GET /api/v1/reports/` liste les jeux de
  données accessibles ; `GET /api/v1/reports/{dataset}.{xlsx|pdf}` télécharge.
- Jeux de données : `mail`, `requests`, `leave`, `tasks`, `hr-headcount`,
  `documents`, `audit` — chacun avec sa permission et ses filtres (query params).
- **PDF réservé aux registres officiels** : `mail`, `requests`, `audit`. Les
  autres sont en XLSX uniquement.
- Chaque export est tracé dans le journal d'audit.

## App `search` — Recherche globale transverse (§2.11)

`GET /api/v1/search/?q=` → résultats typés (`person`, `task`, `mail`, `document`,
`meeting`, `request`), **chaque source filtrée selon les règles de visibilité de
son module**. Barre de recherche intégrée dans l'en-tête de l'application.

## App `engagement` — Annonces & sondages internes (§2.11)

| Modèle | Rôle |
|---|---|
| `Announcement` | fil d'actualités : `pinned`, `audience` (tous / département), `publish_at`, `expires_at` — mur sur le dashboard. Publication = permission `engagement.announce` |
| `Poll` + `PollOption` + `PollVote` | sondage / vote interne org-wide, choix unique ou multiple, ouverture / clôture |

## Compléments dans les apps existantes

| Fonction | Emplacement |
|---|---|
| **Résumés e-mail** des notifications | `apps/notifications/tasks.send_notification_digests` (Celery beat : quotidien 18:00, hebdo vendredi 17:00) selon `NotificationPreference.digest_frequency` |
| **Extraction de texte PDF** | `apps/documents/tasks.extract_pdf_text` (`pypdf`), déclenchée à l'upload d'une version PDF → alimente `DocumentVersion.text_content` (recherche full-text Phase 4) |
| **Export des données personnelles** (RGPD) | `GET /api/v1/auth/me/export/` → archive JSON (compte, fiche RH, congés, tâches, réunions, agenda, documents reçus, demandes, notifications, entrées d'audit) |
| **Signature simple de document** | `DocumentSignature` + `POST /api/v1/documents/{id}/sign/` (mention « lu et approuvé », horodatage, IP) — trace interne, pas de valeur légale (§1.5) |
| **Lecteur de documents intégré** | frontend `components/DocumentViewer` : affiche PDF et images **dans la plateforme** (blob de `/preview/`), téléchargement pour les autres formats |

## Permissions ajoutées
`requests.manage_types`, `engagement.announce`, `reports.export`
(migration `permissions/0007_phase6_catalog`). Socles : `chef` et `admin`
reçoivent `engagement.announce` + `reports.export` ; `admin` reçoit aussi
`requests.manage_types`.

## Écrans front
`/requests` · `/requests/new` (formulaire dynamique selon le type) ·
`/requests/[id]` · `/requests/validate` · `/polls` · `/reports` ·
`/admin/announcements`. En-tête : recherche globale. Dashboard : mur d'annonces,
demandes en cours. `/documents/[id]` : lecteur intégré + signature. `/account` :
bouton « Exporter mes données ».

## Definition of Done — Phase 6

| Critère | État |
|---|---|
| Modèles créés et migrés | ✅ `demands`, `engagement`, `reports`, `search` + `documents.DocumentSignature` |
| API testée (nominal + permissions) | ✅ +26 tests (159 au total) |
| Front connecté | ✅ 7 écrans + recherche globale + lecteur de documents, build OK |
| Notifications | ✅ étapes de validation des demandes, commentaires, résumés e-mail |
| Actions sensibles tracées | ✅ demandes, décisions, annonces, sondages, exports, signatures, export RGPD |
| Documentation `/docs` | ✅ ce document + schéma BDD |

## Reporté en évolutions post-v1
Gestion d'inventaire & matériel · suivi de projets terrain Blue-Track · espace
formation & ressources · internationalisation complète de l'interface (fr/en/…) ·
espace invités externes à accès temporaire · API ouverte OAuth pour intégrations
tierces. *(Le cahier des charges les qualifie d'« intégration future possible ».)*
