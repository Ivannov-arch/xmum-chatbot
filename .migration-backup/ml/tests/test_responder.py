# placeholder_test_responder.py
# tests/test_responder.py
#
# Unit tests for chatbot/responder.py
#
# Test cases to implement:
#   - format() with empty results returns the fallback message
#   - format() with one result returns a string containing the answer
#   - format() with multiple results formats them correctly
#   - format() return type is always str
#
# TODO: write full test cases once Responder is implemented.

import pytest
from chatbot.responder import Responder, FALLBACK_MESSAGE


@pytest.fixture
def responder():
    """Return a fresh Responder instance for each test."""
    return Responder()


SAMPLE_RESULTS = [
    {
        "module": "campus_life",
        "question": "What time does the library close?",
        "answer": "The library closes at 9:00 PM on weekdays.",
        "keywords": ["library", "close"],
    }
]


class TestResponder:
    """PLACEHOLDER test suite for Responder."""

    def test_returns_string(self, responder):
        """format() should always return a string."""
        result = responder.format(results=[], query="test")
        assert isinstance(result, str)

    def test_empty_results_returns_fallback(self, responder):
        """format() with no results should return the fallback message."""
        result = responder.format(results=[], query="random question")
        assert result == FALLBACK_MESSAGE

    # TODO: uncomment once Responder is implemented
    # def test_single_result_contains_answer(self, responder):
    #     result = responder.format(results=SAMPLE_RESULTS, query="library close time")
    #     assert "9:00 PM" in result

    # def test_multiple_results_formatted(self, responder):
    #     results = SAMPLE_RESULTS * 3
    #     result = responder.format(results=results, query="library")
    #     assert isinstance(result, str)
    #     assert len(result) > 0
