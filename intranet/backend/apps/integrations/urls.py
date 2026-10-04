from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ChatChannelViewSet, ChatSSOView, ChatStatusView

router = DefaultRouter()
router.register("chat/channels", ChatChannelViewSet, basename="chat-channels")

urlpatterns = [
    path("integrations/status/", ChatStatusView.as_view(), name="integrations-status"),
    path("chat/sso/", ChatSSOView.as_view(), name="chat-sso"),
    *router.urls,
]
