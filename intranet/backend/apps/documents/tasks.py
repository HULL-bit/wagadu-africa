"""Tâches Celery du module Documents :
- purge de la corbeille (30 jours) ;
- extraction du texte des PDF pour la recherche full-text (Phase 6)."""
from __future__ import annotations

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from .models import Document, DocumentVersion


@shared_task
def purge_trashed_documents() -> dict:
    days = settings.WAGADU.get("DOC_TRASH_RETENTION_DAYS", 30)
    cutoff = timezone.now() - timezone.timedelta(days=days)
    stale = Document.objects.filter(deleted_at__lt=cutoff)
    count = stale.count()
    for document in stale:
        for version in document.versions.all():
            version.file.delete(save=False)
        document.delete()
    return {"purged": count}


@shared_task
def extract_pdf_text(version_id: int) -> dict:
    version = DocumentVersion.objects.filter(pk=version_id).first()
    if not version:
        return {"error": "version_not_found"}
    name = (version.original_filename or version.file.name or "").lower()
    if not (name.endswith(".pdf") or version.content_type == "application/pdf"):
        return {"skipped": "not_pdf"}
    try:
        from pypdf import PdfReader

        version.file.open("rb")
        reader = PdfReader(version.file)
        text = "\n".join((page.extract_text() or "") for page in reader.pages)
        version.file.close()
    except Exception as exc:  # noqa: BLE001
        return {"error": str(exc)[:200]}

    version.text_content = text[:400_000]
    version.save(update_fields=["text_content"])
    return {"extracted_chars": len(version.text_content)}
