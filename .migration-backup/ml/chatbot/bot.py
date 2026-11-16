# bot.py

from chatbot.entity_recognizer import extract_entities
from chatbot.intent_classifier import IntentClassifier
from chatbot.retriever import KnowledgeRetriever, KnowledgeItem

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class ChatbotResponse:
    """Structured response from the chatbot."""
    answer: str
    confidence_score: float
    matched_question: Optional[str] = None
    module: Optional[str] = None
    sub_intent: Optional[str] = None
    extracted_entities: Optional[Dict[str, List[str]]] = None
    top_alternatives: Optional[List[Tuple[str, float]]] = None
    debug_info: Optional[str] = None


class Bot:
    """
    XMUMC Campus Assistant — main chatbot orchestrator.

    Pipeline:
    1. User sends message
    2. Extract entities (what are they asking about?)
    3. Classify intent (which module/category?)
    4. Retrieve matching answer from knowledge base
    5. Return structured response
    """

    def __init__(self):
        """
        Initialize the chatbot with all required components.
        Loads knowledge base from the configured source.
        """
        self.intent_classifier = IntentClassifier()
        self.retriever = KnowledgeRetriever()
        print(
            "[Chatbot] ✓ Initialized with intent classifier and "
            f"{self.retriever.source} knowledge base"
        )

    ACADEMIC_RESPONSE_LABELS = {
        "academic_system": "Academic System",
        "courses_syllabus": "Course Registration",
        "leave_attendance": "Leave & Attendance",
        "academic_calendar": "Academic Calendar",
        "exams_grades": "Exams & Results",
        "programme_transfer": "Programme Transfer",
        "finance_fees": "Fees & Scholarships",
        "admissions_enrollment": "Admissions & Enrollment",
        "visa_immigration": "Visa & Immigration",
        "postgrad_resources": "Postgraduate Resources",
        "internship_career": "Career & Internship",
    }

    def process_message(
        self,
        user_message: str,
        debug: bool = True,
    ) -> ChatbotResponse:
        """
        Process a user message through the full pipeline.

        Args:
            user_message: Raw user input
            debug: Whether to include detailed debug info

        Returns:
            ChatbotResponse with answer and metadata
        """
        # Step 1: Extract Entities
        entities = extract_entities(user_message)

        # Step 2: Classify Intent
        module, sub_intent = self.intent_classifier.classify(user_message)

        # Step 3: Retrieve Answer
        if module == "unknown":
            fallback_response = self._try_global_retrieval(
                user_message, entities, debug, reason="intent_unknown"
            )
            if fallback_response:
                return fallback_response
            return self._handle_unknown(user_message, entities, debug)

        best_item, confidence, all_scores = self.retriever.retrieve(
            module=module,
            user_message=user_message,
            extracted_entities=entities,
            sub_intent=sub_intent
        )

        # Step 4: Build Response
        if best_item and confidence > 0:
            return self._build_success_response(
                best_item, confidence, all_scores,
                module, sub_intent, entities, debug
            )
        else:
            fallback_response = self._try_global_retrieval(
                user_message, entities, debug, reason=f"no_match:{module}/{sub_intent}"
            )
            if fallback_response:
                return fallback_response
            return self._handle_no_match(module, entities, debug)

    def _try_global_retrieval(
        self,
        user_message: str,
        entities: Dict[str, List[str]],
        debug: bool,
        reason: str,
    ) -> Optional[ChatbotResponse]:
        """Fallback to all modules when intent classification is too narrow."""
        best_item, confidence, all_scores = self.retriever.retrieve_across_modules(
            user_message=user_message,
            extracted_entities=entities,
        )

        if not best_item or confidence < 4.0:
            return None

        response = self._build_success_response(
            best_item,
            confidence,
            all_scores,
            best_item.module,
            best_item.sub_intent or "unknown",
            entities,
            debug,
        )
        if response.debug_info:
            response.debug_info += f" | [Fallback] global_retrieval:{reason}"
        return response

    def _handle_greeting(self, debug: bool) -> ChatbotResponse:
        """Handle greeting-only messages before NLP classification."""
        debug_info = ""
        if debug:
            debug_info = "[Preprocessor] Greeting detected before intent classification."

        return ChatbotResponse(
            answer=(
                "Hello! I'm the XMUM Campus Assistant. "
                "You can ask me about library hours, hostel, WiFi, scholarships, "
                "course registration, facilities, or academic matters."
            ),
            confidence_score=1.0,
            module="small_talk",
            sub_intent="greeting",
            debug_info=debug_info
        )

    def _build_success_response(
        self,
        best_item: KnowledgeItem,
        confidence: float,
        all_scores: List[Tuple[KnowledgeItem, float]],
        module: str,
        sub_intent: str,
        entities: Dict[str, List[str]],
        debug: bool
    ) -> ChatbotResponse:
        """Build a successful response with match found."""
        top_alternatives = [
            (item.question, score)
            for item, score in all_scores[:5]
            if score > 0
        ]

        debug_info = ""
        if debug:
            debug_info = self._generate_debug_info(
                best_item, confidence, top_alternatives, entities, module, sub_intent
            )

        matched_sub_intent = best_item.sub_intent or sub_intent

        return ChatbotResponse(
            answer=self._format_answer(best_item, module, matched_sub_intent),
            confidence_score=confidence,
            matched_question=best_item.question,
            module=module,
            sub_intent=matched_sub_intent,
            extracted_entities=entities if entities else None,
            top_alternatives=top_alternatives,
            debug_info=debug_info
        )

    def _format_answer(
        self,
        best_item: KnowledgeItem,
        module: str,
        sub_intent: str,
    ) -> str:
        """Apply small module-aware presentation templates."""
        if module != "academic_navigation":
            return best_item.answer

        label = self.ACADEMIC_RESPONSE_LABELS.get(sub_intent, "Academic Navigation")
        answer = best_item.answer.strip()

        reminder = (
            "For official action, use the relevant XMUM system or contact the "
            "Academic Affairs Office / responsible office if your case is personal, "
            "urgent, or deadline-sensitive."
        )

        return (
            f"{label}\n"
            f"- Answer: {answer}\n"
            f"- Reminder: {reminder}"
        )

    def _handle_no_match(
        self,
        module: str,
        entities: Dict[str, List[str]],
        debug: bool
    ) -> ChatbotResponse:
        """Handle cases where no match was found."""
        answer = (
            "Sorry, I couldn't find specific information about that. "
            "Try asking about: library hours, hostel rules, scholarship, "
            "course registration, WiFi, facilities, or academic calendars."
        )

        debug_info = ""
        if debug:
            debug_info = f"[Module: {module}] No high-confidence match found"

        return ChatbotResponse(
            answer=answer,
            confidence_score=0.0,
            module=module,
            sub_intent="unknown",
            extracted_entities=entities if entities else None,
            debug_info=debug_info
        )

    def _handle_unknown(
        self,
        user_message: str,
        entities: Dict[str, List[str]],
        debug: bool
    ) -> ChatbotResponse:
        """Handle case where intent cannot be classified."""
        answer = (
            "I'm not sure what you're asking about. "
            "I can help with: campus information, hostel, library, "
            "academic matters, scholarships, WiFi, and more. "
            "What would you like to know?"
        )

        debug_info = ""
        if debug:
            debug_info = "[Intent] Could not classify the user's intent."

        return ChatbotResponse(
            answer=answer,
            confidence_score=0.0,
            module="unknown",
            sub_intent="unknown",
            extracted_entities=entities if entities else None,
            debug_info=debug_info
        )

    def _generate_debug_info(
        self,
        best_item: KnowledgeItem,
        confidence: float,
        top_alternatives: List[Tuple[str, float]],
        entities: Dict[str, List[str]],
        module: str,
        sub_intent: str,
    ) -> str:
        """Generate detailed debug information."""
        debug_lines = [
            f"[Module] {module}",
            f"[Sub-Intent] {sub_intent}",
            f"[Confidence] {confidence:.1f}",
            f"[Matched Question] {best_item.question}",
        ]

        if entities:
            entity_str = ", ".join(
                f"{k}:{','.join(v)}" for k, v in entities.items()
            )
            debug_lines.append(f"[Entities] {entity_str}")

        if top_alternatives:
            alt_str = " | ".join(
                f"{q[:30]}... ({s:.1f})"
                for q, s in top_alternatives[:3]
            )
            debug_lines.append(f"[Top Matches] {alt_str}")

        return " | ".join(debug_lines)

    def get_module_suggestions(self, module: str, limit: int = 5) -> List[str]:
        """Get suggested questions for a module. Useful for UI quick-suggestions."""
        items = self.retriever.retrieve_all_for_module(module)
        return [item.question for item in items[:limit]]
