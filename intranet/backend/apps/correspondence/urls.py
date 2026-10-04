from rest_framework.routers import DefaultRouter

from .views import (
    MailAttachmentViewSet,
    MailCategoryViewSet,
    MailTemplateViewSet,
    MailViewSet,
)

router = DefaultRouter()
router.register("mail/categories", MailCategoryViewSet, basename="mail-categories")
router.register("mail/templates", MailTemplateViewSet, basename="mail-templates")
router.register("mail/attachments", MailAttachmentViewSet, basename="mail-attachments")
router.register("mail", MailViewSet, basename="mail")

urlpatterns = router.urls
