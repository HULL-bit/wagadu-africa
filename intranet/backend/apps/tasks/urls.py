from rest_framework.routers import DefaultRouter

from .views import (
    ChecklistItemViewSet,
    RecurringTaskTemplateViewSet,
    SubmissionAttachmentViewSet,
    TaskAttachmentViewSet,
    TaskCommentViewSet,
    TaskLabelViewSet,
    TaskViewSet,
)

router = DefaultRouter()
router.register("tasks", TaskViewSet, basename="tasks")
router.register("task-comments", TaskCommentViewSet, basename="task-comments")
router.register("task-checklist-items", ChecklistItemViewSet, basename="task-checklist-items")
router.register("task-labels", TaskLabelViewSet, basename="task-labels")
router.register("task-attachments", TaskAttachmentViewSet, basename="task-attachments")
router.register("task-submission-attachments", SubmissionAttachmentViewSet, basename="task-submission-attachments")
router.register("recurring-tasks", RecurringTaskTemplateViewSet, basename="recurring-tasks")

urlpatterns = router.urls
