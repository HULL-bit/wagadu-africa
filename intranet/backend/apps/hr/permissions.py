from __future__ import annotations

from rest_framework.permissions import BasePermission

from apps.permissions.services import has_permission


class HrObjectAccess(BasePermission):
    """Un employé accède à sa propre fiche RH ; le RH (hr.view) accède à tout ;
    un responsable accède aux fiches de ses subordonnés directs."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_super_admin or has_permission(user, "hr.view"):
            return True
        employee = _employee_of(obj)
        if employee is None:
            return False
        if employee.user_id == user.id:
            return request.method in ("GET", "HEAD", "OPTIONS")
        return employee.user.manager_id == user.id and request.method in ("GET", "HEAD", "OPTIONS")


def _employee_of(obj):
    if obj.__class__.__name__ == "Employee":
        return obj
    return getattr(obj, "employee", None)
