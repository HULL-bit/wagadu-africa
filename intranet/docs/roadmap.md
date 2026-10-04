# Plan de livraison — Wagadu Hub

Livraison par phases (section 12 du cahier des charges). Une phase est validée
selon la *Definition of Done* avant de passer à la suivante.

> **Les 6 phases du CDC sont livrées.** Phase 7 (évolutions post-v1) en cours —
> Lot A (compléments RH) livré. 171 tests `pytest` + 86 vérifications de bout en
> bout (`scripts/smoke_test.py`) + `eslint` / `vitest` / `next build` — CI verte.
> Détail : [phase-7-evolutions.md](phase-7-evolutions.md).

| Phase | Contenu | État |
|---|---|---|
| **1 — Socle technique** | Auth JWT, utilisateurs/rôles/permissions (rôle + exception individuelle), Super Admin, tableau de bord de base, journal d'audit, Docker Compose, CI/CD minimal, `createsuperadmin` | ✅ Livrée |
| **2 — RH & Courrier** | App `validation` (circuits réutilisables), fiches employés + contrats + carrière + médical, congés (solde temps réel, validation manager→RH), module Courrier (numérotation auto, affectation, traçabilité, accusé, export) | ✅ Livrée |
| **3 — Tâches** | Création/assignation (individu, sélection, équipe), kanban + calendrier, sous-tâches/checklists, étiquettes, soumission + validation par assigné, fil de commentaires, tâches récurrentes, rappels J-1/J/retard, tableau de bord de performance | ✅ Livrée |
| **4 — Documents** | Diffusion ciblée (unique / sélection / broadcast) + suivi de lecture par destinataire + relance, bibliothèque commune, dossiers, recherche full-text, versions, visibilité par rôle/département, MinIO, liens de partage externes (mot de passe / expiration / quota), aperçu navigateur, corbeille + purge 30 j | ✅ Livrée |
| **5 — Communication temps réel** | Intégration Rocket.Chat (SSO par jeton personnel, provisionnement, canaux), réunions Jitsi (lien + JWT organisateur/invités, ordre du jour, CR, sondages, salle d'attente, rappels 15 min), Agenda personnel (feed unifié tâches/réunions/congés, invitations, rappels, vue d'équipe, export/import iCal). Intégrations config-gated. | ✅ Livrée |
| **6 — Finalisation** | Demandes transverses (achat / mission / remboursement, circuit responsable→admin), exports XLSX partout + PDF des registres, recherche globale transverse, fil d'annonces, sondages internes, résumés e-mail, extraction PDF, export RGPD, signature simple de document, lecteur de documents intégré | ✅ Livrée |

## Definition of Done (chaque phase)

- [ ] Modèles de données créés et migrés
- [ ] API testée (cas nominaux + permissions)
- [ ] Interface front fonctionnelle et connectée à l'API
- [ ] Notifications associées en place si prévues
- [ ] Actions sensibles tracées dans le journal d'audit
- [ ] Documentation de la phase ajoutée à `/docs`

## Décisions structurantes

| Sujet | Décision | Date |
|---|---|---|
| Rétention journal d'audit | 12 mois glissants, archivage CSV vers MinIO puis purge (Celery beat) | 2026-08-29 |
| Circuits de validation | Modélisés multi-niveaux configurables dès le départ (app `validation`, réutilisée Phase 6) | 2026-08-29 |
| Circuit congés par défaut | Responsable hiérarchique → RH (2 niveaux ; RH seul si pas de manager) | 2026-08-29 |
| Décompte des congés | Jours ouvrés (lun–ven) hors fériés (table `PublicHoliday`, Sénégal) | 2026-08-29 |
| Numérotation courrier | `AAAA-ARR/DEP-NNNN`, compteur annuel, déclinable par département | 2026-08-29 |
| Onboarding/offboarding, évaluations | Reportés en Phase 6 | 2026-08-29 |
| Assignation d'une tâche à une équipe | Snapshot instantané des membres à la création (ajustable ensuite) | 2026-08-29 |
| Clôture d'une tâche multi-assignés | Auto quand tous validés + clôture/réouverture manuelle | 2026-08-29 |
| Rappels d'échéance des tâches | J-1, jour J, puis relance quotidienne en retard | 2026-08-29 |
| Visibilité biblio documentaire | Public par défaut, restriction optionnelle par rôle/département/projet | 2026-08-29 |
| Suivi de lecture d'une diffusion générale | Une ligne par employé (snapshot à l'envoi) | 2026-08-29 |
| Recherche « contenu » des documents | Extraction txt/md/csv maintenant, PDF différé (Phase 6) | 2026-08-29 |
| Rétention de la corbeille documentaire | 30 jours puis purge | 2026-08-29 |
| SSO Rocket.Chat | Jeton d'accès personnel via API admin RC (`login-with-token`) | 2026-08-30 |
| Hébergement Jitsi | Instance externe (`JITSI_URL`), JWT si `JITSI_APP_SECRET` | 2026-08-30 |
| Évènements d'agenda synchronisés | Virtuels, calculés à la volée dans le feed | 2026-08-30 |
| Enregistrement des réunions | Dépôt manuel post-réunion → Document (pas de Jibri) | 2026-08-30 |
| Circuit des demandes transverses | Responsable hiérarchique → administrateur (2 niveaux), reconfigurable par type | 2026-08-30 |
| Export PDF | XLSX partout + PDF pour courrier / demandes / journal d'audit (reportlab) | 2026-08-30 |
| Extraction texte PDF | `pypdf`, extraction asynchrone à l'upload | 2026-08-30 |
| Compléments §2.11 reportés post-v1 | Inventaire, projets terrain, formation, i18n complète, invités externes, API OAuth | 2026-08-30 |
| 2FA | Socle prêt (TOTP activable), enforcement par rôle repoussé en phase 6 | 2026-08-29 |
| Authentification API | JWT (SimpleJWT) access court + refresh avec blacklist | 2026-08-29 |
