"""Regression checks for the Replit port, using the imported local knowledge."""
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from api.app import app


@pytest.fixture(scope="module")
def client():
    import os
    previous = os.environ.get("CHATBOT_KB_SOURCE")
    os.environ["CHATBOT_KB_SOURCE"] = "local"
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        if previous is None:
            os.environ.pop("CHATBOT_KB_SOURCE", None)
        else:
            os.environ["CHATBOT_KB_SOURCE"] = previous


def test_health(client):
    response = client.get("/api/healthz")
    assert response.status_code == 200
    assert response.json()["knowledge_source"] == "local"
    assert response.json()["knowledge_base_size"] > 1000


def test_library_answer(client):
    response = client.post("/api/chat", json={
        "message": "Where is the library?", "session_id": "migration-test",
    })
    assert response.status_code == 200
    assert "A3" in response.json()["answer"]


def test_empty_message_rejected(client):
    assert client.post("/api/chat", json={"message": "  "}).status_code == 400


def test_missing_message_rejected(client):
    assert client.post("/api/chat", json={}).status_code == 422


def test_suggestions(client):
    response = client.get("/api/suggestions?limit=6")
    assert response.status_code == 200
    assert 0 < len(response.json()["suggestions"]) <= 6


def test_public_knowledge(client):
    response = client.get("/api/knowledge")
    assert response.status_code == 200
    assert len(response.json()) > 1000
    assert {"id", "module", "question", "answer", "keywords"} <= response.json()[0].keys()
