from django.contrib import admin

from .models import CalendarEvent, EventAttendee, EventReminder


class EventAttendeeInline(admin.TabularInline):
    model = EventAttendee
    extra = 0


class EventReminderInline(admin.TabularInline):
    model = EventReminder
    extra = 0


@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "type", "start", "end", "visibility")
    list_filter = ("type", "visibility")
    search_fields = ("title", "description")
    date_hierarchy = "start"
    inlines = [EventAttendeeInline, EventReminderInline]
