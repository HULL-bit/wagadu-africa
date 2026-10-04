from rest_framework.routers import DefaultRouter

from .views import (
    ApprovalProcessViewSet,
    ValidationFlowViewSet,
    ValidationStepViewSet,
)

router = DefaultRouter()
router.register("validation/flows", ValidationFlowViewSet, basename="validation-flows")
router.register("validation/steps", ValidationStepViewSet, basename="validation-steps")
router.register("validation/processes", ApprovalProcessViewSet, basename="validation-processes")

urlpatterns = router.urls
