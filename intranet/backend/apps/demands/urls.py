from rest_framework.routers import DefaultRouter

from .views import (
    RequestAttachmentViewSet,
    RequestCommentViewSet,
    RequestTypeViewSet,
    RequestViewSet,
)

router = DefaultRouter()
router.register("request-types", RequestTypeViewSet, basename="request-types")
router.register("requests", RequestViewSet, basename="requests")
router.register("request-attachments", RequestAttachmentViewSet, basename="request-attachments")
router.register("request-comments", RequestCommentViewSet, basename="request-comments")

urlpatterns = router.urls
