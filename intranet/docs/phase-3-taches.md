# Phase 3 — Tâches et suivi hebdomadaire

## Périmètre livré (app `tasks`)

### Modèles
- `Task` : titre, description, priorité, **statut kanban** (`todo`/`in_progress`/`in_review`/`done`),
  `due_at` (date + heure), `start_at`, `estimated_hours`, `parent` (sous-tâches),
  `assigned_department` / `assigned_team` (référence), `labels` (M2M), `closed_at`,
  champs de suivi des rappels.
- `TaskAssignment` : un par assigné, `progress_status` individuel
  (`todo`/`in_progress`/`submitted`/`validated`/`returned`), `declared_hours`
  (temps réel déclaré, comparé à `estimated_hours`).
- `TaskSubmission` (+ `TaskSubmissionAttachment`) : compte-rendu + fichiers,
  `status` (`submitted`/`validated`/`returned`), `review_comment`, `reviewed_by`.
- `TaskAttachment` : pièces jointes de référence (à la création).
- `ChecklistItem` : checklists internes ; `TaskComment` : fil de discussion.
- `TaskLabel` : étiquettes libres.
- `RecurringTaskTemplate` : hebdomadaire / mensuelle, `interval`, jour,
  `lead_time_days` (créer N jours avant l'échéance), assignés par défaut.

### Règles
- Assignation à une équipe / un département → **instantané** : un
  `TaskAssignment` par membre présent ; le chef ajuste ensuite la liste
  (`/tasks/{id}/assign/`). Pas d'ajout automatique des nouveaux arrivants.
- Soumission (employé) → `progress_status` `submitted`, `Task.status` → `in_review`.
- Décision (chef, `/decide/` `{user, decision, comment}`) : `validated` / `returned`
  (retour `in_progress`). **Clôture automatique** en `done` quand tous les
  assignés sont `validated` ; le chef peut aussi forcer le statut via `/status/`.
- `duplicate` : clonage rapide (checklist incluse).

### API (`/api/v1/`)
| Endpoint | Notes |
|---|---|
| `tasks/` CRUD | création = `tasks.assign` |
| `tasks/mine/?scope=week` | « Mes tâches » / « cette semaine » |
| `tasks/board/` | colonnes kanban |
| `tasks/performance/` | taux à temps / en retard, par collaborateur (`tasks.assign`/`oversee`) |
| `tasks/{id}/assign/`, `/status/`, `/progress/`, `/submit/`, `/decide/`, `/duplicate/` | |
| `task-comments/`, `task-checklist-items/`, `task-labels/`, `task-attachments/`, `task-submission-attachments/` | |
| `recurring-tasks/` (+ `/generate_now/`) | `tasks.assign` |

Visibilité : un employé voit les tâches qui lui sont assignées, qu'il a créées,
ou assignées à ses subordonnés directs. `tasks.oversee` (chef/admin) → tout.

### Permission ajoutée
`tasks.oversee` (tableau de bord de performance transverse) — migration
`permissions/0004_phase3_catalog`, ajoutée aux socles `chef` et `admin`.

### Celery beat
- `generate_recurring_tasks` (06:00) : instancie les tâches dont l'échéance
  moins le délai d'anticipation est atteinte, puis avance le modèle.
- `send_task_deadline_reminders` (06:30) : **J-1, jour J, puis relance
  quotidienne** tant qu'en retard et non soumise (notification + e-mail).

### Notifications
Assignation, nouveau commentaire, soumission (→ chef), validation / renvoi
(→ employé), rappels d'échéance.

### Audit
`tasks.Task` et `tasks.RecurringTaskTemplate` en auto-tracking + `record()`
explicite sur création, (dé)assignation, soumission, décision, changement de
statut, génération récurrente, commentaire, suppression.

## Écrans front
`/tasks` (Mes tâches + « cette semaine ») · `/tasks/new` · `/tasks/[id]`
(checklist, sous-tâches, commentaires, panneau de soumission, validation par
assigné pour le chef, statut kanban) · `/tasks/board` (kanban) ·
`/tasks/calendar` (vue mois des échéances) · `/tasks/performance` ·
`/tasks/recurring`. Dashboard : mes tâches en cours / en retard, tâches à valider.

## Definition of Done — Phase 3

| Critère | État |
|---|---|
| Modèles créés et migrés | ✅ app `tasks` |
| API testée (nominal + permissions) | ✅ +13 tests (96 au total) |
| Front connecté | ✅ 7 écrans, build OK |
| Notifications | ✅ assignation, commentaire, soumission, décision, rappels |
| Actions sensibles tracées | ✅ voir « Audit » |
| Documentation `/docs` | ✅ ce document + schéma BDD |

## Reporté
Vue calendrier partagée d'équipe et synchronisation agenda → Phase 5 (module Agenda).
