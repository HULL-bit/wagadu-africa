import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

pytestmark = pytest.mark.django_db


def test_short_query_returns_nothing(auth, employee):
    assert auth(employee).get("/api/v1/search/?q=a").data["results"] == []


def test_search_finds_task_document_person(auth, chef, make_user):
    agent = make_user("recherche-agent@wagadu.africa", "employe")
    task = auth(chef).post("/api/v1/tasks/", {
        "title": "Analyse hydrologique Blue-Track", "assignee_ids": [str(agent.id)],
    }, format="json")
    assert task.status_code == 201
    auth(chef).post("/api/v1/documents/", {
        "title": "Rapport hydrologique", "file": SimpleUploadedFile("h.txt", b"donnees"),
    }, format="multipart")

    res = auth(chef).get("/api/v1/search/?q=hydrolog")
    types = {r["type"] for r in res.data["results"]}
    assert "task" in types and "document" in types

    res2 = auth(chef).get("/api/v1/search/?q=recherche-agent")
    assert any(r["type"] == "person" for r in res2.data["results"])


def test_search_respects_visibility(auth, chef, make_user):
    outsider = make_user("outsider-search@wagadu.africa", "employe")
    agent = make_user("assigned-search@wagadu.africa", "employe")
    auth(chef).post("/api/v1/tasks/", {"title": "Mission confidentielle Zorro", "assignee_ids": [str(agent.id)]}, format="json")
    assert auth(outsider).get("/api/v1/search/?q=Zorro").data["results"] == []
    assert any(r["type"] == "task" for r in auth(agent).get("/api/v1/search/?q=Zorro").data["results"])
