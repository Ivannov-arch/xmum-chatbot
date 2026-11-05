from chatbot.context_manager import ContextManager


def test_contextual_query_expands_follow_up_with_last_matched_question():
    context = ContextManager(max_turns=3)
    session_id = "session-1"

    context.add_turn(session_id, "user", "Where is the library?")
    context.add_turn(
        session_id,
        "bot",
        "The library is located in the A3 Building.",
        matched_question="Where is the library located?",
    )

    contextual_query = context.build_contextual_query(session_id, "What time does it open?")

    assert contextual_query == "library What time does it open?"


def test_contextual_query_leaves_complete_new_question_unchanged():
    context = ContextManager(max_turns=3)
    session_id = "session-1"

    context.add_turn(session_id, "user", "Where is the library?")
    context.add_turn(
        session_id,
        "bot",
        "The library is located in the A3 Building.",
        matched_question="Where is the library located?",
    )

    assert (
        context.build_contextual_query(session_id, "How do I connect to WiFi?")
        == "How do I connect to WiFi?"
    )


def test_contextual_query_does_not_pollute_independent_short_question():
    context = ContextManager(max_turns=3)
    session_id = "session-1"

    context.add_turn(session_id, "user", "Tuition fees")
    context.add_turn(
        session_id,
        "bot",
        "For tuition fee amounts, refer to official XMUM tuition fee information.",
        matched_question="Where can I find tuition fee information?",
    )

    assert (
        context.build_contextual_query(session_id, "What intakes are available?")
        == "What intakes are available?"
    )


def test_history_is_pruned_by_turn_window():
    context = ContextManager(max_turns=1)
    session_id = "session-1"

    context.add_turn(session_id, "user", "first")
    context.add_turn(session_id, "bot", "first answer")
    context.add_turn(session_id, "user", "second")
    context.add_turn(session_id, "bot", "second answer")

    assert [item["message"] for item in context.get_history(session_id)] == [
        "second",
        "second answer",
    ]
