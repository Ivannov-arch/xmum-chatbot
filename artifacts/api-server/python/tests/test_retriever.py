# placeholder_test_retriever.py
# tests/test_retriever.py
#
# Unit / integration tests for chatbot/retriever.py
#
# Test cases to implement:
#   - search() returns a list (even if empty)
#   - search() with a matching query returns at least one result
#   - search() result dicts contain expected keys: question, answer, module
#   - search() with unknown module returns empty list
#   - top_k parameter limits the number of results
#
# NOTE: these tests will hit the real Supabase database.
#       Consider mocking the Supabase client for pure unit tests.
#
# TODO: write test cases once Retriever is implemented.
# TODO: consider using pytest-mock or monkeypatch to mock Supabase client.

import pytest
from chatbot.retriever import Retriever


@pytest.fixture
def retriever():
    """Return a fresh Retriever instance for each test."""
    return Retriever()


class TestRetriever:
    """PLACEHOLDER test suite for Retriever."""

    def test_search_returns_list(self, retriever):
        """search() should always return a list."""
        # PLACEHOLDER — will work once Retriever is implemented
        result = retriever.search(module="campus_life", query="library")
        assert isinstance(result, list)

    # TODO: uncomment once Retriever + Supabase are connected
    # def test_search_known_query_returns_results(self, retriever):
    #     results = retriever.search(module="campus_life", query="library hours")
    #     assert len(results) > 0

    # def test_search_result_has_required_keys(self, retriever):
    #     results = retriever.search(module="campus_life", query="library")
    #     if results:
    #         assert "question" in results[0]
    #         assert "answer" in results[0]
    #         assert "module" in results[0]

    # def test_search_respects_top_k(self, retriever):
    #     results = retriever.search(module="campus_life", query="food", top_k=1)
    #     assert len(results) <= 1
