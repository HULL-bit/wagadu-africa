from __future__ import annotations

from datetime import date

from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from .models import Availability
from .serializers import AvailabilitySerializer


class AvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = AvailabilitySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["user", "kind"]

    def get_queryset(self):
        qs = Availability.objects.select_related("user")
        params = self.request.query_params
        if params.get("scope") == "mine":
            qs = qs.filter(user=self.request.user)
        if params.get("upcoming") == "1":
            qs = qs.filter(end_date__gte=date.today())
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def _own(self, instance):
        if instance.user_id != self.request.user.id and not self.request.user.is_super_admin:
            raise PermissionDenied("Vous ne pouvez modifier que vos propres disponibilités.")

    def perform_update(self, serializer):
        self._own(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._own(instance)
        instance.delete()
