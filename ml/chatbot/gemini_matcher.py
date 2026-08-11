import os
import json
import requests
from typing import List, Dict, Any, Tuple, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class GeminiMatcher:
    """
    Acts as a semantic similarity matching engine using the Gemini API via REST.
    Bypasses the need for google-genai SDK.
    """
    def __init__(self):
        self.api_keys = []
        for key_name in ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3"]:
            val = os.getenv(key_name)
            if val and val.strip() and val.strip() != "your-gemini-api-key-here":
                self.api_keys.append(val.strip())
        
        # Keep self.api_key for backward compatibility
        self.api_key = self.api_keys[0] if self.api_keys else None

        # Default model for cost-effective and fast matching
        self.model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
        
    def is_available(self) -> bool:
        """Check if at least one Gemini API Key is configured."""
        return len(self.api_keys) > 0

    def match_question(self, user_query: str, candidates: List[str]) -> Tuple[int, float, str]:
        """
        Sends user query and a list of candidate questions to Gemini API.
        Returns a tuple of:
          - matched_index: 0-based index of the matched question, or -1 if no match.
          - confidence: score between 0.0 and 1.0.
          - reasoning: description of why it matched.
        """
        if not self.is_available():
            return -1, 0.0, "Gemini API key is not configured."
        
        if not candidates:
            return -1, 0.0, "No candidates provided."

        # Format candidates with their indices
        formatted_candidates = "\n".join(
            [f"[{i}] {question}" for i, question in enumerate(candidates)]
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

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        headers = {
            "Content-Type": "application/json"
        }
        
        # Generation config to force JSON output matching the schema
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "matched_index": {
                            "type": "INTEGER",
                            "description": "The 0-based index of the matched candidate question, or -1 if no candidate matches."
                        },
                        "confidence": {
                            "type": "NUMBER",
                            "description": "Confidence score of the match, between 0.0 and 1.0."
                        },
                        "reasoning": {
                            "type": "STRING",
                            "description": "Brief reasoning explaining the match or lack thereof."
                        }
                    },
                    "required": ["matched_index", "confidence", "reasoning"]
                }
            }
        }

        last_error = "All API keys failed or were exhausted"
        for api_key in self.api_keys:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={api_key}"
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=10)
                if response.status_code == 200:
                    res_data = response.json()
                    # Extract text containing JSON from response structure
                    candidates_response = res_data.get("candidates", [])
                    if not candidates_response:
                        print(f"[Matcher] Empty response with key {api_key[:8]}... Trying fallback...")
                        last_error = "Gemini API returned no candidates."
                        continue
                        
                    content = candidates_response[0].get("content", {})
                    parts = content.get("parts", [])
                    if not parts:
                        print(f"[Matcher] Empty parts in response with key {api_key[:8]}... Trying fallback...")
                        last_error = "Gemini API returned no parts in response content."
                        continue
                        
                    result_text = parts[0].get("text", "").strip()
                    result_json = json.loads(result_text)
                    
                    matched_index = int(result_json.get("matched_index", -1))
                    confidence = float(result_json.get("confidence", 0.0))
                    reasoning = result_json.get("reasoning", "")
                    
                    # Ensure matched_index is within bounds
                    if matched_index < -1 or matched_index >= len(candidates):
                        matched_index = -1
                        
                    return matched_index, confidence, reasoning

                print(f"[Matcher] Gemini API error: Key={api_key[:8]}..., Status={response.status_code}, Response={response.text}")
                last_error = f"Gemini API returned status code {response.status_code}: {response.text}"
                # If key is out of quota/auth issue, continue to next key
                if response.status_code in (429, 403):
                    continue

            except Exception as e:
                print(f"[Matcher] Error matching question using key {api_key[:8]}...: {str(e)}")
                last_error = f"Error calling Gemini REST API: {str(e)}"
                continue

        return -1, 0.0, last_error

    def generate_rag_answer(
        self,
        user_query: str,
        retrieved_chunks: list,
        language: str = "English"
    ) -> str:
        """
        Synthesize a natural answer from retrieved knowledge chunks.
        Gemini acts as a READER only — strictly uses provided context.

        Args:
            user_query: Original user question
            retrieved_chunks: List of (KnowledgeItem, score) tuples from retriever
            language: Target language for the response

        Returns:
            A natural language answer grounded in the retrieved context.
            Returns empty string if generation fails.
        """
        if not self.is_available() or not retrieved_chunks:
            return ""

        # Build context from top retrieved items
        context_parts = []
        for i, (item, score) in enumerate(retrieved_chunks[:5], start=1):
            context_parts.append(
                f"[Source {i}]\n"
                f"Q: {item.question}\n"
                f"A: {item.answer}"
            )
        context = "\n\n".join(context_parts)

        prompt = f"""You are a helpful campus assistant for XMUM (Xiamen University Malaysia).
Your job is to answer the student's question using ONLY the context provided below.

STRICT RULES:
1. Answer ONLY from the provided context. Do NOT use any outside knowledge.
2. If the context does not contain the answer, say: "I don't have specific information about that. Please contact the relevant office directly."
3. Be concise, friendly, and helpful.
4. Do not mention "Source 1", "Source 2" etc. in your answer — just write naturally.
5. If responding in {language}, keep the answer in {language}.

--- CONTEXT ---
{context}
--- END CONTEXT ---

Student's Question: {user_query}

Answer:"""

        for api_key in self.api_keys:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 4096,
                }
            }
            try:
                response = requests.post(url, headers={"Content-Type": "application/json"},
                                         json=payload, timeout=15)
                if response.status_code == 200:
                    candidates = response.json().get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
                if response.status_code in (429, 403):
                    continue
            except Exception as e:
                print(f"[Matcher] RAG generation error: {e}")
                continue

        return ""
