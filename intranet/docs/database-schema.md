# Schéma de la base de données

État après la **Phase 6** — schéma complet de la version 1.

## Diagramme (Phase 6 — Demandes, annonces, sondages)

```mermaid
erDiagram
    REQUEST_TYPE ||--o{ REQUEST : ""
    VALIDATION_FLOW ||--o{ REQUEST_TYPE : ""
    REQUEST ||--o| APPROVAL_PROCESS : "GFK"
    REQUEST ||--o{ REQUEST_ATTACHMENT : ""
    REQUEST ||--o{ REQUEST_COMMENT : ""
    USER ||--o{ REQUEST : "requester"
    POLL ||--o{ POLL_OPTION : ""
    POLL_OPTION ||--o{ POLL_VOTE : ""
    USER ||--o{ ANNOUNCEMENT : "author"
    DOCUMENT ||--o{ DOCUMENT_SIGNATURE : ""

    REQUEST_TYPE {
        int id PK
        string code UK
        json form_schema
        int flow_id FK
    }
    REQUEST {
        int id PK
        int type_id FK
        string reference UK
        uuid requester_id FK
        json data
        string status
    }
    ANNOUNCEMENT {
        int id PK
        string title
        bool pinned
        string audience
        datetime publish_at
        datetime expires_at
    }
    POLL {
        int id PK
        string question
        bool is_open
        bool multiple_choice
    }
    DOCUMENT_SIGNATURE {
        int id PK
        int document_id FK
        int version_id FK
        uuid signer_id FK
        string statement
        datetime signed_at
    }
```

La **recherche globale** (`apps/search`) n'ajoute aucun modèle : elle interroge
les modèles existants via les mêmes fonctions de visibilité que chaque module.

## Historique

## Diagramme (Phase 5 — Agenda, Réunions, Messagerie)

```mermaid
erDiagram
    USER ||--o{ CALENDAR_EVENT : "owner"
    CALENDAR_EVENT ||--o{ EVENT_ATTENDEE : ""
    CALENDAR_EVENT ||--o{ EVENT_REMINDER : ""
    USER ||--o{ MEETING : "organizer"
    MEETING ||--o{ MEETING_PARTICIPANT : ""
    MEETING ||--o{ MEETING_POLL : ""
    MEETING_POLL ||--o{ MEETING_POLL_OPTION : ""
    MEETING_POLL_OPTION ||--o{ MEETING_POLL_VOTE : ""
    MEETING ||--o| DOCUMENT : "recording_document / minutes_document"
    USER ||--o| CHAT_ACCOUNT : ""
    CHAT_CHANNEL }o--o| TEAM : ""
    CHAT_CHANNEL }o--o| DEPARTMENT : ""

    CALENDAR_EVENT {
        int id PK
        uuid owner_id FK
        string type "personal|task|meeting|leave|reminder"
        string visibility "private|busy|shared"
        datetime start
        datetime end
        string recurrence_rule
    }
    MEETING {
        int id PK
        uuid organizer_id FK
        string room_slug UK
        string access "invited|open"
        bool lobby
        text agenda
        text minutes
        string status
    }
    CHAT_ACCOUNT {
        int id PK
        uuid user_id FK
        string rc_user_id
        string rc_username
    }
```

Le **feed agenda** ne matérialise rien : `agenda/feed.build_feed()` fusionne
`CalendarEvent` avec les tâches (`Task.due_at`), les réunions (`Meeting`) et les
congés approuvés (`LeaveRequest`) en items virtuels au moment de la requête.

## Diagramme (Phase 4 — Documents)

```mermaid
erDiagram
    FOLDER ||--o{ DOCUMENT : ""
    FOLDER ||--o{ FOLDER : "parent"
    DOCUMENT ||--o{ DOCUMENT_VERSION : "historique"
    DOCUMENT ||--o| DOCUMENT_VERSION : "current_version"
    DOCUMENT ||--o{ DOCUMENT_VISIBILITY_RULE : ""
    DOCUMENT ||--o{ DOCUMENT_DISTRIBUTION : ""
    DOCUMENT_DISTRIBUTION ||--o{ DOCUMENT_RECIPIENT : "suivi de lecture"
    DOCUMENT ||--o{ SHARE_LINK : ""
    USER ||--o{ DOCUMENT_RECIPIENT : ""

    DOCUMENT {
        int id PK
        string title
        string keywords
        int folder_id FK
        uuid owner_id FK
        bool is_in_library
        string visibility "public|restricted"
        int current_version_id FK
        datetime deleted_at
    }
    DOCUMENT_VERSION {
        int id PK
        int document_id FK
        int version_number
        file file
        int size
        text text_content
    }
    DOCUMENT_DISTRIBUTION {
        int id PK
        int document_id FK
        int version_id FK
        uuid sent_by_id FK
        string mode "user|selection|broadcast"
    }
    DOCUMENT_RECIPIENT {
        int id PK
        int distribution_id FK
        int document_id FK
        uuid user_id FK
        bool is_read
        datetime read_at
        datetime reminded_at
    }
    SHARE_LINK {
        int id PK
        int document_id FK
        int version_id FK
        string token UK
        string password_hash
        datetime expires_at
        int max_downloads
        int download_count
        bool is_revoked
    }
```

