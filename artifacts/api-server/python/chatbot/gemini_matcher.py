import os
import itertools
import json
import requests
from typing import List, Tuple, Optional
from dotenv import load_dotenv

load_dotenv()


class GeminiMatcher:
    """
    Semantic similarity matching engine using the Gemini API via REST.
    Uses round-robin key rotation to distribute quota evenly across all keys.
    """

    def __init__(self):
        self.api_keys = []
        for key_name in ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3"]:
            val = os.getenv(key_name)
            if val and val.strip() and val.strip() != "your-gemini-api-key-here":
                self.api_keys.append(val.strip())

        # Keep self.api_key for backward compatibility
        self.api_key = self.api_keys[0] if self.api_keys else None

        # Round-robin key iterator for load balancing
        self._key_cycle = itertools.cycle(self.api_keys) if self.api_keys else None

        self.model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    def is_available(self) -> bool:
        return len(self.api_keys) > 0

    def _next_key(self) -> Optional[str]:
        """Get next API key in round-robin rotation."""
        if self._key_cycle:
            return next(self._key_cycle)
        return None

    def _try_all_keys(self, payload: dict, timeout: int = 10) -> Optional[dict]:
        """
        Try each API key once in round-robin order.
        Returns parsed JSON response dict on first success, None if all fail.
        """
        headers = {"Content-Type": "application/json"}
        attempted = set()

        for _ in range(len(self.api_keys)):
            api_key = self._next_key()
            if not api_key or api_key in attempted:
                continue
            attempted.add(api_key)

            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{self.model}:generateContent?key={api_key}"
            )
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=timeout)
                if resp.status_code == 200:
                    return resp.json()
                print(
                    f"[Matcher] Key {api_key[:8]}... status {resp.status_code}"
                )
                if resp.status_code in (429, 403):
                    continue  # quota exhausted — try next key
            except Exception as exc:
                print(f"[Matcher] Key {api_key[:8]}... error: {exc}")
                continue

        return None

    def match_question(
        self, user_query: str, candidates: List[str]
    ) -> Tuple[int, float, str]:
        """
        Match user query to the best candidate question.
        Returns (matched_index, confidence, reasoning).
        matched_index is -1 if no candidate matches.
        """
        if not self.is_available():
            return -1, 0.0, "Gemini API key is not configured."
        if not candidates:
            return -1, 0.0, "No candidates provided."

        formatted_candidates = "\n".join(
            f"[{i}] {q}" for i, q in enumerate(candidates)
        )
        prompt = f"""You are a semantic matching system for a campus chatbot.
Your task is to match the user's input query to the single most relevant question from the list of candidates below.

Rules:
1. You MUST select exactly one question index from the candidates, or output -1 for matched_index if none of them are semantically relevant.
2. Do not use external knowledge or answer the question yourself. Your job is strictly to find if one of the candidate questions matches the user's intent.
3. Be extremely robust to typos, grammar errors, abbreviations, slang, or paraphrases.
4. Output the result strictly conforming to the JSON schema.

User Input: "{user_query}"

Candidate Questions:
{formatted_candidates}
"""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "matched_index": {
                            "type": "INTEGER",
                            "description": "0-based index of the matched question, or -1.",
                        },
                        "confidence": {
                            "type": "NUMBER",
                            "description": "Confidence score 0.0–1.0.",
                        },
                        "reasoning": {
                            "type": "STRING",
                            "description": "Brief reasoning for the match.",
                        },
                    },
                    "required": ["matched_index", "confidence", "reasoning"],
                },
            },
        }

        res_data = self._try_all_keys(payload, timeout=10)
        if not res_data:
            return -1, 0.0, "All API keys failed or were exhausted."

        try:
            parts = (
                res_data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [])
            )
            result_json = json.loads(parts[0].get("text", "{}"))
            matched_index = int(result_json.get("matched_index", -1))
            confidence = float(result_json.get("confidence", 0.0))
            reasoning = result_json.get("reasoning", "")
            if matched_index < -1 or matched_index >= len(candidates):
                matched_index = -1
            return matched_index, confidence, reasoning
        except Exception as exc:
            print(f"[Matcher] Failed to parse response: {exc}")
            return -1, 0.0, f"Parse error: {exc}"

    def generate_rag_answer(
        self,
        user_query: str,
        retrieved_chunks: list,
        language: str = "English",
        chat_history: list = None,
    ) -> str:
        """
        Synthesize a natural answer from retrieved knowledge chunks.
        Gemini acts as a READER only — strictly uses the provided context.
        Returns empty string if generation fails.
        """
        if not self.is_available() or not retrieved_chunks:
            return ""

        context_parts = []
        for i, (item, _score) in enumerate(retrieved_chunks[:5], start=1):
            context_parts.append(f"[Source {i}]\nQ: {item.question}\nA: {item.answer}")
        context = "\n\n".join(context_parts)

        history_text = ""
        if chat_history:
            formatted_turns = []
            for turn in chat_history[-4:]:
                role_label = "Student" if turn.get("role") == "user" else "Assistant"
                formatted_turns.append(f"{role_label}: {turn.get('message')}")
            if formatted_turns:
                history_text = (
                    "--- RECENT CHAT HISTORY ---\n"
                    + "\n".join(formatted_turns)
                    + "\n---------------------------\n\n"
                )

        prompt = f"""You are a helpful campus assistant for XMUM (Xiamen University Malaysia).
Your job is to answer the student's question using ONLY the context provided below.

STRICT RULES:
1. Answer ONLY from the provided context. Do NOT use any outside knowledge.
2. If the context does not contain the answer, say: "I don't have specific information about that. Please contact the relevant office directly."
3. Be concise, friendly, and helpful.
4. Do not mention "Source 1", "Source 2" etc. in your answer — just write naturally.
5. Consider the recent chat history when the student asks follow-up questions.
6. If responding in {language}, keep the answer in {language}.

{history_text}--- CONTEXT ---
{context}
--- END CONTEXT ---

Student's Question: {user_query}

Answer:"""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 4096,
            },
        }

        res_data = self._try_all_keys(payload, timeout=15)
        if not res_data:
            return ""

        try:
            parts = (
                res_data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [])
            )
            return parts[0].get("text", "").strip() if parts else ""
        except Exception:
            return ""
