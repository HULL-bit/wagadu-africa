from rest_framework.routers import DefaultRouter

from .views import AnnouncementViewSet, PollViewSet

router = DefaultRouter()
router.register("announcements", AnnouncementViewSet, basename="announcements")
router.register("polls", PollViewSet, basename="polls")

urlpatterns = router.urls
