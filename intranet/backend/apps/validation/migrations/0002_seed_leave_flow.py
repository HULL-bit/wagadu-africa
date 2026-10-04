"""Circuit de validation des congés : manager direct puis RH (décision projet)."""
from django.db import migrations


def seed(apps, schema_editor):
    ValidationFlow = apps.get_model("validation", "ValidationFlow")
    ValidationStep = apps.get_model("validation", "ValidationStep")
    Role = apps.get_model("permissions", "Role")

    flow, _ = ValidationFlow.objects.update_or_create(
        code="conges",
        defaults={
            "label": "Validation des demandes de congé",
            "description": "Étape 1 : responsable hiérarchique. Étape 2 : RH.",
            "is_active": True,
        },
    )
    ValidationStep.objects.filter(flow=flow).delete()
    ValidationStep.objects.create(
        flow=flow, order=1, label="Validation du responsable hiérarchique",
        approver_type="manager", skip_if_unresolved=True,
    )
    rh_role = Role.objects.filter(slug="rh").first()
    ValidationStep.objects.create(
        flow=flow, order=2, label="Confirmation RH",
        approver_type="role", approver_role=rh_role, skip_if_unresolved=False,
    )


def unseed(apps, schema_editor):
    apps.get_model("validation", "ValidationFlow").objects.filter(code="conges").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("validation", "0001_initial"),
        ("permissions", "0003_phase2_catalog"),
    ]
    operations = [migrations.RunPython(seed, unseed)]
