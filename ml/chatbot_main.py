# ============================================================================
# chatbot/chatbot_main.py
#
# Main Chatbot Controller - orchestrates the full NLP pipeline:
#   1. Entity Recognition (entity_recognizer.py)
#   2. Intent Classification (intent_classifier.py)
#   3. Knowledge Retrieval (retriever.py)
#   4. Response Generation
#
# This is the entry point that ties all components together.
# ============================================================================

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import json
from uuid import uuid4

# Import your friends' modules from the chatbot package
from chatbot.context_manager import ContextManager
from chatbot.entity_recognizer import extract_entities, print_entities
from chatbot.intent_classifier import IntentClassifier
from chatbot.preprocessor import is_greeting
from chatbot.retriever import KnowledgeRetriever, KnowledgeItem
from chatbot.translator import GeminiTranslator


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
    original_query: Optional[str] = None
    detected_language: Optional[str] = None
    translated_answer: Optional[str] = None
    cleaned_query: Optional[str] = None


class XMUMChatbot:
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
        self.context = ContextManager()
        self.retriever = KnowledgeRetriever()
        self.translator = GeminiTranslator()
        self.matcher = self.retriever.gemini_matcher

        print(
            "[Chatbot] [OK] Initialized with intent classifier, "
            f"{self.retriever.source} knowledge base, and translator."
        )
    
    def process_message(
        self,
        user_message: str,
        session_id: str = "default",
        debug: bool = True
    ) -> ChatbotResponse:
        """
        Process a user message through the full pipeline.
        
        Args:
            user_message: Raw user input
            debug: Whether to include detailed debug info
        
        Returns:
            ChatbotResponse with answer and metadata
        """
        # ──────────────────────────────────────────────────────────────
        # Step 0: Handle short conversational greetings
        # ──────────────────────────────────────────────────────────────
        if is_greeting(user_message):
            response = self._handle_greeting(debug)
            self._store_turns(session_id, user_message, response)
            return response

        # ──────────────────────────────────────────────────────────────
        # Step 0.1: Check for exact match in database (fast-path)
        # ──────────────────────────────────────────────────────────────
        exact_match_item = None
        cleaned_input = user_message.strip().lower().rstrip('?').strip()
        for item in self.retriever.knowledge_base:
            db_question = item.question.strip().lower().rstrip('?').strip()
            if cleaned_input == db_question:
                exact_match_item = item
                break

        if exact_match_item:
            response = self._build_success_response(
                best_item=exact_match_item,
                confidence=10.0,
                all_scores=[(exact_match_item, 10.0)],
                module=exact_match_item.module,
                sub_intent=exact_match_item.sub_intent or "exact_match",
                entities={},
                debug=debug
            )
            if debug:
                response.debug_info = (
                    f"{response.debug_info} | [Exact Match] Bypassed Gemini translation and NLP pipeline."
                    if response.debug_info
                    else "[Exact Match] Bypassed Gemini translation and NLP pipeline."
                )
            response.original_query = user_message
            response.detected_language = "English"
            response.cleaned_query = user_message
            
            self._store_turns(session_id, user_message, response)
            return response

        # ──────────────────────────────────────────────────────────────
        # Step 0.5: Translate & Correct Query (Preprocessing)
        # ──────────────────────────────────────────────────────────────
        detected_language = "English"
        is_english = True
        cleaned_query = user_message

        if self.translator.is_available():
            translation_info = self.translator.preprocess_query(user_message)
            detected_language = translation_info.get("detected_language", "English")
            is_english = translation_info.get("is_english", True)
            cleaned_query = translation_info.get("cleaned_english_query", user_message)

        contextual_query = self.context.build_contextual_query(session_id, cleaned_query)

        # ──────────────────────────────────────────────────────────────
        # Step 1: Extract Entities
        # ──────────────────────────────────────────────────────────────
        entities = extract_entities(contextual_query)
        
        # ──────────────────────────────────────────────────────────────
        # Step 2: Classify Intent
        # ──────────────────────────────────────────────────────────────
        module, sub_intent = self.intent_classifier.classify(contextual_query)
        
        # ──────────────────────────────────────────────────────────────
        # Step 3: Retrieve Answer
        # ──────────────────────────────────────────────────────────────
        if module == "unknown":
            fallback_response = self._try_global_retrieval(
                contextual_query, entities, debug, reason="intent_unknown"
            )
            if fallback_response:
                response = fallback_response
            else:
                response = self._handle_unknown(cleaned_query, entities, debug)

        else:
            best_item, confidence, all_scores = self.retriever.retrieve(
                module=module,
                user_message=contextual_query,
                extracted_entities=entities,
                sub_intent=sub_intent
            )

            # ──────────────────────────────────────────────────────────────
            # Step 3.5: RAG — synthesize answer from retrieved chunks
            # ──────────────────────────────────────────────────────────────
            rag_answer = ""
            if all_scores:
                top_chunks = [(item, s) for item, s in all_scores if s > 0][:5]
                if top_chunks:
                    rag_answer = self.matcher.generate_rag_answer(
                        user_query=contextual_query,
                        retrieved_chunks=top_chunks,
                        language=detected_language
                    )

            # ──────────────────────────────────────────────────────────────
            # Step 4: Build Response
            # ──────────────────────────────────────────────────────────────
            if best_item and confidence > 0:
                response = self._build_success_response(
                    best_item, confidence, all_scores, module, sub_intent,
                    entities, debug, rag_answer=rag_answer
                )
            else:
                fallback_response = self._try_global_retrieval(
                    contextual_query, entities, debug, reason=f"no_match:{module}/{sub_intent}"
                )
                if fallback_response:
                    response = fallback_response
                else:
                    response = self._handle_no_match(module, entities, debug)


        self._append_context_debug(response, cleaned_query, contextual_query, debug)

        # Populate translation metadata in response
        response.original_query = user_message
        response.detected_language = detected_language
        response.cleaned_query = cleaned_query

        # ──────────────────────────────────────────────────────────────
        # Step 5: Translate Response back to User's Language (Postprocessing)
        # ──────────────────────────────────────────────────────────────
        if not is_english and response.answer:
            english_answer = response.answer
            translated_ans = self.translator.translate_response(english_answer, detected_language)
            response.answer = translated_ans
            response.translated_answer = translated_ans
            
            if debug:
                translation_debug = f"[Translation] Original English Answer: {english_answer}"
                response.debug_info = (
                    f"{response.debug_info} | {translation_debug}"
                    if response.debug_info
                    else translation_debug
                )

        self._store_turns(session_id, user_message, response)
        return response

    def reset(self, session_id: str = "default") -> None:
        """Clear conversation context for one session."""
        self.context.clear(session_id)

    def _store_turns(
        self,
        session_id: str,
        user_message: str,
        response: ChatbotResponse,
    ) -> None:
        self.context.add_turn(session_id, "user", user_message)
        self.context.add_turn(
            session_id,
            "bot",
            response.answer,
            module=response.module,
            sub_intent=response.sub_intent,
            confidence=response.confidence_score,
            matched_question=response.matched_question,
        )

    def _append_context_debug(
        self,
        response: ChatbotResponse,
        user_message: str,
        contextual_query: str,
        debug: bool,
    ) -> None:
        if not debug or contextual_query == user_message:
            return

        context_note = f"[Context] Query expanded to: {contextual_query}"
        response.debug_info = (
            f"{response.debug_info} | {context_note}"
            if response.debug_info
            else context_note
        )

    def _try_global_retrieval(
        self,
        user_message: str,
        entities: Dict[str, List[str]],
        debug: bool,
        reason: str,
    ) -> Optional[ChatbotResponse]:
        """Fallback to all modules when the intent layer is too narrow."""
        best_item, confidence, all_scores = self.retriever.retrieve_across_modules(
            user_message=user_message,
            extracted_entities=entities,
        )

        if not best_item or confidence < 4.0:
            return None

        response = self._build_success_response(
            best_item=best_item,
            confidence=confidence,
            all_scores=all_scores,
            module=best_item.module,
            sub_intent=best_item.sub_intent or "unknown",
            entities=entities,
            debug=debug,
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
        debug: bool,
        rag_answer: str = ""
    ) -> ChatbotResponse:
        """Build a successful response with match found."""
        
        # Prepare top alternatives for scoring display
        top_alternatives = [
            (item.question, score)
            for item, score in all_scores[:5]
            if score > 0
        ]
        
        debug_info = ""
        if debug:
            debug_info = self._generate_debug_info(
                best_item, confidence, top_alternatives, entities,
                module, sub_intent
            )
        
        return ChatbotResponse(
            answer=rag_answer if rag_answer else best_item.answer,
            confidence_score=confidence,
            matched_question=best_item.question,
            module=module,
            sub_intent=sub_intent,
            extracted_entities=entities if entities else None,
            top_alternatives=top_alternatives,
            debug_info=debug_info
        )
    
    def _handle_no_match(
        self,
        module: str,
        entities: Dict[str, List[str]],
        debug: bool
    ) -> ChatbotResponse:
        """Handle case where no good match is found."""
        
        answer = (
            "Sorry, I couldn't find specific information about that. "
            "Try asking about: library hours, hostel rules, scholarship, "
            "course registration, WiFi, facilities, or academic calendars."
        )
        
        debug_info = ""
        if debug:
            debug_info = f"[Module: {module}] No high-confidence match found."
        
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
        sub_intent: str
    ) -> str:
        """Generate detailed debug information for response."""
        
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
        """
        Get suggestion questions for a specific module.
        Useful for UI quick-suggestions.
        """
        items = self.retriever.retrieve_all_for_module(module)
        return [item.question for item in items[:limit]]


