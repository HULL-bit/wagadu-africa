from django.apps import AppConfig


class HrConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.hr"
    verbose_name = "Ressources humaines"

    def ready(self) -> None:
        from . import signals  # noqa: F401
