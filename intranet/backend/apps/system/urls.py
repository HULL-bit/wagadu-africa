from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DatabaseExportView, IncidentViewSet, SystemHealthView

router = DefaultRouter()
router.register("system/incidents", IncidentViewSet, basename="system-incidents")

urlpatterns = router.urls + [
    path("system/health/", SystemHealthView.as_view(), name="system-health"),
    path("system/database/export/", DatabaseExportView.as_view(), name="system-database-export"),
]
