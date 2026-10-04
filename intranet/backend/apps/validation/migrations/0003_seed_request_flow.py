"""Circuit standard des demandes transverses : responsable → administrateur."""
from django.db import migrations


def seed(apps, schema_editor):
    ValidationFlow = apps.get_model("validation", "ValidationFlow")
    ValidationStep = apps.get_model("validation", "ValidationStep")
    Role = apps.get_model("permissions", "Role")

    flow, _ = ValidationFlow.objects.update_or_create(
        code="demande-standard",
        defaults={
            "label": "Validation standard des demandes",
            "description": "Étape 1 : responsable hiérarchique. Étape 2 : administrateur.",
            "is_active": True,
        },
    )
    ValidationStep.objects.filter(flow=flow).delete()
    ValidationStep.objects.create(
        flow=flow, order=1, label="Validation du responsable hiérarchique",
        approver_type="manager", skip_if_unresolved=True,
    )
    admin_role = Role.objects.filter(slug="admin").first()
    ValidationStep.objects.create(
        flow=flow, order=2, label="Validation de l'administration",
        approver_type="role", approver_role=admin_role, skip_if_unresolved=False,
    )


def unseed(apps, schema_editor):
    apps.get_model("validation", "ValidationFlow").objects.filter(code="demande-standard").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("validation", "0002_seed_leave_flow"),
        ("permissions", "0006_phase5_catalog"),
    ]
    operations = [migrations.RunPython(seed, unseed)]
