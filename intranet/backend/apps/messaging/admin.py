from django.contrib import admin

from .models import Channel, Message


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display = ("__str__", "kind", "department", "last_message_at")
    list_filter = ("kind",)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("channel", "author", "created_at")
    list_filter = ("channel",)
    search_fields = ("body",)
