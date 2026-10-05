from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve as serve_static
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
    path("", include("apps.system.urls")),
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

# Tant qu'aucun stockage S3/R2 n'est configuré (MINIO_ACCESS_KEY vide),
# settings.base bascule sur FileSystemStorage — y compris en production
# (voir STORAGES dans settings/base.py). Dans ce cas, c'est Django qui doit
# servir /media/ (avatars, pièces jointes...), sinon les fichiers uploadés
# sont bien écrits sur disque mais jamais accessibles (404 côté navigateur).
# `django.conf.urls.static.static()` refuse de servir quoi que ce soit hors
# DEBUG (no-op silencieux) — on appelle donc directement la vue `serve`.
# Si MinIO/R2 est configuré, django-storages génère ses propres URLs
# signées et ce bloc ne sert plus à rien (inoffensif de le garder).
if settings.STORAGES["default"]["BACKEND"] == "django.core.files.storage.FileSystemStorage":
    urlpatterns += [
        re_path(
            r"^media/(?P<path>.*)$",
            serve_static,
            {"document_root": settings.MEDIA_ROOT},
        ),
    ]
