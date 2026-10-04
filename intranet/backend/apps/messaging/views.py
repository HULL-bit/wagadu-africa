from __future__ import annotations

from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import User

from .models import Channel, ChannelRead, Message
from .serializers import ChannelSerializer, MessageSerializer

PAGE = 40


class ChannelViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = ChannelSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Channel.objects.filter(members=self.request.user)
            .select_related("department")
            .prefetch_related("reads", Prefetch("messages", queryset=Message.objects.order_by("-created_at")))
            .distinct()
        )

    def _member_channel(self) -> Channel:
        return get_object_or_404(Channel.objects.filter(members=self.request.user), pk=self.kwargs["pk"])

    @action(detail=False, methods=["get"])
    def unread_total(self, request):
        total = sum(
            ChannelSerializer(c, context={"request": request}).get_unread(c)
            for c in self.get_queryset()
        )
        return Response({"count": total})

    @action(detail=False, methods=["post"], url_path="direct")
    def direct(self, request):
        other = get_object_or_404(User, pk=request.data.get("user"), is_active=True)
        if other == request.user:
            return Response({"detail": "Impossible de discuter avec soi-même."}, status=400)
        existing = (
            Channel.objects.filter(kind=Channel.Kind.DIRECT, members=request.user)
            .filter(members=other)
            .first()
        )
        channel = existing or Channel.objects.create(kind=Channel.Kind.DIRECT)
        if not existing:
            channel.members.add(request.user, other)
        return Response(ChannelSerializer(channel, context={"request": request}).data)

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        channel = self._member_channel()
        if request.method == "POST":
            body = (request.data.get("body") or "").strip()
            if not body:
                return Response({"body": ["Message vide."]}, status=400)
            msg = Message.objects.create(channel=channel, author=request.user, body=body[:5000])
            Channel.objects.filter(pk=channel.pk).update(last_message_at=timezone.now())
            ChannelRead.objects.update_or_create(
                channel=channel, user=request.user, defaults={"last_read_at": timezone.now()}
            )
            return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)

        qs = channel.messages.select_related("author")
        before = request.query_params.get("before")
        if before:
            qs = qs.filter(created_at__lt=before)
        rows = list(qs.order_by("-created_at")[:PAGE])[::-1]
        return Response(MessageSerializer(rows, many=True).data)

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        channel = self._member_channel()
        ChannelRead.objects.update_or_create(
            channel=channel, user=request.user, defaults={"last_read_at": timezone.now()}
        )
        return Response({"detail": "ok"})
