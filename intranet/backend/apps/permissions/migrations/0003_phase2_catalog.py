"""Phase 2 : nouvelles permissions (RH export, courrier) + rafraîchissement
des socles des rôles système."""
from django.db import migrations

from apps.permissions.constants import PERMISSION_CATALOG, SYSTEM_ROLES


def seed(apps, schema_editor):
    Permission = apps.get_model("permissions", "Permission")
    Role = apps.get_model("permissions", "Role")
    RolePermission = apps.get_model("permissions", "RolePermission")

    for code, label, module in PERMISSION_CATALOG:
        Permission.objects.update_or_create(
            code=code, defaults={"label": label, "module": module}
        )

    for slug, spec in SYSTEM_ROLES.items():
        role, _ = Role.objects.update_or_create(
            slug=slug,
            defaults={"name": spec["name"], "description": spec["description"], "is_system": True},
        )
        RolePermission.objects.filter(role=role).delete()
        perms = Permission.objects.filter(code__in=spec["permissions"])
        RolePermission.objects.bulk_create(
            [RolePermission(role=role, permission=p) for p in perms]
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [("permissions", "0002_seed_catalog")]
    operations = [migrations.RunPython(seed, noop)]
