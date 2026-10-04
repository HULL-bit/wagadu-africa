"""Catalogue des permissions atomiques de Wagadu Hub.

Chaque entrée : (code, libellé, module). Le code est stable et sert de clé
partout dans l'application (moteur de permission effective, classe DRF
`HasPermission`, matrice des rôles). Ne jamais renommer un code existant :
ajouter, puis migrer.
"""
from __future__ import annotations

MODULE_ACCOUNTS = "accounts"
MODULE_ORGANIZATION = "organization"
MODULE_HR = "hr"
MODULE_MAIL = "mail"
MODULE_TASKS = "tasks"
MODULE_DOCUMENTS = "documents"
MODULE_REQUESTS = "requests"
MODULE_MEETINGS = "meetings"
MODULE_AUDIT = "audit"
MODULE_PLATFORM = "platform"
MODULE_PROJECTS = "projects"

# (code, libellé, module)
PERMISSION_CATALOG: list[tuple[str, str, str]] = [
    # --- Comptes & administration ---
    ("accounts.view", "Consulter les comptes utilisateurs", MODULE_ACCOUNTS),
    ("accounts.manage", "Créer / modifier / suspendre des comptes", MODULE_ACCOUNTS),
    ("accounts.manage_admins", "Créer / supprimer un compte administrateur", MODULE_ACCOUNTS),
    ("accounts.manage_permissions", "Gérer les rôles et permissions individuelles", MODULE_ACCOUNTS),
    # --- Organisation ---
    ("organization.view", "Consulter départements et équipes", MODULE_ORGANIZATION),
    ("organization.manage", "Gérer départements, équipes et rattachements", MODULE_ORGANIZATION),
    # --- Plateforme ---
    ("platform.settings", "Modifier les paramètres globaux de la plateforme", MODULE_PLATFORM),
    ("platform.manage_validation_flows", "Paramétrer les circuits de validation", MODULE_PLATFORM),
    # --- Journal d'audit ---
    ("audit.view", "Consulter le journal d'audit", MODULE_AUDIT),
    ("audit.view_admin_actions", "Consulter les actions des autres administrateurs", MODULE_AUDIT),
    ("audit.export", "Exporter le journal d'audit", MODULE_AUDIT),
    # --- RH (préparé pour la phase 2) ---
    ("hr.view", "Consulter les dossiers RH", MODULE_HR),
    ("hr.manage", "Gérer les dossiers du personnel", MODULE_HR),
    ("hr.leave.validate", "Valider une demande de congé", MODULE_HR),
    ("hr.export", "Exporter les données RH", MODULE_HR),
    # --- Courrier (phase 2) ---
    ("mail.view", "Consulter le courrier", MODULE_MAIL),
    ("mail.register", "Enregistrer du courrier entrant / sortant", MODULE_MAIL),
    ("mail.assign", "Affecter ou transférer du courrier", MODULE_MAIL),
    ("mail.process", "Traiter le courrier affecté", MODULE_MAIL),
    ("mail.export", "Exporter le registre du courrier", MODULE_MAIL),
    ("mail.template.manage", "Gérer les modèles de courrier", MODULE_MAIL),
    # --- Tâches (phase 3) ---
    ("tasks.view", "Consulter ses tâches", MODULE_TASKS),
    ("tasks.assign", "Créer et assigner des tâches", MODULE_TASKS),
    ("tasks.submit", "Soumettre un livrable", MODULE_TASKS),
    ("tasks.validate", "Valider ou renvoyer une tâche soumise", MODULE_TASKS),
    ("tasks.oversee", "Superviser les tâches et la performance (transverse)", MODULE_TASKS),
    # --- Documents (phase 4) ---
    ("documents.view", "Consulter l'espace documentaire", MODULE_DOCUMENTS),
    ("documents.send", "Envoyer un document ciblé", MODULE_DOCUMENTS),
    ("documents.broadcast", "Diffuser un document à tout le personnel", MODULE_DOCUMENTS),
    ("documents.manage_library", "Gérer la bibliothèque documentaire", MODULE_DOCUMENTS),
    ("documents.share_external", "Générer des liens de partage externes", MODULE_DOCUMENTS),
    # --- Réunions (phase 5) ---
    ("meetings.create", "Créer une réunion", MODULE_MEETINGS),
    ("meetings.manage_all", "Superviser toutes les réunions", MODULE_MEETINGS),
    ("chat.admin", "Administrer la messagerie (canaux)", MODULE_PLATFORM),
    # --- Demandes transverses (phase 6) ---
    ("requests.submit", "Soumettre une demande", MODULE_REQUESTS),
    ("requests.validate", "Valider une étape de demande", MODULE_REQUESTS),
    ("requests.manage_types", "Paramétrer les types de demande", MODULE_REQUESTS),
    # --- Compléments (phase 6) ---
    ("engagement.announce", "Publier une annonce interne", MODULE_PLATFORM),
    ("reports.export", "Exporter les rapports transverses", MODULE_PLATFORM),
    # --- Projets (phase 7 — lot B) ---
    ("projects.view", "Consulter les projets", MODULE_PROJECTS),
    ("projects.manage", "Créer et piloter des projets (jalons, indicateurs, suivi)", MODULE_PROJECTS),
    ("projects.oversee", "Superviser l'ensemble des projets (transverse)", MODULE_PROJECTS),
]

