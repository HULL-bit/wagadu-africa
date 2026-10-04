from django.contrib import admin

from .models import Request, RequestAttachment, RequestComment, RequestType


class RequestAttachmentInline(admin.TabularInline):
    model = RequestAttachment
    extra = 0


@admin.register(RequestType)
class RequestTypeAdmin(admin.ModelAdmin):
    list_display = ("code", "label", "flow", "is_active")


@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
    list_display = ("reference", "type", "requester", "status", "created_at")
    list_filter = ("status", "type")
    search_fields = ("reference", "title")
    date_hierarchy = "created_at"
    inlines = [RequestAttachmentInline]
    readonly_fields = ("reference",)


admin.site.register(RequestComment)