Visibilité : `Document.objects.visible_to(user)` = propriétaire ∪ bibliothèque
publique ∪ documents reçus ∪ bibliothèque restreinte dont une règle
(`role`/`department`) correspond ∪ (tout si `documents.manage_library`).

## Diagramme (Phase 3 — Tâches)

```mermaid
erDiagram
    TASK ||--o{ TASK_ASSIGNMENT : ""
    TASK ||--o{ TASK_SUBMISSION : ""
    TASK ||--o{ TASK_COMMENT : ""
    TASK ||--o{ CHECKLIST_ITEM : ""
    TASK ||--o{ TASK_ATTACHMENT : ""
    TASK ||--o{ TASK : "parent (sous-tâches)"
    TASK }o--o{ TASK_LABEL : ""
    TASK_SUBMISSION ||--o{ TASK_SUBMISSION_ATTACHMENT : ""
    RECURRING_TASK_TEMPLATE ||--o{ TASK : "génère"
    USER ||--o{ TASK_ASSIGNMENT : ""
    USER ||--o{ TASK_SUBMISSION : ""

    TASK {
        int id PK
        string title
        string priority
        string status "todo|in_progress|in_review|done"
        uuid created_by_id FK
        int parent_id FK
        int assigned_team_id FK
        int assigned_department_id FK
        datetime due_at
        decimal estimated_hours
        datetime closed_at
    }
    TASK_ASSIGNMENT {
        int id PK
        int task_id FK
        uuid user_id FK
        string progress_status "todo|in_progress|submitted|validated|returned"
        decimal declared_hours
    }
    TASK_SUBMISSION {
        int id PK
        int task_id FK
        uuid submitted_by_id FK
        text report
        string status "submitted|validated|returned"
        uuid reviewed_by_id FK
    }
    RECURRING_TASK_TEMPLATE {
        int id PK
        string frequency "weekly|monthly"
        int interval
        int weekday
        int day_of_month
        int lead_time_days
        date next_due_date
    }
```

Clôture : `Task.recompute_status()` passe en `done` quand toutes les
`TaskAssignment` sont `validated` ; sinon en `in_review` dès qu'une soumission
existe. Le chef peut forcer le statut (`/tasks/{id}/status/`).

## Diagramme (Phase 2 — RH, Courrier, validation)

```mermaid
erDiagram
    USER ||--o| EMPLOYEE : ""
    EMPLOYEE ||--o{ CONTRACT : ""
    EMPLOYEE ||--o{ EMPLOYEE_DOCUMENT : ""
    EMPLOYEE ||--o{ CAREER_EVENT : ""
    EMPLOYEE ||--o{ HEALTH_RECORD : ""
    EMPLOYEE ||--o{ LEAVE_BALANCE : ""
    EMPLOYEE ||--o{ LEAVE_REQUEST : ""
    LEAVE_TYPE ||--o{ LEAVE_BALANCE : ""
    LEAVE_TYPE ||--o{ LEAVE_REQUEST : ""
    LEAVE_REQUEST ||--o| APPROVAL_PROCESS : "GFK"
    VALIDATION_FLOW ||--o{ VALIDATION_STEP : ""
    VALIDATION_FLOW ||--o{ APPROVAL_PROCESS : ""
    APPROVAL_PROCESS ||--o{ APPROVAL_DECISION : ""
    VALIDATION_STEP ||--o{ APPROVAL_DECISION : ""
    MAIL ||--o{ MAIL_ATTACHMENT : ""
    MAIL ||--o{ MAIL_EVENT : ""
    MAIL ||--o{ MAIL_ACKNOWLEDGEMENT : ""
    MAIL_CATEGORY ||--o{ MAIL : ""
    NUMBERING_SCHEME ||--o{ MAIL : "référence"

    EMPLOYEE {
        int id PK
        uuid user_id FK
        string matricule UK
        string job_title
        date hire_date
        string employment_type
        string hr_status
    }
    LEAVE_REQUEST {
        int id PK
        int employee_id FK
        int leave_type_id FK
        date start_date
        date end_date
        decimal working_days
        string status
    }
    APPROVAL_PROCESS {
        int id PK
        int flow_id FK
        string content_type
        string object_id
        uuid subject_user_id FK
        string status
        int current_step_id FK
    }
    VALIDATION_STEP {
        int id PK
        int flow_id FK
        int order
        string approver_type "manager|role|user"
        int approver_role_id FK
        uuid approver_user_id FK
    }
    MAIL {
        int id PK
        string reference UK
        string direction "incoming|outgoing"
        string subject
        string correspondent
        date mail_date
        string status
        string confidentiality
        uuid assigned_to_id FK
        int assigned_department_id FK
        date due_date
    }
```

