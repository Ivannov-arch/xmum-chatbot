from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from chatbot.preprocessor import build_search_terms, normalize


CONTEXT_PRONOUNS = {
    "it",
    "that",
    "this",
    "there",
    "they",
    "them",
    "these",
    "those",
    "one",
    "ones",
}

FOLLOW_UP_STARTS = (
    "and ",
    "also ",
    "then ",
    "how about",
    "what about",
    "what else",
    "tell me more",
)

CONTEXT_DEPENDENT_TERMS = {
    "apply",
    "application",
    "available",
    "close",
    "closes",
    "closing",
    "contact",
    "cost",
    "deadline",
    "fee",
    "fees",
    "hour",
    "hours",
    "location",
    "nearby",
    "open",
    "opens",
    "opening",
    "requirement",
    "requirements",
    "time",
    "where",
    "when",
}

CONTEXT_GENERIC_TERMS = CONTEXT_DEPENDENT_TERMS | CONTEXT_PRONOUNS | {
    "day",
    "days",
    "details",
    "documents",
    "eligible",
    "eligibility",
    "form",
    "forms",
    "long",
    "much",
    "need",
    "needed",
    "process",
    "required",
    "step",
    "steps",
}

MAX_CONTEXT_QUERY_CHARS = 700

LOW_VALUE_TOPIC_TERMS = {
    "about",
    "answer",
    "available",
    "campus",
    "can",
    "could",
    "does",
    "how",
    "information",
    "location",
    "located",
    "malaysia",
    "open",
    "question",
    "student",
    "students",
    "tell",
    "time",
    "university",
    "what",
    "when",
    "where",
    "who",
    "xmum",
    "xiamen",
}


class ContextManager:

    def __init__(self, max_turns: int | None = None) -> None:

        self.sessions: dict[str, list[dict[str, str]]] = {}
        self.max_turns = max_turns

    def add_turn(
        self,
        session_id: str,
        role: str,
        message: str,
        **metadata: Any,
    ) -> None:

        if session_id not in self.sessions:
            self.sessions[session_id] = []

        utc_timestamp: str = datetime.now(tz=timezone.utc).isoformat()

        message_record: dict[str, str] = {
            "role":      role,
            "message":   message,
            "timestamp": utc_timestamp,
        }
        for key, value in metadata.items():
            if value is not None:
                message_record[key] = str(value)

        self.sessions[session_id].append(message_record)

        self._prune_history(session_id)

    def get_history(self, session_id: str) -> list[dict[str, str]]:

        return [record.copy() for record in self.sessions.get(session_id, [])]

    def clear(self, session_id: str) -> None:

        self.sessions.pop(session_id, None)

    def build_contextual_query(self, session_id: str, message: str) -> str:
        """Return a retrieval query enriched with prior topic only for follow-ups."""
        history = self.sessions.get(session_id, [])
        if not history or not self.is_follow_up(message):
            return message

        previous_topic = self._latest_topic(history)
        if not previous_topic:
            return message

        contextual_query = f"{previous_topic} {message}"
        return contextual_query[:MAX_CONTEXT_QUERY_CHARS]

    def is_follow_up(self, message: str) -> bool:
        """Detect short, context-dependent follow-up questions."""
        normalized_message = normalize(message)
        if not normalized_message:
            return False

        tokens = normalized_message.split()
        terms = set(build_search_terms(normalized_message))

        if self._has_standalone_topic(terms):
            return False

        if any(normalized_message.startswith(prefix) for prefix in FOLLOW_UP_STARTS):
            return True

        if set(tokens) & CONTEXT_PRONOUNS:
            return True

        if len(tokens) <= 8 and terms & CONTEXT_DEPENDENT_TERMS:
            return True

        return False

    def _latest_topic(self, history: list[dict[str, str]]) -> str:
        for record in reversed(history):
            matched_question = record.get("matched_question")
            if matched_question:
                topic = self._extract_topic(matched_question)
                if topic:
                    return topic

        for record in reversed(history):
            if record.get("role") == "user":
                topic = self._extract_topic(record.get("message", ""))
                if topic:
                    return topic

        return ""

    def _extract_topic(self, text: str) -> str:
        topic_terms: list[str] = []
        for term in build_search_terms(text):
            if (
                len(term) < 3
                or term in LOW_VALUE_TOPIC_TERMS
                or term in CONTEXT_DEPENDENT_TERMS
            ):
                continue
            if term not in topic_terms:
                topic_terms.append(term)
            if len(topic_terms) >= 3:
                break

        return " ".join(topic_terms)

    def _has_standalone_topic(self, terms: set[str]) -> bool:
        for term in terms:
            if (
                len(term) >= 3
                and term not in LOW_VALUE_TOPIC_TERMS
                and term not in CONTEXT_GENERIC_TERMS
            ):
                return True
        return False

    def _prune_history(self, session_id: str) -> None:

        if session_id not in self.sessions:
            return

        configured_turn_limit: int = self._get_max_turns()

        max_individual_messages: int = configured_turn_limit * 2

        current_history: list[dict[str, str]] = self.sessions[session_id]
        current_message_count: int = len(current_history)

        if current_message_count > max_individual_messages:

            self.sessions[session_id] = current_history[-max_individual_messages:]

    def _get_max_turns(self) -> int:
        if self.max_turns is not None:
            return max(1, self.max_turns)

        raw_max_turns: str = os.getenv("MAX_TURNS", "5")

        try:
            return max(1, int(raw_max_turns))
        except ValueError:
            return 5


