# placeholder_test_api.py
# tests/test_api.py
#
# Integration tests for the FastAPI endpoints.
# Uses httpx.TestClient (synchronous) to send requests to the app.
#
# Test cases to implement:
#   GET  /         → 200 OK, welcome message
#   GET  /health   → 200 OK, { "status": "ok" }
#   POST /chat     → 200 OK, valid ChatResponse shape
#   POST /chat     → 400 Bad Request when message is missing
#   POST /chat     → 422 Unprocessable Entity when body is malformed
#
# TODO: write full test cases once routes are implemented.
# TODO: mock Supabase / Bot for isolated API tests.

import pytest
from fastapi.testclient import TestClient
from api.app import app

client = TestClient(app)


class TestRootEndpoint:
    """PLACEHOLDER tests for GET /."""

    def test_root_returns_200(self):
        response = client.get("/")
        assert response.status_code == 200

    def test_root_returns_message(self):
        response = client.get("/")
        data = response.json()
        assert "message" in data


# TODO: uncomment once /health and /chat routes are mounted in app.py

# class TestHealthEndpoint:
#     def test_health_returns_ok(self):
#         response = client.get("/health/")
#         assert response.status_code == 200
#         assert response.json()["status"] == "ok"

# class TestChatEndpoint:
#     def test_chat_valid_request(self):
#         response = client.post("/chat/", json={
#             "session_id": "test-session",
#             "message": "Where is the library?"
#         })
#         assert response.status_code == 200
#         data = response.json()
#         assert "reply" in data
#         assert "module" in data
#         assert "session_id" in data

#     def test_chat_missing_message_returns_400(self):
#         response = client.post("/chat/", json={"session_id": "test-session"})
#         assert response.status_code in (400, 422)
