from django.contrib import admin

from .models import Announcement, Poll, PollOption


class PollOptionInline(admin.TabularInline):
    model = PollOption
    extra = 2


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "pinned", "audience", "publish_at", "expires_at")
    list_filter = ("pinned", "audience")


@admin.register(Poll)
class PollAdmin(admin.ModelAdmin):
    list_display = ("question", "created_by", "is_open", "multiple_choice", "created_at")
    list_filter = ("is_open",)
    inlines = [PollOptionInline]
