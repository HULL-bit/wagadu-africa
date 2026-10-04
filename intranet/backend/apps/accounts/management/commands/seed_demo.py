"""Jeu de données de démonstration pour tester l'application de bout en bout.

    python manage.py seed_demo          # crée / complète les données
    python manage.py seed_demo --fresh  # supprime d'abord les données de démo

Idempotent : réexécutable sans créer de doublons. Le compte super-admin
existant n'est jamais touché. Mot de passe commun : Wagadu2026!Hub
"""

from __future__ import annotations

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

PASSWORD = "Wagadu2026!Hub"
DOMAIN = "wagadu.africa"

DEPARTMENTS = [
    ("DIR", "Direction"),
    ("PROG", "Programmes"),
    ("FIN", "Finances"),
    ("COM", "Communication"),
    ("TERR", "Opérations terrain"),
]

# email local, prénom, nom, rôle, dépt, intitulé de poste
PEOPLE = [
    ("aminata.diallo", "Aminata", "Diallo", "chef", "PROG", "Coordinatrice des programmes"),
    ("ousmane.ba", "Ousmane", "Ba", "employe", "PROG", "Chargé de projet terrain"),
    ("fatou.sow", "Fatou", "Sow", "employe", "PROG", "Animatrice communautaire"),
    ("moussa.ndiaye", "Moussa", "Ndiaye", "rh", "DIR", "Responsable des ressources humaines"),
    ("awa.faye", "Awa", "Faye", "employe", "FIN", "Comptable"),
    ("cheikh.gueye", "Cheikh", "Guèye", "chef", "FIN", "Responsable financier"),
    ("mariama.balde", "Mariama", "Baldé", "employe", "COM", "Chargée de communication"),
    ("ibrahima.sarr", "Ibrahima", "Sarr", "employe", "COM", "Graphiste"),
    ("khady.cisse", "Khady", "Cissé", "chef", "TERR", "Superviseure terrain"),
    ("modou.kane", "Modou", "Kane", "employe", "TERR", "Agent de collecte de données"),
]


