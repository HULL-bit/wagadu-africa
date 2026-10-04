from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ChangePasswordView,
    LoginView,
    LogoutView,
    MemberDirectoryViewSet,
    MeView,
    PersonalDataExportView,
    TwoFactorView,
    UserViewSet,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")
router.register("directory", MemberDirectoryViewSet, basename="directory")

urlpatterns = [
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("auth/me/export/", PersonalDataExportView.as_view(), name="me-export"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("auth/2fa/<str:step>/", TwoFactorView.as_view(), name="2fa"),
    *router.urls,
]
