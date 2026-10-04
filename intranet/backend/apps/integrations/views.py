from __future__ import annotations

from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatChannel
from .rocketchat import RocketChatError, is_configured
from .serializers import ChatChannelSerializer
from .services import issue_sso_token


class ChatStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.meetings.jitsi import has_jwt
        from apps.meetings.jitsi import is_configured as jitsi_ok

        return Response({
            "rocketchat": {"configured": is_configured()},
            "jitsi": {"configured": jitsi_ok(), "jwt": has_jwt()},
        })


class ChatSSOView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "auth"

    def post(self, request):
        if not is_configured():
            return Response({"detail": "Messagerie non configurée."}, status=503)
        try:
            return Response(issue_sso_token(request.user))
        except RocketChatError as exc:
            return Response({"detail": str(exc)}, status=502)


class ChatChannelViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = ChatChannel.objects.select_related("department", "team").all()
    serializer_class = ChatChannelSerializer
    permission_classes = [IsAuthenticated]
