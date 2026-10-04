from __future__ import annotations

from rest_framework import serializers

from .models import (
    ChecklistItem,
    RecurringTaskTemplate,
    Task,
    TaskAssignment,
    TaskAttachment,
    TaskComment,
    TaskLabel,
    TaskSubmission,
    TaskSubmissionAttachment,
)


class TaskLabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskLabel
        fields = ["id", "name", "color"]


class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = ["id", "task", "label", "order", "is_done", "done_by", "done_at"]
        read_only_fields = ["done_by", "done_at"]


class TaskAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAttachment
        fields = ["id", "task", "file", "label", "uploaded_by", "uploaded_at"]
        read_only_fields = ["uploaded_by", "uploaded_at"]


class TaskCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)

    class Meta:
        model = TaskComment
        fields = ["id", "task", "author", "author_name", "body", "created_at"]
        read_only_fields = ["author", "created_at"]


class SubmissionAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskSubmissionAttachment
        fields = ["id", "submission", "file", "uploaded_at"]
        read_only_fields = ["uploaded_at"]


class TaskSubmissionSerializer(serializers.ModelSerializer):
    submitter_name = serializers.CharField(source="submitted_by.get_full_name", read_only=True)
    attachments = SubmissionAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = TaskSubmission
        fields = [
            "id", "task", "submitted_by", "submitter_name", "report", "declared_hours",
            "status", "review_comment", "reviewed_by", "submitted_at", "reviewed_at",
            "attachments",
        ]
        read_only_fields = fields


class TaskAssignmentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = TaskAssignment
        fields = [
            "id", "user", "user_name", "user_email", "progress_status",
            "declared_hours", "assigned_at",
        ]
        read_only_fields = fields


class TaskSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    assignments = TaskAssignmentSerializer(many=True, read_only=True)
    labels_detail = TaskLabelSerializer(source="labels", many=True, read_only=True)
    checklist = ChecklistItemSerializer(many=True, read_only=True)
    attachments = TaskAttachmentSerializer(many=True, read_only=True)
    comments = TaskCommentSerializer(many=True, read_only=True)
    submissions = TaskSubmissionSerializer(many=True, read_only=True)
    subtasks = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = Task
        fields = [
            "id", "title", "description", "priority", "priority_display",
            "status", "status_display", "created_by", "created_by_name",
            "assigned_department", "assigned_team", "project", "labels", "labels_detail",
            "parent", "start_at", "due_at", "estimated_hours", "is_overdue",
            "assignments", "checklist", "attachments", "comments", "submissions",
            "subtasks", "created_at", "closed_at",
        ]
        read_only_fields = ["status", "created_by", "created_at", "closed_at"]

    def get_subtasks(self, obj):
        return TaskBriefSerializer(obj.subtasks.all(), many=True).data


class TaskBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ["id", "title", "status", "priority", "due_at"]


class TaskWriteSerializer(serializers.ModelSerializer):
    assignee_ids = serializers.ListField(child=serializers.UUIDField(), required=False, write_only=True)
    label_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)

    class Meta:
        model = Task
        fields = [
            "id", "title", "description", "priority", "assigned_department",
            "assigned_team", "project", "parent", "start_at", "due_at", "estimated_hours",
            "assignee_ids", "label_ids",
        ]


class RecurringTaskTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecurringTaskTemplate
        fields = [
            "id", "title", "description", "priority", "estimated_hours",
            "frequency", "interval", "weekday", "day_of_month", "due_time",
            "lead_time_days", "default_assignees", "assigned_department",
            "assigned_team", "is_active", "next_due_date", "created_at",
        ]
        read_only_fields = ["created_at"]
