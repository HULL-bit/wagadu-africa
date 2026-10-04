from rest_framework.routers import DefaultRouter

from .views import MeetingPollViewSet, MeetingViewSet

router = DefaultRouter()
router.register("meetings", MeetingViewSet, basename="meetings")
router.register("meeting-polls", MeetingPollViewSet, basename="meeting-polls")

urlpatterns = router.urls