ALL_PERMISSION_CODES = {code for code, _, _ in PERMISSION_CATALOG}

# --- Rôles système et leur socle par défaut (matrice section 4.2) --------
SYSTEM_ROLES: dict[str, dict] = {
    "employe": {
        "name": "Employé / collaborateur",
        "description": "Consultation de ses tâches, soumission de livrables, réception "
        "de documents et de courrier, messagerie.",
        "permissions": [
            "tasks.view",
            "tasks.submit",
            "documents.view",
            "mail.view",
            "meetings.create",
            "requests.submit",
            "projects.view",
        ],
    },
    "chef": {
        "name": "Direction / Chef de service",
        "description": "Création et assignation de tâches, envoi de documents ciblés "
        "ou généraux, validation des demandes.",
        "permissions": [
            "tasks.view",
            "tasks.assign",
            "tasks.submit",
            "tasks.validate",
            "tasks.oversee",
            "documents.view",
            "documents.send",
            "documents.broadcast",
            "documents.share_external",
            "mail.view",
            "mail.register",
            "mail.assign",
            "mail.process",
            "mail.export",
            "meetings.create",
            "hr.leave.validate",
            "requests.submit",
            "requests.validate",
            "engagement.announce",
            "reports.export",
            "organization.view",
            "projects.view",
            "projects.manage",
        ],
    },
    "rh": {
        "name": "Responsable RH",
        "description": "Gestion des dossiers du personnel, congés, contrats, évaluations.",
        "permissions": [
            "tasks.view",
            "tasks.submit",
            "documents.view",
            "documents.send",
            "documents.share_external",
            "mail.view",
            "meetings.create",
            "hr.view",
            "hr.manage",
            "hr.leave.validate",
            "hr.export",
            "mail.view",
            "mail.register",
            "mail.assign",
            "mail.process",
            "mail.export",
            "requests.submit",
            "requests.validate",
            "engagement.announce",
            "reports.export",
            "organization.view",
            "projects.view",
        ],
    },
    "admin": {
        "name": "Administrateur système",
        "description": "Gestion technique quotidienne : comptes courants, départements, "
        "circuits de validation. Ne peut pas modifier les droits d'un autre "
        "administrateur ni du Super Administrateur.",
        "permissions": [
            "accounts.view",
            "accounts.manage",
            "accounts.manage_permissions",
            "organization.view",
            "organization.manage",
            "platform.manage_validation_flows",
            "audit.view",
            "audit.export",
            "hr.export",
            "mail.process",
            "mail.export",
            "mail.template.manage",
            "tasks.view",
            "tasks.assign",
            "tasks.submit",
            "tasks.validate",
            "tasks.oversee",
            "documents.view",
            "documents.send",
            "documents.broadcast",
            "documents.manage_library",
            "documents.share_external",
            "mail.view",
            "mail.register",
            "mail.assign",
            "meetings.create",
            "meetings.manage_all",
            "chat.admin",
            "hr.view",
            "hr.manage",
            "hr.leave.validate",
            "requests.submit",
            "requests.validate",
            "requests.manage_types",
            "engagement.announce",
            "reports.export",
            "projects.view",
            "projects.manage",
            "projects.oversee",
        ],
    },
}
