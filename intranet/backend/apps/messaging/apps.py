from django.apps import AppConfig


class MessagingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.messaging"
    verbose_name = "Messagerie interne"

    def ready(self):
        from . import signals  # noqa: F401
