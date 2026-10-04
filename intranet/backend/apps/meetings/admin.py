from django.contrib import admin

from .models import (
    Meeting,
    MeetingParticipant,
    MeetingPoll,
    MeetingPollOption,
)


class MeetingParticipantInline(admin.TabularInline):
    model = MeetingParticipant
    extra = 0


class PollOptionInline(admin.TabularInline):
    model = MeetingPollOption
    extra = 0


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ("title", "organizer", "start", "status", "access")
    list_filter = ("status", "access")
    search_fields = ("title", "description")
    date_hierarchy = "start"
    inlines = [MeetingParticipantInline]
    readonly_fields = ("room_slug",)


@admin.register(MeetingPoll)
class MeetingPollAdmin(admin.ModelAdmin):
    list_display = ("question", "meeting", "is_open")
    inlines = [PollOptionInline]
