import os
import itertools
import json
import requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()


class GeminiTranslator:
    """
    Handles translation and grammar correction of user queries (preprocessing)
    and translating the retrieved answer back to the user language (postprocessing).
    Uses round-robin key rotation to distribute quota evenly across all keys.
    Skips the Gemini call entirely for English input (fast-path heuristic).
    """

    # English words that appear frequently in campus chatbot queries.
    _ENGLISH_INDICATORS = frozenset([
        "what", "when", "where", "how", "why", "who", "which",
        "is", "are", "can", "do", "does", "did", "will", "would",
        "library", "hours", "wifi", "hostel", "scholarship", "campus",
        "the", "and", "to", "for", "with", "about", "application", "fee",
        "opening", "time", "deadline", "contact", "email", "phone",
        "register", "course", "class", "schedule", "exam", "result",
        "cafeteria", "bus", "transport", "login", "password", "portal",
    ])

    def __init__(self):
        self.api_keys = []
        for key_name in ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3"]:
            val = os.getenv(key_name)
            if val and val.strip() and val.strip() != "your-gemini-api-key-here":
                self.api_keys.append(val.strip())

        # Keep self.api_key for backward compatibility
        self.api_key = self.api_keys[0] if self.api_keys else None

        # Round-robin key iterator
        self._key_cycle = itertools.cycle(self.api_keys) if self.api_keys else None

        primary_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        fallback_candidates = ["gemini-2.0-flash", "gemini-1.5-flash"]
        self.models = [primary_model]
        for m in fallback_candidates:
            if m not in self.models:
                self.models.append(m)

    def is_available(self) -> bool:
        return len(self.api_keys) > 0

    def _next_key(self) -> Optional[str]:
        if self._key_cycle:
            return next(self._key_cycle)
        return None

    def _looks_english(self, text: str) -> bool:
        """
        Fast local heuristic: return True if the query looks like English.
        Counts known English campus-query words; threshold = 2 matches.
        This avoids a Gemini API call for the vast majority of queries.
        """
        words = text.lower().split()
        matches = sum(1 for w in words if w.rstrip("?.,!") in self._ENGLISH_INDICATORS)
        return matches >= 2

    def _call_gemini(self, payload: dict, timeout: int = 10) -> Optional[dict]:
        """
        Try each API key once in round-robin order.
        Returns parsed response dict on first success, None if all fail.
        """
        headers = {"Content-Type": "application/json"}
        attempted: set = set()

        for _ in range(len(self.api_keys)):
            api_key = self._next_key()
            if not api_key or api_key in attempted:
                continue
            attempted.add(api_key)

            for model_name in self.models:
                url = (
                    f"https://generativelanguage.googleapis.com/v1beta/models/"
                    f"{model_name}:generateContent?key={api_key}"
                )
                try:
                    resp = requests.post(url, headers=headers, json=payload, timeout=timeout)
                    if resp.status_code == 200:
                        return resp.json()
                    print(
                        f"[Translator] Key {api_key[:8]}... model {model_name}"
                        f" status {resp.status_code}"
                    )
                    if resp.status_code in (429, 403) or (
                        resp.status_code == 400 and "API key" in resp.text
                    ):
                        break  # exhausted key — try next key
                except Exception as exc:
                    print(f"[Translator] Key {api_key[:8]}... error: {exc}")
                    continue

        return None

    def preprocess_query(self, user_query: str) -> Dict[str, Any]:
        """
        Detect language and translate/correct the query to English.
        Skips the Gemini call entirely if the query already looks English.
        """
        # Fast path: skip Gemini for English queries (saves ~1 API call per request)
        if self._looks_english(user_query):
            return {
                "detected_language": "English",
                "is_english": True,
                "cleaned_english_query": user_query,
            }

        if not self.is_available():
            return {
                "detected_language": "English",
                "is_english": True,
                "cleaned_english_query": user_query,
            }

        prompt = (
            'You are a multilingual preprocessing assistant for a campus chatbot.\n'
            'Your task is to analyze the user\'s input query and perform the following:\n'
            '1. Detect the language of the query.\n'
            '2. Translate the query to English if it is in another language.\n'
            '3. Correct grammar, spelling, and typos.\n'
            '4. Rephrase to match campus FAQ terminology '
            '(e.g. "library hours", "hostel application", "wifi connection").\n\n'
            'Output the result strictly conforming to the JSON schema.\n\n'
            f'User Input: "{user_query}"'
        )

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "detected_language": {"type": "STRING"},
                        "is_english": {"type": "BOOLEAN"},
                        "cleaned_english_query": {"type": "STRING"},
                    },
                    "required": ["detected_language", "is_english", "cleaned_english_query"],
                },
            },
        }

        res_data = self._call_gemini(payload, timeout=10)
        if not res_data:
            print("[Translator] All keys exhausted for preprocessing.")
            return {
                "detected_language": "English",
                "is_english": True,
                "cleaned_english_query": user_query,
            }

        try:
            result_text = (
                res_data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
                .strip()
            )
            result_json = json.loads(result_text)
            return {
                "detected_language": result_json.get("detected_language", "English"),
                "is_english": bool(result_json.get("is_english", True)),
                "cleaned_english_query": result_json.get(
                    "cleaned_english_query", user_query
                ),
            }
        except Exception as exc:
            print(f"[Translator] Failed to parse preprocessing response: {exc}")
            return {
                "detected_language": "English",
                "is_english": True,
                "cleaned_english_query": user_query,
            }

    def translate_response(self, english_answer: str, target_language: str) -> str:
        """
        Translate the English answer back to the user's language.
        Returns the original answer if translation fails or target is English.
        """
        if (
            not self.is_available()
            or not target_language
            or target_language.lower() == "english"
        ):
            return english_answer

        prompt = (
            f"You are a professional translator.\n"
            f"Translate the following campus chatbot answer from English into {target_language}.\n"
            f"Keep the translation natural, polite, and accurate. Retain all details "
            f"(hours, links, emails, phone numbers, formatting).\n"
            f"Do not add introductory or concluding remarks. Output only the translated text.\n\n"
            f"English Answer:\n{english_answer}"
        )

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "maxOutputTokens": 4096,
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "translated_text": {"type": "STRING"},
                    },
                    "required": ["translated_text"],
                },
            },
        }

        res_data = self._call_gemini(payload, timeout=10)
        if not res_data:
            print("[Translator] All keys exhausted for translation.")
            return english_answer

        try:
            result_text = (
                res_data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
                .strip()
            )
            result_json = json.loads(result_text)
            return result_json.get("translated_text", english_answer)
        except Exception as exc:
            print(f"[Translator] Failed to parse translation response: {exc}")
            return english_answer
