from django.contrib import admin

from .models import Availability


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ("user", "kind", "start_date", "end_date", "created_at")
    list_filter = ("kind",)
    search_fields = ("user__email", "note")
