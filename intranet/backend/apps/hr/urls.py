from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CareerEventViewSet,
    ContractViewSet,
    EmployeeDocumentViewSet,
    EmployeeViewSet,
    HealthRecordViewSet,
    HrDashboardView,
    LeaveBalanceViewSet,
    LeaveRequestViewSet,
    LeaveTypeViewSet,
    PublicHolidayViewSet,
)
from .views_lota import (
    EvaluationCampaignViewSet,
    EvaluationFormViewSet,
    EvaluationViewSet,
    LifecycleItemViewSet,
    LifecycleProcessViewSet,
    LifecycleTemplateViewSet,
)

router = DefaultRouter()
router.register("hr/employees", EmployeeViewSet)
router.register("hr/contracts", ContractViewSet)
router.register("hr/employee-documents", EmployeeDocumentViewSet)
router.register("hr/career-events", CareerEventViewSet)
router.register("hr/health-records", HealthRecordViewSet)
router.register("hr/public-holidays", PublicHolidayViewSet)
router.register("hr/leave-types", LeaveTypeViewSet)
router.register("hr/leave-balances", LeaveBalanceViewSet)
router.register("hr/leave-requests", LeaveRequestViewSet)

router.register("hr/lifecycle-templates", LifecycleTemplateViewSet, basename="hr-lifecycle-templates")
router.register("hr/lifecycle-processes", LifecycleProcessViewSet, basename="hr-lifecycle-processes")
router.register("hr/lifecycle-items", LifecycleItemViewSet, basename="hr-lifecycle-items")
router.register("hr/evaluation-forms", EvaluationFormViewSet, basename="hr-evaluation-forms")
router.register("hr/evaluation-campaigns", EvaluationCampaignViewSet, basename="hr-evaluation-campaigns")
router.register("hr/evaluations", EvaluationViewSet, basename="hr-evaluations")

urlpatterns = [
    path("hr/dashboard/", HrDashboardView.as_view(), name="hr-dashboard"),
    *router.urls,
]
