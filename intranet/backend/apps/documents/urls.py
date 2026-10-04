from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    DocumentDistributionViewSet,
    DocumentViewSet,
    FolderViewSet,
    PublicShareView,
)

router = DefaultRouter()
router.register("documents/folders", FolderViewSet, basename="document-folders")
router.register("documents", DocumentViewSet, basename="documents")
router.register("document-distributions", DocumentDistributionViewSet, basename="document-distributions")

urlpatterns = [
    path("public/share/<str:token>/", PublicShareView.as_view(), name="public-share"),
    *router.urls,
]
