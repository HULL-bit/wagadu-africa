import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from apps.audit.models import AuditLogEntry
from apps.documents.models import Document, DocumentRecipient, ShareLink
from apps.documents.tasks import purge_trashed_documents
from apps.notifications.models import Notification

pytestmark = pytest.mark.django_db


def _file(name="note.txt", content=b"Reglement interieur de Wagadu Africa"):
    return SimpleUploadedFile(name, content, content_type="text/plain")


def _upload(client, **extra):
    data = {"title": "Note de service", "file": _file(), **extra}
    return client.post("/api/v1/documents/", data, format="multipart")


def test_any_user_can_upload_personal_document(auth, employee):
    resp = _upload(auth(employee))
    assert resp.status_code == 201
    assert resp.data["current_version_detail"]["version_number"] == 1
    assert AuditLogEntry.objects.filter(module="documents", action="create").exists()


def test_library_upload_requires_manage_permission(auth, employee, admin_user):
    assert _upload(auth(employee), is_in_library="true").status_code == 403
    assert _upload(auth(admin_user), is_in_library="true").status_code == 201


def test_new_version_advances_current_and_keeps_history(auth, chef):
    doc_id = _upload(auth(chef)).data["id"]
    resp = auth(chef).post(
        f"/api/v1/documents/{doc_id}/versions/",
        {"file": _file("v2.txt", b"version deux"), "note": "corrections"},
        format="multipart",
    )
    assert resp.status_code == 201
    assert resp.data["current_version_detail"]["version_number"] == 2
    assert len(resp.data["versions"]) == 2


def test_targeted_distribution_tracks_reads_and_allows_reminder(auth, chef, make_user):
    a = make_user("a@wagadu.africa", "employe")
    b = make_user("b@wagadu.africa", "employe")
    doc_id = _upload(auth(chef)).data["id"]

    dist = auth(chef).post(
        f"/api/v1/documents/{doc_id}/distribute/",
        {"mode": "selection", "user_ids": [str(a.id), str(b.id)], "message": "Pour info"},
        format="json",
    )
    assert dist.status_code == 201
    assert dist.data["total_count"] == 2
    assert Notification.objects.filter(recipient=a, type="document").exists()

    # a consulte le document
    auth(a).get(f"/api/v1/documents/{doc_id}/preview/")
    dist_id = dist.data["id"]
    detail = auth(chef).get(f"/api/v1/document-distributions/{dist_id}/")
    assert detail.data["read_count"] == 1

    remind = auth(chef).post(f"/api/v1/document-distributions/{dist_id}/remind/")
    assert remind.data["reminded"] == 1
    assert Notification.objects.filter(recipient=b, title__icontains="non lu").exists()


def test_broadcast_snapshots_active_users(auth, chef, make_user):
    make_user("c1@wagadu.africa", "employe")
    make_user("c2@wagadu.africa", "employe")
    doc_id = _upload(auth(chef)).data["id"]
    resp = auth(chef).post(
        f"/api/v1/documents/{doc_id}/distribute/", {"mode": "broadcast"}, format="json"
    )
    assert resp.status_code == 201
    assert resp.data["total_count"] == DocumentRecipient.objects.filter(
        distribution_id=resp.data["id"]
    ).count() >= 2


def test_employee_without_broadcast_permission_denied(auth, employee, make_user):
    # employé sans documents.send/broadcast
    a = make_user("x@wagadu.africa", "employe")
    from apps.documents.services import create_document

    doc = create_document(data={"title": "T"}, file=_file(), actor=a)
    assert auth(a).post(
        f"/api/v1/documents/{doc.id}/distribute/", {"mode": "broadcast"}, format="json"
    ).status_code == 403


def test_received_endpoint_lists_documents_for_recipient(auth, chef, make_user):
    a = make_user("r@wagadu.africa", "employe")
    doc_id = _upload(auth(chef)).data["id"]
    auth(chef).post(
        f"/api/v1/documents/{doc_id}/distribute/",
        {"mode": "user", "user_ids": [str(a.id)]}, format="json",
    )
    resp = auth(a).get("/api/v1/documents/received/")
    assert len(resp.data) == 1
    assert resp.data[0]["is_read"] is False


