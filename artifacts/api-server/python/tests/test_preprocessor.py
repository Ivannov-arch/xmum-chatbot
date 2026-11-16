from chatbot.preprocessor import build_augmented_query, build_search_terms, is_greeting, normalize


def test_normalize_removes_punctuation_and_collapses_spaces():
    assert normalize("  Hello,   XMUM!!! ") == "hello xmum"


def test_search_terms_expand_synonyms():
    assert "wifi" in build_search_terms("How do I connect to the internet?")


def test_augmented_query_includes_synonym_terms():
    augmented = build_augmented_query("Who founded Xiamen University?")
    assert "founded" in augmented
    assert "founder" in augmented


def test_greeting_short_messages():
    assert is_greeting("hi")
    assert is_greeting("hello there")
    assert is_greeting("good morning")


def test_greeting_does_not_swallow_real_questions():
    assert not is_greeting("hello where is the library")
