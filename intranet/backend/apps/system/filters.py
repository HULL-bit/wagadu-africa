import django_filters as filters

from .models import Incident


class IncidentFilter(filters.FilterSet):
    status = filters.CharFilter(field_name="status")
    severity = filters.CharFilter(field_name="severity")
    component = filters.CharFilter(field_name="component", lookup_expr="icontains")

    class Meta:
        model = Incident
        fields = ["status", "severity", "component"]
