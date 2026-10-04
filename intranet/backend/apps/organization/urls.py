from rest_framework.routers import DefaultRouter

from .views import DepartmentViewSet, TeamMembershipViewSet, TeamViewSet

router = DefaultRouter()
router.register("departments", DepartmentViewSet)
router.register("teams", TeamViewSet)
router.register("team-memberships", TeamMembershipViewSet)

urlpatterns = router.urls