if __name__ == "__main__":

    os.environ["MAX_TURNS"] = "2"

    print("=" * 60)
    print("CGC-03  ContextManager — manual verification")
    print(f"  MAX_TURNS env var set to: {os.environ['MAX_TURNS']}")
    print(f"  Effective message cap   : {int(os.environ['MAX_TURNS']) * 2}")
    print("=" * 60)

    dialogue_memory = ContextManager()
    test_session_identifier: str = "campus-orientation-session-001"

    print("\nAdding 6 messages to the session (3 user + 3 bot)…\n")

    dialogue_memory.add_turn(test_session_identifier, "user", "Where is the library?")
    dialogue_memory.add_turn(test_session_identifier, "bot",  "The library is in Block A, Level 2.")
    dialogue_memory.add_turn(test_session_identifier, "user", "What are the opening hours?")
    dialogue_memory.add_turn(test_session_identifier, "bot",  "The library is open Mon–Fri, 8 AM to 10 PM.")
    dialogue_memory.add_turn(test_session_identifier, "user", "Is there a student lounge nearby?")
    dialogue_memory.add_turn(test_session_identifier, "bot",  "Yes, the student lounge is on Level 3 of Block A.")

    retained_messages: list[dict[str, str]] = dialogue_memory.get_history(
        test_session_identifier
    )

    print(f"Messages retained after pruning : {len(retained_messages)}  (expected: 4)\n")

    for position, record in enumerate(retained_messages, start=1):
        print(
            f"  [{position}] role={record['role']:<10}  "
            f"ts={record['timestamp']}  "
            f"msg={record['message']!r}"
        )

    assert len(retained_messages) == 4, (
        f"Pruning failed: expected 4 messages but got {len(retained_messages)}"
    )
    print("\n✅  Pruning verified — 4 most recent messages retained, 2 oldest discarded.")

    print("\nClearing session…")
    dialogue_memory.clear(test_session_identifier)

    post_clear_history: list[dict[str, str]] = dialogue_memory.get_history(
        test_session_identifier
    )
    print(f"History length after clear_session: {len(post_clear_history)}  (expected: 0)")

    assert len(post_clear_history) == 0, (
        "clear_session failed: history should be empty but is not"
    )
    print("✅  clear_session verified — history length is 0.")

    dialogue_memory.clear("session-that-never-existed")
    print("✅  Speculative clear_session on unknown ID raised no error.")

    print("\n" + "=" * 60)
    print("All manual checks passed.  context_manager.py is working correctly.")
    print("=" * 60)
