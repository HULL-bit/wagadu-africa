# Phase 5 — Communication temps réel & Agenda

Trois modules : **Rocket.Chat** (§2.5), **Jitsi** (§2.6), **Agenda personnel**
(§2.7). Les intégrations Rocket.Chat et Jitsi sont **config-gated** : sans les
variables d'environnement, les endpoints renvoient 503 et l'interface affiche
« non configuré ». L'Agenda est entièrement autonome.

## App `integrations` — Rocket.Chat

| Élément | Rôle |
|---|---|
| `RocketChatClient` | wrapper REST de l'API admin RC (`login`, `users.create`, `users.createToken`, `users.setStatus`, `channels.create`) — jeton admin mis en cache |
| `ChatAccount` | correspondance compte Wagadu Hub ↔ compte RC (`rc_user_id`, `rc_username`) |
| `ChatChannel` | canal RC lié à une équipe / un département / un projet |
| Signaux | création de compte → provisionnement RC (tâche Celery) ; création d'équipe/département → création de canal |
| `POST /api/v1/chat/sso/` | **SSO** : génère un jeton d'accès personnel RC ; le front fait `login-with-token` dans l'iframe |
| `GET /api/v1/integrations/status/` | état de configuration RC + Jitsi |

Config : `settings.WAGADU["ROCKETCHAT"]` ← `ROCKETCHAT_URL`,
`ROCKETCHAT_ADMIN_USER`, `ROCKETCHAT_ADMIN_PASSWORD`.

## App `meetings` — Jitsi

| Modèle | Champs |
|---|---|
| `Meeting` | `title`, `organizer`, `start`/`end`, `room_slug` (auto), `access` (`invited`/`open`), `lobby`, `recurrence_rule`, `agenda`, `minutes`, `minutes_document`, `recording_document`, `status` |
| `MeetingParticipant` | `response` (`accepted`/`declined`/`tentative`), `is_organizer`, `joined_at` |
| `MeetingPoll` / `MeetingPollOption` / `MeetingPollVote` | sondage rapide (choix unique — un vote remplace le précédent) |

- `join_url` = `JITSI_URL/room_slug`. `GET /meetings/{id}/join/` renvoie l'URL,
  et un **JWT** (organisateur = modérateur, invités seuls) si `JITSI_APP_ID` +
  `JITSI_APP_SECRET` configurés.
- Accès : `invited` (participants + organisateur) ou `open` (tout le monde).
- **Enregistrement** : dépôt manuel post-réunion → `Document` (visibilité
  restreinte), `Meeting.recording_document`.
- Celery : `send_meeting_reminders` (15 min avant), `close_stale_meetings`.

API : `meetings/` CRUD · `/join/` · `/respond/` · `/participants/` · `/close/`
(+ CR) · `meeting-polls/` (+ `/vote/`, `/close/`).
Permissions : `meetings.create` (tous rôles), `meetings.manage_all` (admin).

## App `agenda`

| Modèle | Champs |
|---|---|
| `CalendarEvent` | `owner`, `title`, `start`/`end`, `all_day`, `location`, `type`, `visibility` (`private`/`busy`/`shared`), `color`, `recurrence_rule` |
| `EventAttendee` | `response` (accepté / refusé / à confirmer) |
| `EventReminder` | `minutes_before`, `channel` (notification / e-mail) |

- **Feed unifié** `GET /api/v1/agenda/?start=&end=` : fusionne à la volée
  `CalendarEvent` + tâches (`due_at`) + réunions + **congés validés** en
  évènements virtuels typés & colorés (`editable: false`). Pas de duplication en
  base, pas de job de synchronisation.
- `GET /api/v1/agenda/export.ics` / `POST /api/v1/agenda/import/` (lib `icalendar`).
- `GET /api/v1/agenda/team/` : disponibilités des collaborateurs directs (chef).
- `POST /agenda/events/{id}/respond/` : confirmation de présence.
- Celery : `send_event_reminders` (cadence 2 min).

Code couleur (repris côté front) : personnel `#6E3C13`, tâche `#F6BB24`,
réunion `#D2812E`, congé `#4A2A12`, rappel `#FFA900`.

## Écrans front
`/messagerie` (iframe Rocket.Chat + SSO `login-with-token`, ou message « non
configuré ») · `/meetings` + `/meetings/new` + `/meetings/[id]` (rejoindre,
ordre du jour, participants, **sondages**, compte-rendu) · `/agenda`
(vues jour / semaine / mois, création, invitations, rappels, export iCal) ·
`/agenda/team`. Dashboard : prochaines réunions.

## Infra
- `infra/docker-compose.yml` : services `mongodb` + `rocketchat` sous le profil
  `chat` (`docker compose --profile chat up -d`), non démarrés par défaut.
- Nginx : `location /chat/` → Rocket.Chat (résolution DNS paresseuse : nginx
  démarre même sans RC).
- Jitsi : instance hébergée séparément (`JITSI_URL`).

## Definition of Done — Phase 5

| Critère | État |
|---|---|
| Modèles créés et migrés | ✅ `agenda`, `meetings`, `integrations` |
| API testée (nominal + permissions + config-gating) | ✅ +24 tests (133 au total) |
| Front connecté | ✅ 6 écrans, build OK |
| Notifications | ✅ invitations agenda/réunion, réponses, rappels 15 min / 2 min |
| Actions sensibles tracées | ✅ création réunion/évènement, SSO messagerie, clôture, exports |
| Documentation `/docs` | ✅ ce document + schéma BDD |

## Reporté / hors périmètre
- Récurrence : le champ `recurrence_rule` (RRULE) est stocké et exporté en iCal,
  mais l'**expansion** des occurrences dans le feed sera affinée en Phase 6.
- Jibri (enregistrement automatique Jitsi) : hors périmètre — dépôt manuel retenu.
- Rocket.Chat self-hosté en production : le profil `chat` fournit une base ;
  le dimensionnement (réplica MongoDB, stockage) est un choix de déploiement.
