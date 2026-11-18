# chatbot/model_resolver.py
#
# Resolves the best available Gemini generative model at runtime by querying
# the Gemini API's model list endpoint. This ensures the chatbot never uses
# a discontinued model — it always picks from what Google currently supports.
#
# Usage:
#   from chatbot.model_resolver import resolve_gemini_model
#   self.model = resolve_gemini_model(api_key)

import requests
from functools import lru_cache
from typing import Optional

# Preference order — deliberately avoids Pro models.
#
# This chatbot uses RAG: Gemini must answer ONLY from retrieved context, never
# from its own knowledge. Pro-class models are too "creative" — they tend to
# supplement the provided context with general knowledge, breaking the strict
# retrieval boundary. Flash and Flash-Lite models are obedient enough to stay
# within context while still being capable of paraphrase, translation, and
# semantic matching.
#
# Order: newer Flash-Lite first (cheapest quota, most compliant), then Flash,
# then older Flash as last resort. Pro models are intentionally excluded.
_PREFERRED_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash",
]

# Hard fallback if the API is unreachable at startup.
_FALLBACK_MODEL = "gemini-1.5-flash"


@lru_cache(maxsize=1)
def _fetch_available_models(api_key: str) -> list[str]:
    """
    Query the Gemini REST API for all currently available models.
    Returns a list of short model names (e.g. ["gemini-1.5-flash", ...]).
    Result is cached for the lifetime of the process — one call per startup.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    try:
        resp = requests.get(url, timeout=10)
        if resp.status_code != 200:
            print(f"[ModelResolver] API returned {resp.status_code} — using fallback model")
            return []

        models_data = resp.json().get("models", [])
        available = []
        for m in models_data:
            name = m.get("name", "")          # "models/gemini-1.5-flash"
            short = name.replace("models/", "")

            # Only include models that support generateContent
            supported_methods = [
                method.get("name", "")
                for method in m.get("supportedGenerationMethods", [])
            ]
            if "generateContent" in supported_methods:
                available.append(short)

        print(f"[ModelResolver] {len(available)} generative models available from API")
        return available

    except Exception as exc:
        print(f"[ModelResolver] Failed to fetch model list: {exc}")
        return []


def resolve_gemini_model(api_key: Optional[str], env_override: Optional[str] = None) -> str:
    """
    Return the best available Gemini model name.

    Priority:
      1. GEMINI_MODEL env var if set and non-empty (manual override for ops)
      2. First match from _PREFERRED_MODELS in the live API model list
      3. _FALLBACK_MODEL if the API is unreachable

    Args:
        api_key:      Any valid Gemini API key (used for the model list query only).
        env_override: Value of os.getenv("GEMINI_MODEL") — pass in from caller.
    """
    # 1. Manual override always wins
    if env_override and env_override.strip():
        print(f"[ModelResolver] Using manually configured model: {env_override.strip()}")
        return env_override.strip()

    if not api_key:
        print(f"[ModelResolver] No API key — using fallback model: {_FALLBACK_MODEL}")
        return _FALLBACK_MODEL

    # 2. Query live list (cached after first call)
    available = _fetch_available_models(api_key)

    if available:
        for preferred in _PREFERRED_MODELS:
            if preferred in available:
                print(f"[ModelResolver] Selected model: {preferred}")
                return preferred

        # None of our preferred models matched — use whatever is first
        fallback = available[0]
        print(f"[ModelResolver] No preferred model found, using: {fallback}")
        return fallback

    # 3. API unreachable at startup
    print(f"[ModelResolver] Using hardcoded fallback: {_FALLBACK_MODEL}")
    return _FALLBACK_MODEL
