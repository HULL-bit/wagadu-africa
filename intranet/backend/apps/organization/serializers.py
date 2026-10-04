from rest_framework import serializers

from .models import Department, Team, TeamMembership


class DepartmentSerializer(serializers.ModelSerializer):
    children = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Department
        fields = [
            "id", "name", "code", "parent", "head", "description",
            "children", "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class TeamMembershipSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamMembership
        fields = ["id", "team", "user", "role_in_team", "joined_at"]
        read_only_fields = ["joined_at"]


class TeamSerializer(serializers.ModelSerializer):
    memberships = TeamMembershipSerializer(many=True, read_only=True)

    class Meta:
        model = Team
        fields = ["id", "name", "department", "lead", "memberships", "created_at"]
        read_only_fields = ["created_at"]
