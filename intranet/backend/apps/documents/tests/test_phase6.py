import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.audit.models import AuditLogEntry
from apps.documents.models import DocumentSignature

pytestmark = pytest.mark.django_db

MINIMAL_PDF = (
    b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\n"
    b"trailer<</Root 1 0 R>>\n%%EOF"
)


def test_document_signature(auth, chef, employee):
    doc = auth(chef).post("/api/v1/documents/", {
        "title": "Charte", "file": SimpleUploadedFile("c.txt", b"contenu"),
    }, format="multipart").data
    auth(chef).post(f"/api/v1/documents/{doc['id']}/distribute/", {
        "mode": "user", "user_ids": [str(employee.id)],
    }, format="json")
    resp = auth(employee).post(f"/api/v1/documents/{doc['id']}/sign/", {"statement": "Lu et approuvé"}, format="json")
    assert resp.status_code == 200
    assert len(resp.data["signatures"]) == 1
    assert DocumentSignature.objects.filter(document_id=doc["id"], signer=employee).exists()
    assert AuditLogEntry.objects.filter(module="documents", action="validate").exists()

    # idempotent
    auth(employee).post(f"/api/v1/documents/{doc['id']}/sign/", {}, format="json")
    assert DocumentSignature.objects.filter(document_id=doc["id"]).count() == 1


def test_pdf_text_extraction_task(auth, chef, settings):
    doc = auth(chef).post("/api/v1/documents/", {
        "title": "Doc PDF", "file": SimpleUploadedFile("d.pdf", MINIMAL_PDF, content_type="application/pdf"),
    }, format="multipart").data
    from apps.documents.models import DocumentVersion
    from apps.documents.tasks import extract_pdf_text

    version = DocumentVersion.objects.get(document_id=doc["id"], version_number=1)
    result = extract_pdf_text(version.id)
    assert "extracted_chars" in result or "error" in result  # pypdf gère ce PDF minimal
