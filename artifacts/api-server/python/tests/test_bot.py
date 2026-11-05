import pytest

from chatbot.bot import Bot


@pytest.fixture
def bot(monkeypatch):
    monkeypatch.setenv("CHATBOT_KB_SOURCE", "local")
    return Bot()


class TestBotResponses:
    def test_who_are_you_returns_chatbot_identity(self, bot):
        response = bot.process_message("Who are you?", debug=False)

        assert response.module == "general"
        assert response.sub_intent == "bot_identity"
        assert "XMUM Campus Assistant" in response.answer
        assert "sports clubs" not in response.answer.lower()

    def test_what_can_you_do_returns_chatbot_capabilities(self, bot):
        response = bot.process_message("What can you do?", debug=False)

        assert response.module == "general"
        assert response.sub_intent == "bot_capabilities"
        assert "I can help you with" in response.answer
        assert "Badminton Club" not in response.answer

    def test_chatbot_information_query_returns_general_answer(self, bot):
        response = bot.process_message("What chatbot information can you provide?", debug=False)

        assert response.module == "general"
        assert response.sub_intent in {"bot_capabilities", "bot_identity", "bot_nature"}
        assert "chatbot" in response.answer.lower()

    @pytest.mark.parametrize(
        ("message", "expected_question"),
        [
            ("What topics can you answer?", "What topics can you answer?"),
            ("What can you not do?", "What can you not do?"),
            ("Can you help with non-campus questions?", "Can you help with non-campus questions?"),
            ("Are you an official XMUM chatbot?", "Are you an official XMUM chatbot?"),
            ("Where does your information come from?", "Where does your information come from?"),
            ("Is your information accurate / up to date?", "Is your information accurate or up to date?"),
            ("Can you contact offices for me?", "Can you contact offices for me?"),
            ("Can you make bookings?", "Can you make bookings?"),
            ("Can you submit forms?", "Can you submit forms?"),
            ("Can you remember my data?", "Can you remember my data?"),
            ("What data do you collect?", "What data do you collect?"),
            ("What version are you?", "What version are you?"),
            ("Do you support Malay and Chinese?", "Do you support Malay and Chinese?"),
            ("Can I ask in Chinese?", "Can I ask in Chinese?"),
            ("How do I report a wrong answer?", "How do I report a wrong answer?"),
            ("What should I do if your answer is wrong?", "What should I do if your answer is wrong?"),
        ],
    )
    def test_general_policy_queries_return_general_answers(self, bot, message, expected_question):
        response = bot.process_message(message, debug=False)

        assert response.module == "general"
        assert response.matched_question == expected_question

    def test_aska_routes_to_maintenance_answer(self, bot):
        response = bot.process_message("AskA", debug=False)

        assert response.module == "campus_life"
        assert response.sub_intent == "hostel_rules_maintenance"
        assert "AskA Maintenance" in response.answer

    def test_follow_up_uses_previous_context_with_same_session(self, bot):
        session_id = "context-session"

        first_response = bot.process_message(
            "Where is the library?",
            session_id=session_id,
            debug=False,
        )
        follow_up_response = bot.process_message(
            "What time does it open?",
            session_id=session_id,
            debug=True,
        )

        assert first_response.sub_intent == "library"
        assert follow_up_response.sub_intent == "library"
        assert "09:00" in follow_up_response.answer
        assert "[Context] Query expanded to:" in follow_up_response.debug_info

    @pytest.mark.parametrize(
        ("message", "expected_sub_intent", "expected_question", "answer_fragment"),
        [
            (
                "How can students make an appointment with the Career Services Office?",
                "internship_career",
                "How can students make an appointment with the Career Services Office?",
                "careerservices@xmu.edu.my",
            ),
            (
                "Who is eligible to apply for student accommodation?",
                "housing_application",
                "Who is eligible to apply for student accommodation?",
                "active and full-time students",
            ),
            (
                "Is there a public refrigerator in the residence?",
                "hostel_rules_maintenance",
                "What are the guidelines for using public refrigerators at XMUM Residences?",
                "public refrigerators are available",
            ),
            (
                "Where is the Student Activity Centre?",
                "facilities_services",
                "Where is the Student Activity Centre?",
                "Building B1",
            ),
            (
                "how do I contact campus security?",
                "health_safety",
                "How do I contact campus security?",
                "019-348 9999",
            ),
            (
                "Tuition fees",
                "finance_fees",
                "Where can I find tuition fee information?",
                "tuition fee amounts",
            ),
            (
                "What intakes are available?",
                "admissions_enrollment",
                "What intakes are available?",
                "February, April, and September",
            ),
        ],
    )
    def test_known_problem_queries_hit_expected_items(
        self,
        bot,
        message,
        expected_sub_intent,
        expected_question,
        answer_fragment,
    ):
        response = bot.process_message(message, session_id=f"case-{message}", debug=True)

        assert response.sub_intent == expected_sub_intent
        assert response.matched_question == expected_question
        assert answer_fragment.lower() in response.answer.lower()
