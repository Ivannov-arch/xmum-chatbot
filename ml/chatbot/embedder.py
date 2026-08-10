# chatbot/embedder.py
#
# GeminiEmbedder — converts text to a 768-dimension vector
# using Gemini text-embedding-004 via REST API (free tier).
#
# Used by:
#   - scripts/embed_all.py  (seed all existing DB rows)
#   - chatbot/retriever.py  (embed user query at runtime)

import os
import requests
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()


class GeminiEmbedder:
    """
    Generates text embeddings using Gemini text-embedding-004.
    Output: list of 768 floats representing semantic meaning.
    """

    EMBEDDING_MODEL = "gemini-embedding-001"
    API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(self):
        self.api_keys = []
        for key_name in ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3"]:
            val = os.getenv(key_name)
            if val and val.strip() and val.strip() != "your-gemini-api-key-here":
                self.api_keys.append(val.strip())

    def is_available(self) -> bool:
        return len(self.api_keys) > 0

    def embed_text(self, text: str) -> Optional[List[float]]:
        """
        Embed a single text string.
        Returns list of 768 floats, or None if all keys fail.
        """
        if not self.is_available():
            return None

        # Truncate very long text to avoid token limit
        text = text.strip()[:8000]

        payload = {
            "model": f"models/{self.EMBEDDING_MODEL}",
            "content": {
                "parts": [{"text": text}]
            }
        }

        for api_key in self.api_keys:
            url = f"{self.API_BASE}/{self.EMBEDDING_MODEL}:embedContent?key={api_key}"
            try:
                response = requests.post(url, json=payload, timeout=15)
                if response.status_code == 200:
                    values = response.json()["embedding"]["values"]
                    return values
                print(f"[Embedder] Key {api_key[:8]}... status {response.status_code}")
                if response.status_code in (429, 403):
                    continue
            except Exception as e:
                print(f"[Embedder] Error with key {api_key[:8]}...: {e}")
                continue

        return None

    def embed_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        """
        Embed multiple texts. Returns list of embeddings (same order).
        None for any text that failed to embed.
        """
        return [self.embed_text(t) for t in texts]


# ── Quick test ──────────────────────────────────────────────
if __name__ == "__main__":
    embedder = GeminiEmbedder()
    if not embedder.is_available():
        print("[Test] No Gemini API key found in .env")
    else:
        result = embedder.embed_text("How do I connect to campus WiFi?")
        if result:
            print(f"[Test] OK — vector length: {len(result)}")
            print(f"[Test] First 5 values: {result[:5]}")
        else:
            print("[Test] FAILED — all API keys returned error")