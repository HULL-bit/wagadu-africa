from rest_framework.routers import DefaultRouter

from .views import (
    PermissionViewSet,
    RoleViewSet,
    UserPermissionOverrideViewSet,
)

router = DefaultRouter()
router.register("permissions", PermissionViewSet, basename="permissions")
router.register("roles", RoleViewSet, basename="roles")
router.register(
    "permission-overrides", UserPermissionOverrideViewSet, basename="permission-overrides"
)

urlpatterns = router.urls
