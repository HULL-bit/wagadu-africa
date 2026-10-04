from __future__ import annotations

import hashlib

from django.db import connection, transaction
from django.db.models import Q
from django.utils import timezone

from apps.audit.models import AuditAction, AuditSeverity
from apps.audit.services import record
from apps.notifications.services import notify

from .models import (
    DistributionMode,
    Document,
    DocumentDistribution,
    DocumentRecipient,
    DocumentVersion,
)

TEXT_EXTRACT_TYPES = {"text/plain", "text/markdown", "text/csv", "application/json"}
TEXT_EXTRACT_SUFFIXES = (".txt", ".md", ".csv", ".json", ".log")


def _extract_text(django_file, content_type: str) -> str:
    name = (getattr(django_file, "name", "") or "").lower()
    if content_type in TEXT_EXTRACT_TYPES or name.endswith(TEXT_EXTRACT_SUFFIXES):
        try:
            django_file.seek(0)
            raw = django_file.read()
            django_file.seek(0)
            return raw.decode("utf-8", errors="ignore")[:200_000]
        except Exception:  # pragma: no cover - défensif
            return ""
    return ""  # PDF / bureautique : extraction différée (phase 6)


@transaction.atomic
def create_document(*, data: dict, file, actor, note: str = "") -> Document:
    document = Document.objects.create(owner=actor, **data)
    add_version(document, file=file, actor=actor, note=note or "Version initiale")
    record(action=AuditAction.CREATE, module="documents", actor=actor, target=document,
           message=f"Import du document « {document.title} »")
    return document


@transaction.atomic
def add_version(document: Document, *, file, actor, note: str = "") -> DocumentVersion:
    next_number = (document.versions.count() or 0) + 1
    content_type = getattr(file, "content_type", "") or ""
    file.seek(0)
    checksum = hashlib.sha256(file.read()).hexdigest()
    file.seek(0)
    version = DocumentVersion.objects.create(
        document=document,
        version_number=next_number,
        file=file,
        original_filename=getattr(file, "name", "")[:255],
        size=getattr(file, "size", 0) or 0,
        content_type=content_type,
        note=note,
        text_content=_extract_text(file, content_type),
        uploaded_by=actor,
    )
    version.checksum = checksum  # transitoire, non persisté (pas de champ dédié)
    document.current_version = version
    document.save(update_fields=["current_version", "updated_at"])

    # Extraction du texte PDF en tâche de fond (recherche full-text).
    if not version.text_content and (
        content_type == "application/pdf"
        or version.original_filename.lower().endswith(".pdf")
    ):
        from .tasks import extract_pdf_text

        transaction.on_commit(lambda: extract_pdf_text.delay(version.id))

    if next_number > 1:
        record(action=AuditAction.UPDATE, module="documents", actor=actor, target=document,
               message=f"Nouvelle version v{next_number}",
               changes={"version": {"before": next_number - 1, "after": next_number}})
    return version


@transaction.atomic
def distribute_document(document: Document, *, actor, mode: str, user_ids=None, message: str = "") -> DocumentDistribution:
    from apps.accounts.models import User

    if mode == DistributionMode.BROADCAST:
        recipients = list(User.objects.filter(is_active=True).exclude(pk=actor.pk))
    else:
        recipients = list(User.objects.filter(pk__in=user_ids or [], is_active=True))
    if not recipients:
        from rest_framework.exceptions import ValidationError

        raise ValidationError("Aucun destinataire valide.")

    distribution = DocumentDistribution.objects.create(
        document=document, version=document.current_version, sent_by=actor,
        mode=mode, message=message,
    )
    DocumentRecipient.objects.bulk_create([
        DocumentRecipient(distribution=distribution, document=document, user=u)
        for u in recipients
    ])
    severity = AuditSeverity.WARNING if mode == DistributionMode.BROADCAST else AuditSeverity.INFO
    record(
        action=AuditAction.SEND, module="documents", actor=actor, target=document,
        message=f"Diffusion « {document.title} » ({distribution.get_mode_display()}, {len(recipients)} destinataire(s))",
        severity=severity,
    )
    for u in recipients:
        notify(u, title="Nouveau document reçu",
               body=f"« {document.title} »" + (f" — {message}" if message else ""),
               url="/documents/received", type="document", email=True)
    return distribution


@transaction.atomic
def remind_unread(distribution: DocumentDistribution, *, actor) -> int:
    unread = distribution.recipients.filter(is_read=False)
    count = 0
    for r in unread:
        notify(r.user, title="Rappel : document non lu",
               body=f"Merci de consulter « {distribution.document.title} ».",
               url="/documents/received", type="document", email=True)
        r.reminded_at = timezone.now()
        r.save(update_fields=["reminded_at"])
        count += 1
    record(action=AuditAction.SEND, module="documents", actor=actor, target=distribution.document,
           message=f"Relance de {count} destinataire(s) non-lecteur(s)")
    return count


def mark_document_read(document: Document, *, user) -> None:
    DocumentRecipient.objects.filter(
        document=document, user=user, is_read=False
    ).update(is_read=True, read_at=timezone.now())


def search_documents(queryset, query: str):
    query = (query or "").strip()
    if not query:
        return queryset
    if connection.vendor == "postgresql":
        from django.contrib.postgres.search import SearchQuery, SearchVector

        vector = (
            SearchVector("title", weight="A")
            + SearchVector("description", "keywords", weight="B")
            + SearchVector("versions__text_content", weight="C")
            + SearchVector("folder__name", weight="C")
        )
        return queryset.annotate(_sv=vector).filter(_sv=SearchQuery(query, config="french")).distinct()
    return queryset.filter(
        Q(title__icontains=query)
        | Q(description__icontains=query)
        | Q(keywords__icontains=query)
        | Q(folder__name__icontains=query)
        | Q(versions__text_content__icontains=query)
    ).distinct()
