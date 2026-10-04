"""Moteur de calcul de la *permission effective* d'un utilisateur.

Règle (section 4.3 du cahier des charges) :

1. Super Administrateur → toujours autorisé.
2. socle = permission présente dans le rôle de l'utilisateur.
3. exceptions individuelles applicables au périmètre demandé :
   - une exception ``deny`` applicable  → refus (le deny l'emporte) ;
   - sinon une exception ``grant``      → autorisation ;
   - sinon                              → on retombe sur le socle.
"""
from __future__ import annotations

from dataclasses import dataclass

from .models import OverrideEffect, ScopeType, UserPermissionOverride


@dataclass(frozen=True)
class Scope:
    """Périmètre d'évaluation d'une permission."""

    module: str | None = None
    department_id: str | None = None
    project_id: str | None = None

    def matches(self, override: UserPermissionOverride) -> bool:
        if override.scope_type == ScopeType.GLOBAL:
            return True
        if override.scope_type == ScopeType.MODULE:
            return bool(self.module) and override.scope_id == str(self.module)
        if override.scope_type == ScopeType.DEPARTMENT:
            return bool(self.department_id) and override.scope_id == str(self.department_id)
        if override.scope_type == ScopeType.PROJECT:
            return bool(self.project_id) and override.scope_id == str(self.project_id)
        return False


EMPTY_SCOPE = Scope()


def _role_codes(user) -> set[str]:
    role = getattr(user, "role", None)
    if role is None:
        return set()
    return role.permission_codes


def has_permission(user, code: str, scope: Scope | None = None) -> bool:
    if user is None or not getattr(user, "is_authenticated", False):
        return False
    if not user.is_active:
        return False
    if getattr(user, "is_super_admin", False):
        return True

    scope = scope or EMPTY_SCOPE
    base = code in _role_codes(user)

    overrides = [
        ov
        for ov in UserPermissionOverride.objects.active()
        .filter(user=user, permission__code=code)
        .select_related("permission")
        if scope.matches(ov)
    ]
    if any(ov.effect == OverrideEffect.DENY for ov in overrides):
        return False
    if any(ov.effect == OverrideEffect.GRANT for ov in overrides):
        return True
    return base


def effective_permissions(user) -> dict[str, dict]:
    """Vue de synthèse « permissions effectives » (section 4.3).

    Retourne, pour chaque code de permission, l'origine de la décision :
    ``role``, ``grant``, ``deny`` ou ``super_admin``.
    """
    from .models import Permission

    result: dict[str, dict] = {}
    role_codes = _role_codes(user)
    is_super = getattr(user, "is_super_admin", False)

    active_overrides = list(
        UserPermissionOverride.objects.active()
        .filter(user=user)
        .select_related("permission")
    )
    overrides_by_code: dict[str, list[UserPermissionOverride]] = {}
    for ov in active_overrides:
        overrides_by_code.setdefault(ov.permission.code, []).append(ov)

    for perm in Permission.objects.all():
        code = perm.code
        ovs = overrides_by_code.get(code, [])
        from_role = code in role_codes

        if is_super:
            granted, source = True, "super_admin"
        elif any(o.effect == OverrideEffect.DENY for o in ovs):
            granted, source = False, "deny"
        elif any(o.effect == OverrideEffect.GRANT for o in ovs):
            granted, source = True, "grant"
        else:
            granted, source = from_role, "role"

        result[code] = {
            "label": perm.label,
            "module": perm.module,
            "granted": granted,
            "source": source,
            "from_role": from_role,
            "overrides": [
                {
                    "id": o.id,
                    "effect": o.effect,
                    "scope_type": o.scope_type,
                    "scope_id": o.scope_id,
                }
                for o in ovs
            ],
        }
    return result
