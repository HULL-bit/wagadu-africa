from rest_framework.routers import DefaultRouter

from .views import ChannelViewSet

router = DefaultRouter()
router.register("messaging/channels", ChannelViewSet, basename="messaging-channels")

urlpatterns = router.urls
