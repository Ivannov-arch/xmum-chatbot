"""Text normalization and keyword preprocessing for the chatbot pipeline."""

from __future__ import annotations

import re
import string
from collections.abc import Iterable


PUNCTUATION_TO_REMOVE = "!?.,;:'\"()[]{}"

STOP_WORDS = {
    "a",
    "about",
    "an",
    "and",
    "are",
    "at",
    "be",
    "can",
    "could",
    "do",
    "does",
    "for",
    "from",
    "how",
    "i",
    "in",
    "is",
    "it",
    "me",
    "my",
    "of",
    "on",
    "or",
    "please",
    "the",
    "there",
    "tell",
    "to",
    "what",
    "when",
    "which",
    "who",
    "with",
    "would",
}

SYNONYM_MAP: dict[str, str] = {
    "founded": "founder",
    "internet": "wifi",
    "network": "wifi",
    "connection": "wifi",
    "wi-fi": "wifi",
    "wi fi": "wifi",
    "wireless": "wifi",
    "dorm": "hostel",
    "dormitory": "hostel",
    "accommodation": "hostel",
    "residence": "hostel",
    "sem": "semester",
    "term": "semester",
    "sep": "september",
    "sept": "september",
    "break": "semester break",
    "where": "location",
    "grade": "cgpa",
    "grades": "cgpa",
    "pointer": "cgpa",
    "result": "grade",
    "results": "grade",
    "professor": "lecturer",
    "instructor": "lecturer",
    "borrow": "library",
    "cafe": "canteen",
    "cafeteria": "canteen",
    "food court": "canteen",
    "dining": "canteen",
    "mc": "leave",
    "sick": "medical",
    "tuition": "fees",
    "payment": "fees",
    "pay": "fees",
    "class": "course",
    "subject": "course",
    "programme": "programmes",
    "program": "programmes",
    "email": "student email",
    "outlook": "student email",
    "teams": "student email",
    "office365": "student email",
    "office 365": "student email",
    "forgot": "password reset",
    "reset": "password reset",
    "renew": "renewal",
    "renewing": "renewal",
    "evisa": "visa",
    "eval": "visa approval letter",
    "ikad": "i-kad",
    "ecard": "campus ecard",
    "id": "student id",
}

GREETING_TERMS = {
    "good",
    "hello",
    "hey",
    "hi",
    "morning",
    "afternoon",
    "evening",
    "there",
}

GREETING_CONTEXT_TERMS = {
    "assistant",
    "bot",
    "chatbot",
    "xmum",
}


def normalize(text: str) -> str:
    """Lowercase text, remove common punctuation, and collapse whitespace."""
    if not text:
        return ""

    translation = str.maketrans({char: " " for char in PUNCTUATION_TO_REMOVE})
    normalized = text.lower().strip().translate(translation)
    normalized = normalized.replace("/", " ")
    return re.sub(r"\s+", " ", normalized).strip()


def extract_keywords(text: str) -> list[str]:
    """Return useful non-stopword tokens from normalized text."""
    normalized = normalize(text)
    if not normalized:
        return []

    tokens = normalized.split()
    return [token for token in tokens if token and token not in STOP_WORDS]


def _iter_phrases(tokens: list[str]) -> Iterable[str]:
    for size in (3, 2):
        for index in range(0, len(tokens) - size + 1):
            yield " ".join(tokens[index : index + size])


def _canonicalize(keyword: str) -> str:
    canonical = keyword
    seen = set()
    while canonical in SYNONYM_MAP and canonical not in seen:
        seen.add(canonical)
        next_value = SYNONYM_MAP[canonical]
        if next_value == canonical:
            break
        canonical = next_value
    return canonical


def expand_synonyms(keywords: list[str]) -> list[str]:
    """Map known synonyms to canonical keywords while preserving order."""
    expanded: list[str] = []
    seen: set[str] = set()

    normalized_keywords = [normalize(keyword) for keyword in keywords if keyword]
    phrases = [phrase for phrase in _iter_phrases(normalized_keywords)]

    for keyword in normalized_keywords:
        canonical = _canonicalize(keyword)
        if canonical and canonical not in seen:
            expanded.append(canonical)
            seen.add(canonical)

    for keyword in phrases:
        canonical = _canonicalize(keyword) if keyword in SYNONYM_MAP else None
        if canonical and canonical not in seen:
            expanded.append(canonical)
            seen.add(canonical)

    return expanded


def build_search_terms(text: str) -> list[str]:
    """Create the keyword list used by intent classification and retrieval."""
    keywords = extract_keywords(text)
    expanded = expand_synonyms(keywords)

    terms: list[str] = []
    seen: set[str] = set()
    for term in [*keywords, *expanded]:
        if term and term not in seen:
            terms.append(term)
            seen.add(term)
    return terms


def build_augmented_query(text: str) -> str:
    """Return normalized text plus expanded search terms for matching."""
    normalized_text = normalize(text)
    search_terms = build_search_terms(text)
    parts = [normalized_text, " ".join(search_terms)]
    return " ".join(part for part in parts if part).strip()


def is_greeting(text: str) -> bool:
    """Return True for short greeting-only messages like 'hi' or 'hello'."""
    normalized_text = normalize(text)
    if not normalized_text:
        return False

    tokens = normalized_text.split()
    if len(tokens) > 4:
        return False

    has_greeting = any(token in GREETING_TERMS for token in tokens)
    only_greeting_context = all(
        token in GREETING_TERMS or token in GREETING_CONTEXT_TERMS
        for token in tokens
    )
    return has_greeting and only_greeting_context


if __name__ == "__main__":
    print("XMUM Chatbot Preprocessor")
    print("Type a message to inspect it, or 'quit' to exit.")

    while True:
        raw = input("Text: ").strip()
        if raw.lower() in {"quit", "exit"}:
            break
        normalized_text = normalize(raw)
        keywords = extract_keywords(raw)
        expanded_keywords = expand_synonyms(keywords)
        print(f"Normalized: {normalized_text}")
        print(f"Keywords  : {keywords}")
        print(f"Expanded  : {expanded_keywords}")
