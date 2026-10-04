from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AgendaFeedView,
    CalendarEventViewSet,
    ICalExportView,
    ICalImportView,
    TeamAgendaView,
)

router = DefaultRouter()
router.register("agenda/events", CalendarEventViewSet, basename="agenda-events")

urlpatterns = [
    path("agenda/", AgendaFeedView.as_view(), name="agenda-feed"),
    path("agenda/team/", TeamAgendaView.as_view(), name="agenda-team"),
    path("agenda/export.ics", ICalExportView.as_view(), name="agenda-export"),
    path("agenda/import/", ICalImportView.as_view(), name="agenda-import"),
    *router.urls,
]
