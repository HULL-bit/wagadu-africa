from django.urls import path

from .views import ReportCatalogView, ReportExportView

urlpatterns = [
    path("reports/", ReportCatalogView.as_view(), name="report-catalog"),
    path("reports/<str:dataset>.<str:fmt>", ReportExportView.as_view(), name="report-export"),
]
