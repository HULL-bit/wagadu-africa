# Phase 2 — RH & Courrier

## Périmètre livré

### App `validation` — circuits de validation réutilisables
- `ValidationFlow` / `ValidationStep` : circuit configurable à étapes ordonnées.
  Type d'approbateur : `manager` (responsable du demandeur), `role`, `user`.
- `ApprovalProcess` (GenericForeignKey vers l'objet métier) + `ApprovalDecision`.
- Moteur `engine.py` : `start_approval`, `submit_decision` (approuvé / rejeté /
  renvoyé), `cancel_process`. Notification à chaque changement d'étape. Étape
  sans approbateur résolvable → ignorée si `skip_if_unresolved`.
- Réutilisé en Phase 6 pour le module Demandes transverses (§2.10).
- Circuit `conges` semé : **étape 1 responsable hiérarchique → étape 2 RH**
  (si pas de manager, l'étape RH s'applique seule).

### App `hr`
- `Employee` (fiche liée au compte), `Contract` (alerte avant expiration),
  `EmployeeDocument` (pièces justificatives, MinIO), `CareerEvent` (historique
  promotion / formation / avertissement / changement de poste),
  `HealthRecord` (visites médicales & habilitations, alerte de renouvellement).
- Congés : `LeaveType`, `LeaveBalance` (solde temps réel), `LeaveRequest`,
  `PublicHoliday`. Décompte en **jours ouvrés hors fériés**, demi-journées.
- Types de congés + fériés fixes du Sénégal semés par migration (le RH complète
  les dates mobiles).
- Solde vérifié à la soumission ; à l'approbation finale, décompte automatique.
- `HrDashboardView` : effectifs, répartition par département, congés en cours,
  contrats et suivis médicaux à échéance.
- Cloisonnement : un employé voit sa fiche ; un responsable, celle de ses
  subordonnés directs (lecture) ; `hr.view` / `hr.manage` pour le RH.

### App `correspondence` (Courrier)
- `Mail` : numérotation automatique `AAAA-ARR-NNNN` / `AAAA-DEP-NNNN`
  (`NumberingScheme`, compteur annuel, déclinable par département),
  statuts `reçu → affecté → en traitement → traité → archivé`.
- `MailAttachment`, `MailEvent` (traçabilité complète : enregistrement,
  consultation, affectation, transfert, changement de statut, accusé,
  commentaire), `MailAcknowledgement` (accusé horodaté), `MailTemplate`,
  `MailCategory` (classement automatique par mots-clés à l'enregistrement).
- Affectation / transfert à une personne ou un département, avec notification.
- Rappel automatique du courrier en retard (Celery).
- Export CSV du registre.

### Tâches Celery beat ajoutées
`check_contract_expirations`, `check_health_record_renewals` (07:00 / 07:15),
`remind_untreated_mail` (08:00).

### Permissions ajoutées au catalogue
`hr.export`, `mail.process`, `mail.export`, `mail.template.manage`.
Socles rôles rafraîchis (migration `permissions/0003_phase2_catalog`).

## API (préfixe `/api/v1/`)

| Endpoint | Notes |
|---|---|
| `hr/employees/`, `hr/employees/me/`, `hr/employees/{id}/` | RH : liste ; employé/manager : lecture ciblée |
| `hr/contracts/`, `hr/employee-documents/`, `hr/career-events/`, `hr/health-records/` | filtrables par `employee` |
| `hr/leave-types/`, `hr/leave-balances/`, `hr/public-holidays/` | |
| `hr/leave-requests/` (+ `/submit/`, `/cancel/`, `/decide/`, `/to-validate/`) | circuit de validation |
| `hr/dashboard/` | `hr.view` |
| `mail/` (CRUD, filtres, `/export/`) | `retrieve` journalise une consultation |
| `mail/{id}/assign/`, `/transfer/`, `/status/`, `/acknowledge/` | |
| `mail/categories/`, `mail/templates/`, `mail/attachments/` | |
| `validation/flows/`, `validation/steps/`, `validation/processes/` | config = `platform.manage_validation_flows` |

## Écrans front

`/leave` (soldes + demande + historique) · `/leave/validate` (à valider) ·
`/mail` (registre + filtres + export) · `/mail/new` · `/mail/[id]` (affectation,
accusé, traçabilité) · `/hr` (tableau de bord) · `/hr/employees` +
`/hr/employees/[id]` (contrats / carrière / médical) ·
`/admin/validation-flows` (édition des circuits).

## Definition of Done — Phase 2

| Critère | État |
|---|---|
| Modèles créés et migrés | ✅ `validation`, `hr`, `correspondence` |
| API testée (nominal + permissions) | ✅ +24 tests (79 au total) |
| Front connecté | ✅ 9 nouveaux écrans, build OK |
| Notifications | ✅ étapes de validation, affectation courrier, alertes contrat/médical/courrier en retard |
| Actions sensibles tracées | ✅ création employé/contrat, soumission & décisions de congé, enregistrement & affectation courrier, exports |
| Documentation `/docs` | ✅ ce document + mises à jour schéma & backend |

## Reste à faire / reporté

- Onboarding / offboarding et évaluations de performance → **Phase 6**.
- Génération de documents RH en PDF (attestations, certificats) → Phase 6.
- Registre du courrier en PDF (CSV livré) ; aperçu des pièces jointes dans le
  navigateur → Phase 4 (module Documents).
- Synchronisation des congés validés avec l'agenda → Phase 5.