def test_library_visibility_public_vs_restricted(auth, admin_user, make_user, roles):
    doc = auth(admin_user).post(
        "/api/v1/documents/",
        {"title": "Procédure RH", "file": _file(), "is_in_library": "true"},
        format="multipart",
    ).data
    employee = make_user("emp@wagadu.africa", "employe")
    assert any(d["id"] == doc["id"] for d in auth(employee).get("/api/v1/documents/?library=true").data["results"])

    # restreindre au rôle RH
    auth(admin_user).put(
        f"/api/v1/documents/{doc['id']}/visibility/",
        {"visibility": "restricted", "rules": [{"subject_type": "role", "subject_id": roles["rh"].id}]},
        format="json",
    )
    assert not any(
        d["id"] == doc["id"] for d in auth(employee).get("/api/v1/documents/?library=true").data["results"]
    )
    rh = make_user("rh2@wagadu.africa", "rh")
    assert any(
        d["id"] == doc["id"] for d in auth(rh).get("/api/v1/documents/?library=true").data["results"]
    )


def test_trash_restore_and_purge(auth, chef):
    doc_id = _upload(auth(chef)).data["id"]
    auth(chef).delete(f"/api/v1/documents/{doc_id}/")
    assert Document.objects.get(id=doc_id).is_trashed
    assert auth(chef).get("/api/v1/documents/").data["count"] == 0
    assert auth(chef).get("/api/v1/documents/?trashed=true").data["count"] == 1

    auth(chef).post(f"/api/v1/documents/{doc_id}/restore/")
    assert not Document.objects.get(id=doc_id).is_trashed

    auth(chef).delete(f"/api/v1/documents/{doc_id}/")
    Document.objects.filter(id=doc_id).update(
        deleted_at=timezone.now() - timezone.timedelta(days=40)
    )
    assert purge_trashed_documents()["purged"] == 1
    assert not Document.objects.filter(id=doc_id).exists()


def test_search_matches_content_and_keywords(auth, chef):
    _upload(auth(chef), title="Charte", keywords="ethique", file=_file("c.txt", b"respect des communautes"))
    r1 = auth(chef).get("/api/v1/documents/?search=communautes")
    r2 = auth(chef).get("/api/v1/documents/?search=ethique")
    assert r1.data["count"] == 1
    assert r2.data["count"] == 1


class TestShareLinks:
    def test_create_requires_permission(self, auth, employee, chef, make_user):
        a = make_user("noshare@wagadu.africa", "employe")
        from apps.documents.services import create_document

        doc = create_document(data={"title": "T"}, file=_file(), actor=a)
        assert auth(a).post(f"/api/v1/documents/{doc.id}/share-links/", {}, format="json").status_code == 403

    def test_public_download_flow_with_password(self, api, auth, chef):
        doc_id = _upload(auth(chef)).data["id"]
        link = auth(chef).post(
            f"/api/v1/documents/{doc_id}/share-links/",
            {"password": "secret", "max_downloads": 2}, format="json",
        ).data
        token = link["token"]

        meta = api.get(f"/api/v1/public/share/{token}/")
        assert meta.status_code == 200 and meta.data["password_required"] is True

        assert api.post(f"/api/v1/public/share/{token}/", {"password": "wrong"}, format="json").status_code == 403
        ok = api.post(f"/api/v1/public/share/{token}/", {"password": "secret"}, format="json")
        assert ok.status_code == 200

        ShareLink.objects.filter(token=token).update(download_count=2)
        assert api.get(f"/api/v1/public/share/{token}/").status_code == 404

    def test_revoked_link_is_dead(self, api, auth, chef):
        doc_id = _upload(auth(chef)).data["id"]
        link = auth(chef).post(f"/api/v1/documents/{doc_id}/share-links/", {}, format="json").data
        auth(chef).post(f"/api/v1/documents/{doc_id}/share-links/{link['id']}/revoke/")
        assert api.get(f"/api/v1/public/share/{link['token']}/").status_code == 404
