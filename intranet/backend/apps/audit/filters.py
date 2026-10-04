import django_filters as filters

from .models import AuditLogEntry


class AuditLogFilter(filters.FilterSet):
    date_from = filters.IsoDateTimeFilter(field_name="timestamp", lookup_expr="gte")
    date_to = filters.IsoDateTimeFilter(field_name="timestamp", lookup_expr="lte")
    actor = filters.NumberFilter(field_name="actor_id")
    module = filters.CharFilter(field_name="module")
    action = filters.CharFilter(field_name="action")
    severity = filters.CharFilter(field_name="severity")

    class Meta:
        model = AuditLogEntry
        fields = ["date_from", "date_to", "actor", "module", "action", "severity"]
