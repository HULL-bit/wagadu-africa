"""Crée une fiche employé pour chaque compte collaborateur actif sans fiche."""
from django.db import migrations


def backfill(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    Employee = apps.get_model("hr", "Employee")

    existing = set(Employee.objects.values_list("user_id", flat=True))
    n = Employee.objects.count()
    to_create = []
    for user in User.objects.filter(is_active=True, is_super_admin=False).exclude(id__in=existing):
        n += 1
        to_create.append(Employee(
            user_id=user.id,
            matricule=f"WA-{n:04d}",
            job_title=getattr(user, "job_title", "") or "",
            hr_status="active",
        ))
    Employee.objects.bulk_create(to_create)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("hr", "0004_seed_lifecycle_evaluation"),
        ("accounts", "0003_user_profile"),
    ]
    operations = [migrations.RunPython(backfill, noop)]
