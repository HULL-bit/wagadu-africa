"""Amorçage du catalogue de permissions et des rôles système (section 4.2)."""
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
            defaults={
                "name": spec["name"],
                "description": spec["description"],
                "is_system": True,
            },
        )
        RolePermission.objects.filter(role=role).delete()
        perms = Permission.objects.filter(code__in=spec["permissions"])
        RolePermission.objects.bulk_create(
            [RolePermission(role=role, permission=p) for p in perms]
        )


def unseed(apps, schema_editor):
    Role = apps.get_model("permissions", "Role")
    Permission = apps.get_model("permissions", "Permission")
    Role.objects.filter(slug__in=SYSTEM_ROLES.keys()).delete()
    Permission.objects.filter(
        code__in=[c for c, _, _ in PERMISSION_CATALOG]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("permissions", "0001_initial")]
    operations = [migrations.RunPython(seed, unseed)]
