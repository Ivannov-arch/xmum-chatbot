# placeholder_test_intent_classifier.py
# tests/test_intent_classifier.py
#
# Unit tests for chatbot/intent_classifier.py
#
# Test cases to implement:
#   - "Where is the library?" → "campus_life"
#   - "How do I register for a course?" → "admin_directory"
#   - "How do I log in to the AC system?" → "academic_navigation"
#   - "Tell me a joke" → "unknown"
#   - Empty string → "unknown"
#   - All-whitespace string → "unknown"
#
# TODO: write actual test cases once IntentClassifier is implemented.

import pytest
from chatbot.intent_classifier import IntentClassifier


@pytest.fixture
def classifier():
    """Return a fresh IntentClassifier instance for each test."""
    return IntentClassifier()


class TestIntentClassifier:
    """PLACEHOLDER test suite for IntentClassifier."""

    def test_returns_tuples(self, classifier):
        """classify() should always return a tuple."""
        result = classifier.classify("hello")
        assert isinstance(result, tuple)
        assert len(result) == 2
        assert isinstance(result[0], str)
        assert isinstance(result[1], str)

    def test_unknown_for_empty_input(self, classifier):
        """Empty input should return 'unknown'."""
        # PLACEHOLDER — update once implemented
        result = classifier.classify("")
        assert result == ("unknown", "unknown")

    def test_campus_life_library(self, classifier):
        assert classifier.classify("Where is the library?") == ("campus_life", "library")
    def test_campus_life_wifi(self, classifier):
        assert classifier.classify("how do I connect to the wifi?") == ("campus_life", "it_connectivity")
    def test_campus_life_internet_synonym(self, classifier):
        assert classifier.classify("how do I connect to the internet?") == ("campus_life", "it_connectivity")
    def test_long_campus_life_maintenance_query(self, classifier):
        result = classifier.classify(
            "I am staying in the hostel and my room light is broken, who should I contact for maintenance?"
        )
        assert result == ("campus_life", "hostel_rules_maintenance")
    def test_long_campus_life_printing_query(self, classifier):
        assert classifier.classify("Where can I print documents in the library?") == ("campus_life", "library")
    def test_campus_life_food_order_query(self, classifier):
        assert classifier.classify("Can I order chicken rice through this chatbot?") == ("campus_life", "food_dining")
    def test_campus_life_canteen_hours_query(self, classifier):
        assert classifier.classify("What are canteen operation hours and off days?") == ("campus_life", "food_dining")
    def test_campus_life_muslim_friendly_food_query(self, classifier):
        assert classifier.classify("Where can I get halal or Muslim-friendly food?") == ("campus_life", "food_dining")
    def test_campus_life_chinese_food_recommendation_query(self, classifier):
        assert classifier.classify("Can you recommend Chinese food at the canteen?") == ("campus_life", "food_dining")
    def test_campus_life_maintenance_request_query(self, classifier):
        assert classifier.classify("How do I submit a maintenance repair request?") == ("campus_life", "hostel_rules_maintenance")
    def test_campus_life_aska_defaults_to_maintenance(self, classifier):
        assert classifier.classify("AskA") == ("campus_life", "hostel_rules_maintenance")
    def test_campus_life_sport_query(self, classifier):
        assert classifier.classify("What sport facilities are available?") == ("campus_life", "facilities_services")
    def test_campus_life_gym_query(self, classifier):
        assert classifier.classify("Where is the gym and what are the operating hours?") == ("campus_life", "facilities_services")
    def test_campus_life_swimming_pool_query(self, classifier):
        assert classifier.classify("Who can use the swimming pool?") == ("campus_life", "facilities_services")
    def test_campus_life_court_booking_query(self, classifier):
        assert classifier.classify("Do I need to book a badminton court?") == ("campus_life", "facilities_services")
    def test_campus_life_surau_query(self, classifier):
        assert classifier.classify("Where is the prayer room or surau?") == ("campus_life", "facilities_services")
    def test_campus_life_atm_query(self, classifier):
        assert classifier.classify("Where are the Maybank and Public Bank ATMs?") == ("campus_life", "facilities_services")
    def test_campus_life_parcel_query(self, classifier):
        assert classifier.classify("Where can I collect my parcel?") == ("campus_life", "documents_identity")
    def test_campus_life_clubs_query(self, classifier):
        assert classifier.classify("What clubs and societies can I join?") == ("campus_life", "clubs_activities")
    def test_general_bot_identity_query(self, classifier):
        assert classifier.classify("Who are you?") == ("general", "bot_identity")
    def test_general_bot_capabilities_query(self, classifier):
        assert classifier.classify("What can you do?") == ("general", "bot_capabilities")
    def test_general_chatbot_information_query(self, classifier):
        assert classifier.classify("What chatbot information can you provide?") == ("general", "bot_capabilities")
    @pytest.mark.parametrize(
        ("message", "sub_intent"),
        [
            ("What topics can you answer?", "bot_scope"),
            ("What can you not do?", "bot_limitations"),
            ("Can you help with non-campus questions?", "bot_scope"),
            ("Are you an official XMUM chatbot?", "bot_official_status"),
            ("Where does your information come from?", "bot_information_source"),
            ("Is your information accurate / up to date?", "bot_accuracy"),
            ("Can you contact offices for me?", "bot_action_limitations"),
            ("Can you make bookings?", "bot_action_limitations"),
            ("Can you submit forms?", "bot_action_limitations"),
            ("Can you remember my data?", "bot_privacy"),
            ("What data do you collect?", "bot_privacy"),
            ("What version are you?", "bot_version"),
            ("Do you support Malay and Chinese?", "language_capability"),
            ("Can I ask in Chinese?", "language_capability"),
            ("How do I report a wrong answer?", "answer_feedback"),
            ("What should I do if your answer is wrong?", "answer_feedback"),
        ],
    )
    def test_general_chatbot_policy_queries(self, classifier, message, sub_intent):
        assert classifier.classify(message) == ("general", sub_intent)
    def test_admin_directory_about(self, classifier):
        assert classifier.classify("Who is the founder of XMU?") == ("admin_directory", "about_xmum")
    def test_admin_directory_founded_synonym(self, classifier):
        assert classifier.classify("Who founded Xiamen University?") == ("admin_directory", "about_xmum")
    def test_academic_navigation_exams(self, classifier):
        assert classifier.classify("When is the final exam?") == ("academic_navigation", "exams_grades")
    def test_academic_navigation_ac_system(self, classifier):
        assert classifier.classify("How do I log in to the AC system?") == ("academic_navigation", "academic_system")
    def test_academic_navigation_leave_application(self, classifier):
        assert classifier.classify("How do I apply leave through e-services?") == ("academic_navigation", "leave_attendance")
    def test_academic_navigation_course_add_drop(self, classifier):
        assert classifier.classify("How do I add or drop a course?") == ("academic_navigation", "courses_syllabus")
    def test_academic_navigation_programme_transfer(self, classifier):
        assert classifier.classify("How can I change programme and transfer credits?") == ("academic_navigation", "programme_transfer")
    def test_unknown_for_off_topic(self, classifier):
        assert classifier.classify("Tell me a joke") == ("unknown", "unknown")
    # TODO: uncomment and complete once IntentClassifier is implemented
    # def test_campus_life_library(self, classifier):
    #     assert classifier.classify("Where is the library?") == "campus_life"

    # def test_admin_directory_registration(self, classifier):
    #     assert classifier.classify("How do I register for courses?") == "admin_directory"

    # def test_academic_navigation_ac_system(self, classifier):
    #     assert classifier.classify("How do I log in to the AC system?") == "academic_navigation"

    # def test_unknown_for_off_topic(self, classifier):
    #     assert classifier.classify("Tell me a joke") == "unknown"