class Command(BaseCommand):
    help = "Crée un jeu de données de démonstration (utilisateurs, tâches, sondages…)."

    def add_arguments(self, parser):
        parser.add_argument("--fresh", action="store_true", help="Supprime les données de démo avant de recréer.")

    def handle(self, *args, **opts):
        self.stdout.write(self.style.MIGRATE_HEADING("Seed de démonstration Wagadu Hub"))
        if opts["fresh"]:
            self._wipe()
        with transaction.atomic():
            depts = self._departments()
            users = self._users(depts)
        self._employees(users)
        self._tasks(users)
        self._leave(users)
        self._polls(users)
        self._announcements(users, depts)
        self._meetings(users)
        self._mail(users, depts)
        self._messaging(users)
        self._projects(users, depts)
        self._availability(users)
        self._summary()

    # ------------------------------------------------------------------ #

    def _wipe(self):
        from apps.accounts.models import User
        from apps.correspondence.models import Mail
        from apps.engagement.models import Announcement, Poll
        from apps.hr.models import Employee
        from apps.meetings.models import Meeting
        from apps.tasks.models import Task

        emails = [f"{p[0]}@{DOMAIN}" for p in PEOPLE]
        Task.objects.filter(title__startswith="[Démo]").delete()
        Poll.objects.filter(question__startswith="[Démo]").delete()
        Announcement.objects.filter(title__startswith="[Démo]").delete()
        Meeting.objects.filter(title__startswith="[Démo]").delete()
        Mail.objects.filter(subject__startswith="[Démo]").delete()
        Employee.objects.filter(user__email__in=emails).delete()
        User.objects.filter(email__in=emails).delete()
        self.stdout.write("  données de démo supprimées")

    def _departments(self):
        from apps.organization.models import Department

        out = {}
        for code, name in DEPARTMENTS:
            dept, _ = Department.objects.get_or_create(code=code, defaults={"name": name})
            out[code] = dept
        self.stdout.write(f"  départements : {len(out)}")
        return out

    def _users(self, depts):
        from apps.accounts.models import User
        from apps.permissions.models import Role

        roles = {r.slug: r for r in Role.objects.all()}
        bios = {
            "aminata.diallo": "12 ans dans la coordination de programmes de développement en Afrique de l'Ou.",
            "moussa.ndiaye": "Accompagne les équipes sur le recrutement, la paie et le climat social.",
            "mariama.balde": "Raconte le terrain : reportages, réseaux sociaux, relations presse.",
        }
        out = {}
        for local, first, last, role_slug, dept_code, title in PEOPLE:
            email = f"{local}@{DOMAIN}"
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": first,
                    "last_name": last,
                    "role": roles.get(role_slug),
                    "department": depts.get(dept_code),
                    "job_title": title,
                    "phone": f"+221 77 {100 + len(out):03d} {10 + len(out):02d} {20 + len(out):02d}",
                    "bio": bios.get(local, ""),
                    "preferred_language": "fr",
                },
            )
            if created:
                user.set_password(PASSWORD)
            # renseigne aussi les comptes déjà présents
            user.role = user.role or roles.get(role_slug)
            user.department = user.department or depts.get(dept_code)
            user.job_title = user.job_title or title
            if local in ("aminata.diallo", "mariama.balde"):
                user.linkedin_url = user.linkedin_url or f"https://www.linkedin.com/in/{local.replace('.', '-')}"
            user.save()
            out[local] = user
        # rattache les chefs de département
        for code, local in (("PROG", "aminata.diallo"), ("FIN", "cheikh.gueye"), ("TERR", "khady.cisse"), ("DIR", "moussa.ndiaye")):
            d = depts.get(code)
            if d and not d.head_id:
                d.head = out[local]
                d.save(update_fields=["head"])
        # managers
        for local, mgr in (
            ("ousmane.ba", "aminata.diallo"), ("fatou.sow", "aminata.diallo"),
            ("awa.faye", "cheikh.gueye"), ("mariama.balde", "moussa.ndiaye"),
            ("ibrahima.sarr", "moussa.ndiaye"), ("modou.kane", "khady.cisse"),
        ):
            u = out[local]
            if hasattr(u, "manager") and not u.manager_id:
                u.manager = out[mgr]
                u.save(update_fields=["manager"])
        self.stdout.write(f"  utilisateurs : {len(out)} (mot de passe : {PASSWORD})")
        return out

    def _employees(self, users):
        from apps.hr.models import Contract, Employee

        today = timezone.now().date()
        n = 0
        for i, (local, *_rest) in enumerate(PEOPLE, start=1):
            user = users[local]
            emp, created = Employee.objects.get_or_create(
                user=user,
                defaults={
                    "matricule": f"WA-{i:04d}",
                    "job_title": user.job_title,
                    "hire_date": today - timedelta(days=120 + i * 45),
                    "employment_type": "cdi" if i % 3 else "cdd",
                    "hr_status": "active",
                },
            )
            if created:
                n += 1
                Contract.objects.get_or_create(
                    employee=emp,
                    reference=f"WA-CTR-{i:04d}",
                    defaults={
                        "type": emp.employment_type,
                        "start_date": emp.hire_date,
                        "end_date": None if emp.employment_type == "cdi" else today + timedelta(days=45 + i * 10),
                        "gross_salary": 250000 + i * 35000,
                    },
                )
        self.stdout.write(f"  fiches RH : {n} créées")

    def _tasks(self, users):
        from apps.tasks.models import Priority, Task, TaskAssignment, TaskStatus

        now = timezone.now()
        plan = [
            ("Finaliser le rapport trimestriel Blue-Track", "aminata.diallo", ["ousmane.ba", "fatou.sow"], TaskStatus.IN_PROGRESS, Priority.HIGH, 3),
            ("Collecter les indicateurs de la zone de Kolda", "khady.cisse", ["modou.kane"], TaskStatus.IN_PROGRESS, Priority.NORMAL, 6),
            ("Préparer le budget prévisionnel 2027", "cheikh.gueye", ["awa.faye"], TaskStatus.TODO, Priority.HIGH, 12),
            ("Relancer les fournisseurs impayés", "cheikh.gueye", ["awa.faye"], TaskStatus.IN_PROGRESS, Priority.URGENT, -2),
            ("Publier le reportage photo de la campagne", "moussa.ndiaye", ["mariama.balde", "ibrahima.sarr"], TaskStatus.IN_REVIEW, Priority.NORMAL, 1),
            ("Mettre à jour la charte graphique", "moussa.ndiaye", ["ibrahima.sarr"], TaskStatus.TODO, Priority.LOW, 20),
            ("Organiser la formation sécurité terrain", "khady.cisse", ["modou.kane", "fatou.sow"], TaskStatus.TODO, Priority.NORMAL, 9),
            ("Réviser les fiches de poste de l'équipe programmes", "aminata.diallo", ["ousmane.ba"], TaskStatus.DONE, Priority.NORMAL, -10),
            ("Consolider les retours des bénéficiaires", "aminata.diallo", ["fatou.sow"], TaskStatus.IN_PROGRESS, Priority.NORMAL, 4),
            ("Auditer les accès à la plateforme", "moussa.ndiaye", ["mariama.balde"], TaskStatus.TODO, Priority.HIGH, -1),
            ("Préparer la réunion mensuelle de coordination", "aminata.diallo", ["ousmane.ba", "khady.cisse"], TaskStatus.TODO, Priority.NORMAL, 2),
            ("Archiver les dossiers de l'exercice précédent", "cheikh.gueye", ["awa.faye"], TaskStatus.DONE, Priority.LOW, -15),
        ]
        n = 0
        for title, creator, assignees, status, prio, due_days in plan:
            full_title = f"[Démo] {title}"
            task, created = Task.objects.get_or_create(
                title=full_title,
                defaults={
                    "description": "Tâche de démonstration générée par seed_demo.",
                    "created_by": users[creator],
                    "priority": prio,
                    "status": status,
                    "start_at": now - timedelta(days=3),
                    "due_at": now + timedelta(days=due_days),
                    "estimated_hours": 8,
                    "closed_at": now if status == TaskStatus.DONE else None,
                },
            )
            if created:
                n += 1
                for a in assignees:
                    TaskAssignment.objects.get_or_create(
                        task=task, user=users[a],
                        defaults={"assigned_by": users[creator]},
                    )
        self.stdout.write(f"  tâches : {n} créées")

    def _leave(self, users):
        from apps.hr.models import Employee, LeaveRequest, LeaveType

        lt = {t.code: t for t in LeaveType.objects.all()}
        today = timezone.now().date()
        rows = [
            ("ousmane.ba", "annuel", 14, 5, "in_review", "Congés annuels — repos familial"),
            ("awa.faye", "maladie", -3, 2, "approved", "Certificat médical fourni"),
            ("fatou.sow", "annuel", 30, 10, "in_review", "Vacances scolaires"),
            ("ibrahima.sarr", "exceptionnel", 7, 1, "approved", "Évènement familial"),
        ]
        n = 0
        for local, code, start_off, length, status, reason in rows:
            emp = Employee.objects.filter(user=users[local]).first()
            if not emp or code not in lt:
                continue
            start = today + timedelta(days=start_off)
            _, created = LeaveRequest.objects.get_or_create(
                employee=emp, leave_type=lt[code], start_date=start,
                defaults={
                    "end_date": start + timedelta(days=length),
                    "reason": reason,
                    "working_days": length,
                    "status": status,
                    "submitted_at": timezone.now(),
                },
            )
            n += int(created)
        self.stdout.write(f"  demandes de congé : {n} créées")

    def _polls(self, users):
        from apps.engagement.models import Poll, PollOption, PollVote

        specs = [
            ("[Démo] Quelle date pour le séminaire annuel ?", ["Semaine du 13 octobre", "Semaine du 20 octobre", "Semaine du 3 novembre"], False),
            ("[Démo] Sur quels sujets renforcer la formation interne ?", ["Sécurité terrain", "Outils numériques", "Gestion de projet", "Premiers secours"], True),
        ]
        n = 0
        people = list(users.values())
        for question, options, multi in specs:
            poll, created = Poll.objects.get_or_create(
                question=question,
                defaults={
                    "description": "Sondage de démonstration.",
                    "created_by": users["moussa.ndiaye"],
                    "is_open": True,
                    "multiple_choice": multi,
                    "closes_at": timezone.now() + timedelta(days=10),
                },
            )
            if created:
                n += 1
                opts = [PollOption.objects.create(poll=poll, label=lbl, order=i) for i, lbl in enumerate(options)]
                for j, voter in enumerate(people[:6]):
                    PollVote.objects.get_or_create(option=opts[j % len(opts)], user=voter)
        self.stdout.write(f"  sondages : {n} créés")

    def _announcements(self, users, depts):
        from apps.engagement.models import Announcement

        now = timezone.now()
        rows = [
            ("[Démo] Bienvenue sur Wagadu Hub", "La plateforme interne est désormais ouverte à toute l'équipe. Connectez-vous avec vos identifiants Wagadu.", True, "all", None),
            ("[Démo] Séminaire annuel : réservez vos dates", "Le séminaire se tiendra en octobre. Répondez au sondage dans l'espace Vie interne.", False, "all", None),
            ("[Démo] Nouvelle procédure de note de frais", "Les notes de frais passent par le module Demandes à partir de ce mois-ci.", False, "department", "FIN"),
        ]
        n = 0
        for title, body, pinned, audience, dept_code in rows:
            _, created = Announcement.objects.get_or_create(
                title=title,
                defaults={
                    "body": body,
                    "author": users["moussa.ndiaye"],
                    "pinned": pinned,
                    "audience": audience,
                    "department": depts.get(dept_code) if dept_code else None,
                    "publish_at": now - timedelta(days=1),
                },
            )
            n += int(created)
        self.stdout.write(f"  annonces : {n} créées")

    def _meetings(self, users):
        from apps.meetings.models import Meeting

        now = timezone.now()
        rows = [
            ("[Démo] Coordination hebdomadaire", "aminata.diallo", 2, ["ousmane.ba", "fatou.sow", "khady.cisse"]),
            ("[Démo] Point budgétaire mensuel", "cheikh.gueye", 5, ["awa.faye", "moussa.ndiaye"]),
        ]
        n = 0
        for title, organizer, in_days, participants in rows:
            start = now + timedelta(days=in_days, hours=1)
            meeting, created = Meeting.objects.get_or_create(
                title=title,
                defaults={
                    "description": "Réunion de démonstration.",
                    "organizer": users[organizer],
                    "start": start,
                    "end": start + timedelta(hours=1),
                    "status": "scheduled",
                },
            )
            if created:
                n += 1
                try:
                    meeting.participants.add(*[users[p] for p in participants])
                except Exception:
                    pass
        self.stdout.write(f"  réunions : {n} créées")

    def _mail(self, users, depts):
        from apps.correspondence.models import Mail

        today = timezone.now().date()
        rows = [
            ("[Démo] Demande de partenariat — Mairie de Ziguinchor", "incoming", "Mairie de Ziguinchor", "aminata.diallo", "PROG"),
            ("[Démo] Relevé bancaire trimestriel", "incoming", "Banque Atlantique", "cheikh.gueye", "FIN"),
            ("[Démo] Réponse à l'appel à projets FSE", "outgoing", "Fonds Social Européen", "aminata.diallo", "PROG"),
        ]
        n = 0
        for i, (subject, direction, correspondent, assignee, dept_code) in enumerate(rows, start=1):
            _, created = Mail.objects.get_or_create(
                subject=subject,
                defaults={
                    "reference": f"WA-COUR-{today.year}-{i:03d}",
                    "direction": direction,
                    "body": "Courrier de démonstration.",
                    "correspondent": correspondent,
                    "mail_date": today - timedelta(days=i * 2),
                    "status": "assigned",
                    "registered_by": users["moussa.ndiaye"],
                    "assigned_to": users.get(assignee),
                    "assigned_department": depts.get(dept_code),
                },
            )
            n += int(created)
        self.stdout.write(f"  courriers : {n} créés")

    def _messaging(self, users):
        from django.utils import timezone

        from apps.messaging.models import Channel, Message
        from apps.messaging.signals import ensure_department_channel, ensure_general
        from apps.organization.models import Department

        general = ensure_general()
        for u in users.values():
            general.members.add(u)
        for dept in Department.objects.all():
            ch = ensure_department_channel(dept)
            for u in users.values():
                if u.department_id == dept.id:
                    ch.members.add(u)

        def seed(channel, pairs):
            if channel.messages.exists():
                return
            for local, body in pairs:
                Message.objects.create(channel=channel, author=users.get(local), body=body)
            channel.last_message_at = timezone.now()
            channel.save(update_fields=["last_message_at"])

        seed(general, [
            ("moussa.ndiaye", "Bienvenue sur la messagerie interne de Wagadu Hub."),
            ("aminata.diallo", "Parfait, on centralise les échanges ici."),
            ("cheikh.gueye", "Les points budget se feront dans le canal Finances."),
        ])
        prog = Channel.objects.filter(kind="department", department__code="PROG").first()
        if prog:
            seed(prog, [
                ("aminata.diallo", "Réunion terrain Kolda demain 9h — remontez vos indicateurs."),
                ("ousmane.ba", "Reçu, tableau prêt ce soir."),
                ("fatou.sow", "Je joins les retours bénéficiaires."),
            ])
        n_msg = Message.objects.count()
        self.stdout.write(f"  messagerie : {Channel.objects.count()} canaux, {n_msg} messages")

    def _projects(self, users, depts):
        from datetime import date, timedelta

        from apps.projects.models import Indicator, Milestone, ProgressUpdate, Project

        today = date.today()
        specs = [
            {
                "code": "BT-2026-01", "name": "Blue-Track — Accès à l'eau, région de Kolda",
                "status": "active", "lead": "aminata.diallo", "dept": "PROG",
                "donor": "Union Européenne", "budget": 185000000, "location": "Kolda, Sénégal",
                "start": today - timedelta(days=120), "end": today + timedelta(days=245),
                "summary": "Réhabilitation de forages et sensibilisation à l'hygiène dans 14 villages.",
                "milestones": [
                    ("Diagnostic des points d'eau", "done", -90),
                    ("Réhabilitation de 8 forages", "in_progress", 30),
                    ("Formation des comités de gestion", "todo", 90),
                    ("Évaluation finale", "todo", 230),
                ],
                "indicators": [
                    ("Forages réhabilités", "forages", 14, 6),
                    ("Personnes bénéficiaires", "pers.", 9000, 3800),
                    ("Comités de gestion formés", "comités", 14, 2),
                ],
                "updates": [
                    (-25, "aminata.diallo", "3 forages livrés ce mois, 2 chantiers en cours à Saré Yoba."),
                    (-5, "ousmane.ba", "Retard d'approvisionnement en pompes, livraison attendue semaine prochaine."),
                ],
            },
            {
                "code": "BT-2026-02", "name": "Nutrition infantile — phase pilote",
                "status": "applying", "lead": "khady.cisse", "dept": "TERR",
                "donor": "UNICEF", "budget": 62000000, "location": "Ziguinchor",
                "deadline": today + timedelta(days=18),
                "summary": "Dépistage et prise en charge de la malnutrition aiguë chez les moins de 5 ans.",
                "milestones": [("Dépôt du dossier", "in_progress", 18), ("Audition bailleur", "todo", 45)],
                "indicators": [("Enfants ciblés", "enfants", 2500, 0)],
                "updates": [(-2, "khady.cisse", "Budget révisé et lettre de partenariat de la région signée.")],
            },
            {
                "code": "BT-2025-08", "name": "Agroécologie et résilience climatique",
                "status": "completed", "lead": "aminata.diallo", "dept": "PROG",
                "donor": "AFD", "budget": 140000000, "location": "Tambacounda",
                "start": today - timedelta(days=520), "end": today - timedelta(days=40),
                "summary": "Appui à 600 exploitations familiales : semences, compostage, maraîchage.",
                "milestones": [("Sélection des bénéficiaires", "done", -480), ("Distribution intrants", "done", -400),
                               ("Suivi des rendements", "done", -90), ("Rapport final", "done", -35)],
                "indicators": [("Exploitations appuyées", "expl.", 600, 612), ("Hausse de rendement", "%", 25, 31)],
                "updates": [(-38, "aminata.diallo", "Rapport final validé par le bailleur. Taux de décaissement 98 %.")],
            },
            {
                "code": "BT-2026-03", "name": "Numérisation des services communautaires",
                "status": "prospect", "lead": "moussa.ndiaye", "dept": "COM",
                "donor": "À identifier", "budget": None, "location": "Dakar + régions",
                "summary": "Concept note : plateforme mobile de signalement et de suivi des services de base.",
                "milestones": [("Note de cadrage", "in_progress", 25)],
                "indicators": [],
                "updates": [],
            },
        ]

        n = 0
        for s in specs:
            project, created = Project.objects.get_or_create(
                code=s["code"],
                defaults={
                    "name": s["name"], "summary": s["summary"], "status": s["status"],
                    "lead": users.get(s["lead"]), "department": depts.get(s["dept"]),
                    "donor": s["donor"], "budget": s["budget"], "location": s["location"],
                    "application_deadline": s.get("deadline"),
                    "start_date": s.get("start"), "end_date": s.get("end"),
                    "created_by": users.get(s["lead"]),
                },
            )
            if not created:
                continue
            n += 1
            if project.lead_id:
                project.members.add(project.lead)
            for i, (title, st, off) in enumerate(s["milestones"]):
                Milestone.objects.create(
                    project=project, title=title, status=st, order=i,
                    due_date=today + timedelta(days=off),
                    completed_at=today + timedelta(days=off) if st == "done" else None,
                )
            for name, unit, target, current in s["indicators"]:
                Indicator.objects.create(
                    project=project, name=name, unit=unit, target_value=target, current_value=current,
                )
            for off, local, body in s["updates"]:
                ProgressUpdate.objects.create(
                    project=project, author=users.get(local), date=today + timedelta(days=off), body=body,
                )
        self.stdout.write(f"  projets : {n} créés")

    def _availability(self, users):
        from datetime import date, timedelta

        from apps.availability.models import Availability

        today = date.today()
        rows = [
            ("ousmane.ba", 3, 3, "mission", "Descente terrain Kolda"),
            ("awa.faye", 6, 7, "absent", "Rendez-vous administratif"),
            ("mariama.balde", 2, 2, "remote", ""),
            ("modou.kane", 10, 14, "mission", "Collecte de données Ziguinchor"),
            ("fatou.sow", 4, 4, "afternoon", "Formation externe"),
        ]
        n = 0
        for local, s_off, e_off, kind, note in rows:
            _, created = Availability.objects.get_or_create(
                user=users[local], start_date=today + timedelta(days=s_off),
                defaults={"end_date": today + timedelta(days=e_off), "kind": kind, "note": note},
            )
            n += int(created)
        self.stdout.write(f"  disponibilités : {n} signalées")

    def _summary(self):
        from apps.accounts.models import User

        self.stdout.write(self.style.SUCCESS("\nTerminé."))
        self.stdout.write(f"Comptes actifs : {User.objects.filter(is_active=True).count()}")
        self.stdout.write("Connexion de test : aminata.diallo@wagadu.africa / " + PASSWORD)