# ============================================================================
# FORMATTER — Convert response to different outputs
# ============================================================================

class ResponseFormatter:
    """Format ChatbotResponse for different output targets."""
    
    @staticmethod
    def to_dict(response: ChatbotResponse) -> Dict:
        """Convert response to dictionary (for JSON API)."""
        return {
            "answer": response.answer,
            "confidence": response.confidence_score,
            "matched_question": response.matched_question,
            "module": response.module,
            "sub_intent": response.sub_intent,
            "entities": response.extracted_entities,
            "debug": response.debug_info if response.debug_info else None,
            "original_query": response.original_query,
            "detected_language": response.detected_language,
            "translated_answer": response.translated_answer,
            "cleaned_query": response.cleaned_query,
        }
    
    @staticmethod
    def to_json(response: ChatbotResponse) -> str:
        """Convert response to JSON string."""
        return json.dumps(ResponseFormatter.to_dict(response), indent=2)
    
    @staticmethod
    def to_console(response: ChatbotResponse) -> str:
        """Format for console/CLI output."""
        lines = [
            "=" * 70,
            f"🤖 XMUMC Assistant Response",
            "=" * 70,
            f"\nAnswer:\n{response.answer}",
            f"\n Confidence: {(response.confidence_score / 10.0):.1%}",
        ]
        
        if response.matched_question:
            lines.append(f" Matched Question: {response.matched_question}")
        
        if response.debug_info:
            lines.append(f"\n Debug Info:\n{response.debug_info}")
        
        lines.append("\n" + "=" * 70)
        return "\n".join(lines)
    
    @staticmethod
    def to_html_debug(response: ChatbotResponse) -> str:
        """Format as HTML for embedding in web UI (like your original)."""
        html = f"""
        <div class="bot-response">
            <div class="answer">{response.answer}</div>
            <div class="debug-pill">
                <b>Best match:</b> "{response.matched_question}" 
                — confidence {response.confidence_score:.1f}
            </div>
        </div>
        """
        return html.strip()


# ============================================================================
# INTERACTIVE CLI MODE
# ============================================================================

def run_interactive_cli():
    """
    Run the chatbot in interactive CLI mode.
    Loads knowledge base from Supabase.
    """
    print("\n" + "=" * 70)
    print("  XMUMC Campus Assistant — Interactive Mode (Supabase)")
    print("=" * 70)
    print("Type your questions. Type 'quit' or 'exit' to stop.\n")
    
    chatbot = XMUMChatbot()  # Loads from Supabase automatically
    session_id = f"cli-{uuid4()}"
    
    while True:
        user_input = input("You: ").strip()
        if not user_input:
            continue
        if user_input.lower() in ["quit", "exit"]:
            print("\nGoodbye! ")
            break
        
        response = chatbot.process_message(user_input, session_id=session_id, debug=True)
        print(ResponseFormatter.to_console(response))
        print()


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    try:
        run_interactive_cli()
    except Exception as e:
        print(f" Error: {e}")
        print(f"Make sure .env file has SUPABASE_URL and SUPABASE_ANON_KEY")
        import sys
        sys.exit(1)
