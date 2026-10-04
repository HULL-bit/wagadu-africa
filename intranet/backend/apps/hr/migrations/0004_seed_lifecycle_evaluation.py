"""Modèles par défaut : checklist d'intégration, checklist de départ,
formulaire d'évaluation de performance."""
from django.db import migrations

ONBOARDING = [
    ("Contrat de travail signé", "document", "hr", -3),
    ("Pièce d'identité fournie", "document", "employee", -3),
    ("RIB fourni", "document", "employee", -1),
    ("Photo d'identité fournie", "document", "employee", 0),
    ("Création du compte e-mail et des accès", "access", "it", -1),
    ("Poste de travail et matériel préparés", "equipment", "it", -1),
    ("Badge d'accès remis", "equipment", "hr", 0),
    ("Présentation à l'équipe et visite des locaux", "task", "manager", 0),
    ("Remise du règlement intérieur et des procédures", "document", "hr", 0),
    ("Fixation des objectifs de la période d'essai", "task", "manager", 7),
    ("Entretien de suivi de fin de période d'essai", "task", "manager", 80),
]

OFFBOARDING = [
    ("Entretien de départ", "task", "hr", -5),
    ("Passation des dossiers en cours", "handover", "manager", -3),
    ("Restitution de l'ordinateur portable", "equipment", "it", 0),
    ("Restitution du badge d'accès", "equipment", "hr", 0),
    ("Restitution du téléphone / clé USB / autres", "equipment", "it", 0),
    ("Désactivation du compte e-mail et des accès", "access", "it", 0),
    ("Retrait des accès aux locaux et véhicules", "access", "hr", 0),
    ("Solde de tout compte et documents de fin de contrat", "admin", "hr", 5),
    ("Archivage du dossier de l'employé", "admin", "hr", 10),
]

EVAL_QUESTIONS = [
    ("Objectifs", "Atteinte des objectifs fixés pour la période", "rating_1_5", 2),
    ("Objectifs", "Commentaire sur les objectifs", "text", 0),
    ("Compétences", "Qualité et fiabilité du travail", "rating_1_5", 1.5),
    ("Compétences", "Autonomie et prise d'initiative", "rating_1_5", 1),
    ("Compétences", "Respect des délais", "rating_1_5", 1),
    ("Compétences", "Travail en équipe et communication", "rating_1_5", 1),
    ("Bilan", "Points forts", "text", 0),
    ("Bilan", "Axes de progrès", "text", 0),
    ("Bilan", "Besoins de formation identifiés", "text", 0),
    ("Bilan", "Souhaite un entretien d'évolution", "yes_no", 0),
]


def seed(apps, schema_editor):
    LifecycleTemplate = apps.get_model("hr", "LifecycleTemplate")
    LifecycleTemplateItem = apps.get_model("hr", "LifecycleTemplateItem")
    EvaluationForm = apps.get_model("hr", "EvaluationForm")
    EvaluationQuestion = apps.get_model("hr", "EvaluationQuestion")

    for kind, name, rows in [
        ("onboarding", "Checklist d'intégration standard", ONBOARDING),
        ("offboarding", "Checklist de départ standard", OFFBOARDING),
    ]:
        tpl, _ = LifecycleTemplate.objects.update_or_create(
            kind=kind, name=name, defaults={"is_default": True}
        )
        LifecycleTemplateItem.objects.filter(template=tpl).delete()
        for order, (label, category, role, offset) in enumerate(rows):
            LifecycleTemplateItem.objects.create(
                template=tpl, label=label, category=category,
                responsible_role=role, due_offset_days=offset, order=order,
            )

    form, _ = EvaluationForm.objects.update_or_create(
        name="Évaluation de performance annuelle", defaults={"is_active": True}
    )
    EvaluationQuestion.objects.filter(form=form).delete()
    for order, (section, label, qtype, weight) in enumerate(EVAL_QUESTIONS):
        EvaluationQuestion.objects.create(
            form=form, section=section, label=label, type=qtype, weight=weight, order=order,
        )


def unseed(apps, schema_editor):
    apps.get_model("hr", "LifecycleTemplate").objects.filter(
        name__in=["Checklist d'intégration standard", "Checklist de départ standard"]
    ).delete()
    apps.get_model("hr", "EvaluationForm").objects.filter(
        name="Évaluation de performance annuelle"
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("hr", "0003_lifecycle_evaluation")]
    operations = [migrations.RunPython(seed, unseed)]
