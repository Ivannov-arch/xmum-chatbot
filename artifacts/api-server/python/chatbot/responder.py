# responder.py
from chatbot.bot import ChatbotResponse
import os
import random
from datetime import datetime
from typing import Dict
import json

FALLBACK_MESSAGE = (
    "I'm sorry, I don't have information on that topic yet. "
    "Please try rephrasing your question or contact the relevant XMUM office."
)


class Responder:
    """Small compatibility responder for legacy tests and simple search output."""

    def format(self, results: list[dict], query: str = "") -> str:
        if not results:
            return FALLBACK_MESSAGE

        best = results[0]
        answer = best.get("answer")
        if answer:
            return str(answer)

        return FALLBACK_MESSAGE


class ResponseFormatter:
    """Format ChatbotResponse for different output targets."""
    
    @staticmethod
    def _to_dict(response: ChatbotResponse) -> Dict:
        """Convert response to dictionary (for JSON API)."""
        return {
            "answer": response.answer,
            "confidence": response.confidence_score,
            "matched_question": response.matched_question,
            "module": response.module,
            "sub_intent": response.sub_intent,
            "entities": response.extracted_entities,
            "debug": response.debug_info
        }

    @staticmethod
    def _to_json(response: ChatbotResponse) -> str:
        """Convert response to JSON string."""
        return json.dumps(ResponseFormatter._to_dict(response), indent=2)

    @staticmethod
    def _to_console(response: ChatbotResponse):
        """Format for console/CLI output."""
        lines = [
            "=" * 70,
            f"🤖 XMUMC Assistant Response",
            "=" * 70,
            f"\nAnswer:\n{response.answer}",
            f"\n Confidence: {response.confidence_score:.1%}",
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

        

def log_unrecognized_query(raw_text):
    """
    [Responsibility 4: Unrecognised query logging]
    Automatically logs failed queries alongside a timestamp to a local file
    for administrators to review and patch knowledge gaps later.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] UNRECOGNIZED QUERY: {raw_text}\n"

    try:
        with open("failed_queries.txt", "a", encoding="utf-8") as file:
            file.write(log_entry)
        print("[System Log]: Unknown query successfully logged to 'failed_queries.txt'.")
    except Exception as e:
        print(f"[System Error]: Failed to write to log file: {e}")


def get_varied_fallback_phrase():
    """
    [Responsibility 3 & 6: Escalation prompt & Varied phrasing]
    Uses a randomized pool of responses so the chatbot avoids sounding repetitive.
    Includes an escalation clause directing the user to official campus channels.
    """
    fallback_pool = [
        "I didn't quite catch that. Could you please rephrase your campus-related question?",
        "I'm still learning the XMUM handbook! Could you try asking that another way?",
        "I'm sorry, I don't have information on that topic yet. If your issue is urgent, please contact the XMUM Academic Affairs Office directly."
    ]
    return random.choice(fallback_pool)


def generate_template_response(official_answer, user_name="Student"):
    """
    [Responsibility 5: Template-based response generation]
    Wraps the static CSV handbook answer inside a dynamic response template.
    Injects real-time system greetings, timestamps, and personalized names
    to fulfill the requirement of generating structured templates with dynamic data.
    """

    current_hour = datetime.now().hour
    if current_hour < 12:
        greeting = "Good morning"
    elif current_hour < 18:
        greeting = "Good afternoon"
    else:
        greeting = "Good evening"

    current_date = datetime.now().strftime("%Y-%m-%d")

    template = (
        "[{greeting}, {user}! (Processed on {date})]\n"
        "Here is the official handbook information regarding your query:\n"
        "--------------------------------------------------\n"
        "{answer}\n"
        "--------------------------------------------------"
    )

    return template.format(greeting=greeting, user=user_name, date=current_date, answer=official_answer)


if __name__ == "__main__":
    print("=" * 60)
    print("XMUM CHATBOT MODULE 5 - RESPONDER TEST")
    print("=" * 60)
    print(get_varied_fallback_phrase())
    print(generate_template_response("The library is open 8am-10pm."))
