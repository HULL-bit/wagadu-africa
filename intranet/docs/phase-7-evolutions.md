# Phase 7 — Évolutions post-v1

Livrées par lots, une validation entre chaque. Ordre : A → B → C → E, puis D et F.

| Lot | Contenu | État |
|---|---|---|
| **A — Compléments RH** | Onboarding, offboarding, évaluations de performance | ✅ Livré |
| B — Suivi de projets terrain (Blue-Track) | Projets, jalons, indicateurs, avancement | ⏳ |
| C — Inventaire & matériel | Équipements, véhicules, affectations, maintenance | ⏳ |
| E — Internationalisation | Interface fr/en (next-intl), API `Accept-Language` | ⏳ |
| D — Espace formation & ressources | Guides / procédures / supports, suivi de consultation | ⏳ |
| F — Invités externes & API ouverte | Comptes expirants + OAuth2 (django-oauth-toolkit) | ⏳ |

---

## Lot A — Compléments RH

Extension de l'app `hr` (pas de nouvelle app).

### Onboarding / Offboarding

| Modèle | Rôle |
|---|---|
| `LifecycleTemplate` (+ `LifecycleTemplateItem`) | checklist réutilisable : `kind` (onboarding/offboarding), items (libellé, catégorie, `responsible_role` hr/manager/employee/it, `due_offset_days` = J±n) |
| `LifecycleProcess` (+ `LifecycleItem`) | instance par employé, responsable résolu, échéance calculée, `progress` (fait / total / %) |

- **Onboarding auto-généré** à la création d'un `Employee` (depuis le modèle par défaut).
- **Offboarding déclenché** quand `Employee.hr_status` passe à `left` (ou manuellement via `POST /hr/lifecycle-processes/start/`).
- Notification aux responsables ; le processus passe `completed` quand tous les items sont cochés.
- Chaque personne ne voit / coche que **ses** items ou ceux de ses subordonnés ; le RH voit tout.

### Évaluations de performance

| Modèle | Rôle |
|---|---|
| `EvaluationForm` (+ `EvaluationQuestion`) | formulaire configurable : sections, questions (`rating_1_5` / `text` / `yes_no`), pondération |
| `EvaluationCampaign` | période + formulaire + portée (tout / un département) ; `open` génère une `Evaluation` par employé (évaluateur = manager) |
| `Evaluation` (+ `EvaluationAnswer`) | circuit **auto-évaluation → évaluation du responsable → prise de connaissance → finalisée (RH)** ; scores pondérés calculés ; la finalisation crée un `CareerEvent` sur la fiche |

Notifications à chaque transition. Historique consultable sur la fiche employé.

### API (`/api/v1/`)
`hr/lifecycle-templates/` · `hr/lifecycle-processes/` (+ `/start/`) ·
`hr/lifecycle-items/{id}/toggle/` · `hr/evaluation-forms/` ·
`hr/evaluation-campaigns/` (+ `/open/` `/close/`) ·
`hr/evaluations/` (+ `/self-assess/` `/manager-assess/` `/acknowledge/` `/finalize/` `/mine/` `/to-evaluate/`)

### Semé par migration (`hr/0004`)
Checklist d'intégration standard (11 items), checklist de départ standard (9 items),
formulaire « Évaluation de performance annuelle » (10 questions).

### Écrans front
`/hr/lifecycle` (+ `[id]`) — RH : liste et démarrage ; tous : sa propre checklist.
`/hr/evaluations` (+ `[id]`) — campagnes (RH), mon évaluation, évaluations d'équipe
à compléter, formulaire de notation. Dashboard : « Mon intégration » (barre de
progression), « Évaluation à compléter ».

### Definition of Done — Lot A

| Critère | État |
|---|---|
| Modèles créés et migrés | ✅ 9 modèles + 2 migrations (`0003`, `0004` seed) |
| API testée (nominal + permissions) | ✅ +12 tests (171 au total) · +9 vérifications smoke (86) |
| Front connecté | ✅ 4 écrans + widgets dashboard, build OK |
| Notifications | ✅ responsables de checklist, transitions d'évaluation |
| Actions sensibles tracées | ✅ démarrage lifecycle, cochage d'item, cycle d'évaluation |
| Documentation `/docs` | ✅ ce document |
