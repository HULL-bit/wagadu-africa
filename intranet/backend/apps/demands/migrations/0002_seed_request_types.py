"""Types de demandes transverses de base (§2.10)."""
from django.db import migrations

TYPES = [
    {
        "code": "achat",
        "label": "Demande d'achat / matériel",
        "icon": "🛒",
        "form_schema": [
            {"key": "designation", "label": "Désignation", "type": "text", "required": True},
            {"key": "quantite", "label": "Quantité", "type": "number", "required": True},
            {"key": "montant_estime", "label": "Montant estimé (FCFA)", "type": "number", "required": True},
            {"key": "justification", "label": "Justification", "type": "textarea", "required": True},
        ],
    },
    {
        "code": "mission",
        "label": "Demande de mission / déplacement",
        "icon": "✈️",
        "form_schema": [
            {"key": "destination", "label": "Destination", "type": "text", "required": True},
            {"key": "date_depart", "label": "Date de départ", "type": "date", "required": True},
            {"key": "date_retour", "label": "Date de retour", "type": "date", "required": True},
            {"key": "objet", "label": "Objet de la mission", "type": "textarea", "required": True},
            {"key": "budget_estime", "label": "Budget estimé (FCFA)", "type": "number", "required": False},
        ],
    },
    {
        "code": "remboursement",
        "label": "Demande de remboursement de frais",
        "icon": "🧾",
        "form_schema": [
            {"key": "nature", "label": "Nature des frais", "type": "select", "required": True,
             "options": ["Transport", "Hébergement", "Restauration", "Fournitures", "Autre"]},
            {"key": "montant", "label": "Montant (FCFA)", "type": "number", "required": True},
            {"key": "date_depense", "label": "Date de la dépense", "type": "date", "required": True},
            {"key": "commentaire", "label": "Commentaire", "type": "textarea", "required": False},
        ],
    },
]


def seed(apps, schema_editor):
    RequestType = apps.get_model("demands", "RequestType")
    ValidationFlow = apps.get_model("validation", "ValidationFlow")
    flow = ValidationFlow.objects.get(code="demande-standard")
    for spec in TYPES:
        RequestType.objects.update_or_create(
            code=spec["code"],
            defaults={
                "label": spec["label"], "icon": spec["icon"],
                "form_schema": spec["form_schema"], "flow": flow, "is_active": True,
            },
        )


def unseed(apps, schema_editor):
    apps.get_model("demands", "RequestType").objects.filter(
        code__in=[t["code"] for t in TYPES]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("demands", "0001_initial"),
        ("validation", "0003_seed_request_flow"),
    ]
    operations = [migrations.RunPython(seed, unseed)]
