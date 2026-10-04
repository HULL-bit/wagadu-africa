from django.contrib import admin

from .models import ChatAccount, ChatChannel


@admin.register(ChatAccount)
class ChatAccountAdmin(admin.ModelAdmin):
    list_display = ("user", "rc_username", "rc_user_id", "provisioned_at")
    search_fields = ("user__email", "rc_username")


@admin.register(ChatChannel)
class ChatChannelAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "department", "team", "rc_room_id", "is_default")
    list_filter = ("kind",)
