from __future__ import annotations

from django.http import JsonResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.audit.models import AuditAction, AuditSeverity
from apps.audit.services import audit_login, record
from apps.permissions.drf import HasPermission, IsSuperAdmin
from apps.permissions.services import effective_permissions

from .data_export import build_personal_export
from .models import User
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    MemberSerializer,
    MeSerializer,
    SelfServiceSerializer,
    UserSerializer,
    UserWriteSerializer,
)
from .services import (
    generate_totp_secret,
    set_password,
    totp_provisioning_uri,
    verify_totp,
)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = User.objects.filter(email__iexact=request.data.get("email")).first()
            if user:
                audit_login(user, request, success=True)
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            RefreshToken(request.data["refresh"]).blacklist()
        except (KeyError, TokenError):
            return Response(
                {"detail": "Jeton de rafraîchissement manquant ou invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        record(action=AuditAction.LOGOUT, module="accounts", actor=request.user,
               target=request.user, message="Déconnexion", request=request)
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)

    def patch(self, request):
        serializer = SelfServiceSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        changed = {
            k: {"after": v} for k, v in serializer.validated_data.items()
            if isinstance(v, (str, int, float, bool, type(None)))
        }
        record(action=AuditAction.UPDATE, module="accounts", actor=request.user,
               target=request.user, changes=changed,
               message="Mise à jour du profil (libre-service)", request=request)
        return Response(MeSerializer(request.user).data)


class MemberDirectoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Annuaire interne — accessible à tout membre authentifié."""

    serializer_class = MemberSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["department", "role"]
    search_fields = ["first_name", "last_name", "email", "job_title"]
    ordering = ["first_name", "last_name"]

    def get_queryset(self):
        return User.objects.filter(is_active=True).select_related("role", "department")


class PersonalDataExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payload = build_personal_export(request.user)
        record(action=AuditAction.EXPORT, module="accounts", actor=request.user,
               target=request.user, message="Export des données personnelles (RGPD)",
               severity=AuditSeverity.WARNING, confidential=True, request=request)
        resp = JsonResponse(payload, json_dumps_params={"ensure_ascii": False, "indent": 2})
        resp["Content-Disposition"] = 'attachment; filename="mes-donnees-wagadu-hub.json"'
        return resp


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "auth"

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        set_password(request.user, serializer.validated_data["new_password"])
        record(action=AuditAction.UPDATE, module="accounts", actor=request.user,
               target=request.user, message="Changement de mot de passe",
               severity=AuditSeverity.WARNING, request=request)
        return Response({"detail": "Mot de passe mis à jour."})


class TwoFactorView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "auth"

    def post(self, request, step: str):
        user = request.user
        if step == "enable":
            secret = generate_totp_secret()
            user.totp_secret = secret
            user.save(update_fields=["totp_secret"])
            return Response({
                "secret": secret,
                "otpauth_uri": totp_provisioning_uri(user, secret),
            })
        if step == "verify":
            code = request.data.get("code", "")
            if not verify_totp(user.totp_secret, code):
                return Response({"detail": "Code invalide."}, status=400)
            user.is_2fa_enabled = True
            user.save(update_fields=["is_2fa_enabled"])
            record(action=AuditAction.UPDATE, module="accounts", actor=user, target=user,
                   message="Activation de la 2FA", severity=AuditSeverity.WARNING,
                   confidential=True, request=request)
            return Response({"detail": "2FA activée."})
        if step == "disable":
            code = request.data.get("code", "")
            if user.is_2fa_enabled and not verify_totp(user.totp_secret, code):
                return Response({"detail": "Code invalide."}, status=400)
            user.is_2fa_enabled = False
            user.totp_secret = ""
            user.save(update_fields=["is_2fa_enabled", "totp_secret"])
            record(action=AuditAction.UPDATE, module="accounts", actor=user, target=user,
                   message="Désactivation de la 2FA", severity=AuditSeverity.WARNING,
                   confidential=True, notify_admins=True, request=request)
            return Response({"detail": "2FA désactivée."})
        return Response({"detail": "Étape inconnue."}, status=404)


class UserViewSet(viewsets.ModelViewSet):
    """Administration des comptes (section 2.9 / 4.2)."""

    queryset = User.objects.select_related("role", "department", "manager").all()
    filterset_fields = ["role", "department", "status", "is_active"]
    search_fields = ["email", "first_name", "last_name"]
    ordering_fields = ["email", "created_at"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return UserWriteSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "effective_permissions"):
            return [IsAuthenticated(), HasPermission.of("accounts.view")()]
        return [IsAuthenticated(), HasPermission.of("accounts.manage")()]

    def _guard_admin_target(self, request, *, target: User | None, incoming_role_slug: str | None):
        """Seul un Super Admin peut créer/modifier un compte administrateur."""
        touches_admin = bool(
            (target and target.is_admin_account)
            or incoming_role_slug == "admin"
            or request.data.get("is_super_admin")
        )
        if touches_admin and not request.user.is_super_admin:
            raise PermissionDenied(
                "Seul un Super Administrateur peut gérer un compte administrateur."
            )

    def _incoming_role_slug(self, request) -> str | None:
        from apps.permissions.models import Role

        role_id = request.data.get("role")
        if not role_id:
            return None
        return Role.objects.filter(pk=role_id).values_list("slug", flat=True).first()

    def perform_create(self, serializer):
        self._guard_admin_target(
            self.request, target=None,
            incoming_role_slug=self._incoming_role_slug(self.request),
        )
        user = serializer.save()
        record(action=AuditAction.CREATE, module="accounts", actor=self.request.user,
               target=user, message=f"Création du compte {user.email}",
               request=self.request)
        # Tout compte collaborateur figure dans l'effectif RH.
        try:
            from apps.hr.signals import ensure_employee_fiche
            ensure_employee_fiche(user)
        except Exception:  # pragma: no cover - la fiche pourra être créée à la main
            pass

    def perform_update(self, serializer):
        self._guard_admin_target(
            self.request, target=self.get_object(),
            incoming_role_slug=self._incoming_role_slug(self.request),
        )
        serializer.save()

    def perform_destroy(self, instance):
        if instance.is_admin_account and not self.request.user.is_super_admin:
            raise PermissionDenied(
                "Seul un Super Administrateur peut supprimer un compte administrateur."
            )
        if instance.is_super_admin:
            raise PermissionDenied("Un compte Super Administrateur ne peut pas être supprimé via l'API.")
        # Suppression douce : on suspend plutôt que d'effacer.
        instance.is_active = False
        instance.status = "suspended"
        instance.save(update_fields=["is_active", "status"])
        record(action=AuditAction.UPDATE, module="accounts", actor=self.request.user,
               target=instance, message="Compte suspendu (suppression douce)",
               severity=AuditSeverity.WARNING, request=self.request)

    @action(detail=True, methods=["get"], url_path="effective-permissions")
    def effective_permissions(self, request, pk=None):
        return Response(effective_permissions(self.get_object()))

    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        target = self.get_object()
        self._guard_admin_target(request, target=target, incoming_role_slug=None)
        new_password = request.data.get("new_password")
        if not new_password:
            return Response({"detail": "new_password requis."}, status=400)
        set_password(target, new_password)
        record(action=AuditAction.UPDATE, module="accounts", actor=request.user,
               target=target, message="Réinitialisation du mot de passe par un administrateur",
               severity=AuditSeverity.WARNING, confidential=True, notify_admins=True,
               request=request)
        return Response({"detail": "Mot de passe réinitialisé."})

    @action(detail=True, methods=["post"], url_path="unlock",
            permission_classes=[IsAuthenticated, IsSuperAdmin])
    def unlock(self, request, pk=None):
        target = self.get_object()
        target.locked_until = None
        target.failed_login_count = 0
        target.save(update_fields=["locked_until", "failed_login_count"])
        record(action=AuditAction.UPDATE, module="accounts", actor=request.user,
               target=target, message="Déverrouillage manuel du compte", request=request)
        return Response({"detail": "Compte déverrouillé."})
