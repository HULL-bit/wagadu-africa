from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.integrations"
    verbose_name = "Intégrations"

    def ready(self) -> None:
        from . import signals  # noqa: F401