### Circuit de validation (moteur générique)

`start_approval(objet, flow_code)` crée un `ApprovalProcess` lié par
GenericForeignKey. Chaque `submit_decision` :
- `approved` → étape suivante résolvable, ou état `approved` si dernière ;
- `rejected` → `ApprovalProcess.status = rejected` ;
- `returned` → `cancelled` (retour brouillon côté objet).
À l'état terminal, le moteur appelle le hook correspondant sur l'objet
(`on_approval_approved` / `_rejected` / `_returned`). Pour les congés,
`on_approval_approved` décompte les jours du `LeaveBalance`.

## Diagramme (Phase 1)

## Diagramme (Phase 1)

```mermaid
erDiagram
    ROLE ||--o{ ROLE_PERMISSION : "socle"
    PERMISSION ||--o{ ROLE_PERMISSION : ""
    ROLE ||--o{ USER : "rôle principal"
    USER ||--o{ USER_PERMISSION_OVERRIDE : "exceptions"
    PERMISSION ||--o{ USER_PERMISSION_OVERRIDE : ""
    USER ||--o{ USER_PERMISSION_OVERRIDE : "granted_by"
    DEPARTMENT ||--o{ USER : "membres"
    DEPARTMENT ||--o{ DEPARTMENT : "parent"
    DEPARTMENT ||--o{ TEAM : ""
    TEAM ||--o{ TEAM_MEMBERSHIP : ""
    USER ||--o{ TEAM_MEMBERSHIP : ""
    USER ||--o{ USER : "manager (organigramme)"
    USER ||--o{ LOGIN_ATTEMPT : ""
    USER ||--o{ NOTIFICATION : "destinataire"
    USER ||--o| NOTIFICATION_PREFERENCE : ""
    USER ||--o{ AUDIT_LOG_ENTRY : "auteur"

    USER {
        uuid id PK
        string email UK
        string first_name
        string last_name
        int role_id FK
        int department_id FK
        uuid manager_id FK
        bool is_super_admin
        string status
        string preferred_language
        string timezone
        int failed_login_count
        datetime locked_until
        datetime last_password_change
        bool is_2fa_enabled
        string totp_secret
    }
    ROLE {
        int id PK
        string slug UK
        string name
        bool is_system
    }
    PERMISSION {
        int id PK
        string code UK
        string label
        string module
    }
    USER_PERMISSION_OVERRIDE {
        int id PK
        uuid user_id FK
        int permission_id FK
        string effect "grant|deny"
        string scope_type "global|module|department|project"
        string scope_id
        uuid granted_by_id FK
        datetime created_at
        datetime revoked_at
    }
    DEPARTMENT {
        int id PK
        string name
        string code UK
        int parent_id FK
        uuid head_id FK
    }
    TEAM {
        int id PK
        string name
        int department_id FK
        uuid lead_id FK
    }
    AUDIT_LOG_ENTRY {
        bigint id PK
        datetime timestamp
        uuid actor_id FK
        string actor_label
        bool actor_is_admin
        string module
        string action
        string severity
        string target_type
        string target_id
        json changes
        string ip_address
    }
    NOTIFICATION {
        bigint id PK
        uuid recipient_id FK
        string type
        string title
        bool is_read
        datetime created_at
    }
```

## Moteur de permission effective

```
effective(user, code, scope) :
  si user.is_super_admin                       → True
  base   = code ∈ permissions(role de l'user)
  ovs    = overrides actifs (non révoqués) de l'user pour `code`, dont le périmètre correspond à `scope`
  si un ov.effect == "deny" dans ovs           → False
  si un ov.effect == "grant" dans ovs          → True
  sinon                                        → base
```

Implémentation : `backend/apps/permissions/services.py`
(`has_permission`, `effective_permissions`, `Scope`).

## Journal d'audit — garanties d'immuabilité

- `AuditLogEntry.save()` lève une exception si `pk` est déjà défini (pas d'`UPDATE`).
- `AuditLogEntry.delete()` lève une exception (la purge de rétention utilise `_raw_delete`).
- Aucun `ModelViewSet` d'écriture : seules `list` / `retrieve` / `export` sont exposées.
- Rétention : `apps/audit/tasks.purge_audit_log` (archive CSV vers MinIO, puis purge > 365 j).

## Migrations

```
accounts/0001_initial, 0002_initial
organization/0001_initial
permissions/0001_initial, 0002_seed_catalog, 0003_phase2_catalog
audit/0001_initial
notifications/0001_initial
permissions/0004…0007 (catalogues des phases 3 à 6)
validation/0001_initial, 0002_seed_leave_flow, 0003_seed_request_flow
hr/0001_initial, 0002_seed_leave_types_holidays
correspondence/0001_initial
tasks/0001_initial
documents/0001_initial, 0002_documentsignature
agenda/0001_initial
meetings/0001_initial
integrations/0001_initial
demands/0001_initial, 0002_seed_request_types
engagement/0001_initial
```
