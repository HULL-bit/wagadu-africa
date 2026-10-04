"""Classes de permission DRF adossées au moteur de permission effective."""
from __future__ import annotations

from rest_framework.permissions import BasePermission

from .services import Scope, has_permission


class HasPermission(BasePermission):
    """Vérifie une permission effective côté serveur.

    Usage ::

        class MaVue(APIView):
            permission_classes = [IsAuthenticated, HasPermission.of("tasks.assign")]
    """

    required_code: str | None = None
    scope_module: str | None = None

    @classmethod
    def of(cls, code: str, *, module: str | None = None) -> type[HasPermission]:
        return type(
            f"HasPermission_{code.replace('.', '_')}",
            (cls,),
            {"required_code": code, "scope_module": module},
        )

    def has_permission(self, request, view) -> bool:
        code = self.required_code or getattr(view, "required_permission", None)
        if code is None:
            return True
        scope = Scope(module=self.scope_module)
        return has_permission(request.user, code, scope)


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "is_super_admin", False)
        )
