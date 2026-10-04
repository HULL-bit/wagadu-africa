from django.contrib import admin

from .models import (
    Document,
    DocumentDistribution,
    DocumentRecipient,
    DocumentVersion,
    Folder,
    ShareLink,
)


class DocumentVersionInline(admin.TabularInline):
    model = DocumentVersion
    extra = 0
    readonly_fields = ("version_number", "size", "content_type", "uploaded_by", "uploaded_at")


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "folder", "owner", "is_in_library", "visibility", "deleted_at")
    list_filter = ("is_in_library", "visibility")
    search_fields = ("title", "description", "keywords")
    inlines = [DocumentVersionInline]


@admin.register(DocumentDistribution)
class DocumentDistributionAdmin(admin.ModelAdmin):
    list_display = ("document", "mode", "sent_by", "sent_at", "read_count", "total_count")
    list_filter = ("mode",)


@admin.register(ShareLink)
class ShareLinkAdmin(admin.ModelAdmin):
    list_display = ("document", "token", "created_by", "expires_at", "download_count", "is_revoked")


admin.site.register(Folder)
admin.site.register(DocumentRecipient)
