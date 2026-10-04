from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.permissions.drf import HasPermission

from .models import Department, Team, TeamMembership
from .serializers import (
    DepartmentSerializer,
    TeamMembershipSerializer,
    TeamSerializer,
)


class _OrgViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), HasPermission.of("organization.view")()]
        return [IsAuthenticated(), HasPermission.of("organization.manage")()]


class DepartmentViewSet(_OrgViewSet):
    queryset = Department.objects.all().prefetch_related("children")
    serializer_class = DepartmentSerializer
    search_fields = ["name", "code"]
    ordering_fields = ["name", "created_at"]


class TeamViewSet(_OrgViewSet):
    queryset = Team.objects.select_related("department", "lead").prefetch_related(
        "memberships__user"
    )
    serializer_class = TeamSerializer
    filterset_fields = ["department"]
    search_fields = ["name"]


class TeamMembershipViewSet(_OrgViewSet):
    queryset = TeamMembership.objects.select_related("team", "user")
    serializer_class = TeamMembershipSerializer
    filterset_fields = ["team", "user"]
