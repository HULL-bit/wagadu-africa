from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

api_v1 = [
    path("", include("apps.accounts.urls")),
    path("", include("apps.organization.urls")),
    path("", include("apps.permissions.urls")),
    path("", include("apps.audit.urls")),
    path("", include("apps.notifications.urls")),
    path("", include("apps.dashboard.urls")),
    path("", include("apps.validation.urls")),
    path("", include("apps.hr.urls")),
    path("", include("apps.correspondence.urls")),
    path("", include("apps.tasks.urls")),
    path("", include("apps.documents.urls")),
    path("", include("apps.agenda.urls")),
    path("", include("apps.meetings.urls")),
    path("", include("apps.integrations.urls")),
    path("", include("apps.messaging.urls")),
    path("", include("apps.projects.urls")),
    path("", include("apps.availability.urls")),
    path("", include("apps.demands.urls")),
    path("", include("apps.engagement.urls")),
    path("", include("apps.search.urls")),
    path("", include("apps.reports.urls")),
]

urlpatterns = [
    # /admin/* est réservé aux pages de l'app Next ; l'admin Django est isolé.
    path("django-admin/", admin.site.urls),
    path("api/v1/", include((api_v1, "api"), namespace="v1")),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/v1/schema/swagger/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

# En dev (stockage local), Django sert les fichiers média (avatars…).
# En production, MinIO/R2 génère ses propres URLs.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
