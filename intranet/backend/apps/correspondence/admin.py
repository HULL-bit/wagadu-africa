from django.contrib import admin

from .models import (
    Mail,
    MailAcknowledgement,
    MailAttachment,
    MailCategory,
    MailEvent,
    MailTemplate,
    NumberingScheme,
)


class MailAttachmentInline(admin.TabularInline):
    model = MailAttachment
    extra = 0


class MailEventInline(admin.TabularInline):
    model = MailEvent
    extra = 0
    readonly_fields = ("actor", "type", "detail", "created_at")


@admin.register(Mail)
class MailAdmin(admin.ModelAdmin):
    list_display = ("reference", "direction", "subject", "correspondent", "status", "assigned_to", "registered_at")
    list_filter = ("direction", "status", "confidentiality", "category")
    search_fields = ("reference", "subject", "correspondent")
    date_hierarchy = "registered_at"
    inlines = [MailAttachmentInline, MailEventInline]
    readonly_fields = ("reference", "registered_by", "registered_at")


@admin.register(MailCategory)
class MailCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "keywords")


@admin.register(NumberingScheme)
class NumberingSchemeAdmin(admin.ModelAdmin):
    list_display = ("direction", "year", "scope", "department", "counter")


admin.site.register(MailTemplate)
admin.site.register(MailAcknowledgement)
