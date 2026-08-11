# scripts/embed_all.py
#
# One-shot script: generate embeddings for all knowledge_items
# that do not yet have an embedding stored in Supabase.
#
# Run once from the ml/ directory:
#   python -m scripts.embed_all

import os
import sys
import time

from dotenv import load_dotenv
from supabase import create_client

# Make sure chatbot package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from chatbot.embedder import GeminiEmbedder

def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env")
    return create_client(url, key)

def embed_all_items():
    print("\n=== embed_all.py — Generating embeddings for knowledge_items ===\n")

    supabase = get_supabase_client()
    embedder = GeminiEmbedder()
    if not embedder.is_available():
        print("[ERROR] No Gemini API key found. Check your .env file.")
        return

    # Fetch rows that have no embedding yet
    response = supabase.table("knowledge_items").select("id, question, answer").is_("embedding", "null").execute()
    rows = response.data or []
    total = len(rows)

    if total == 0:
        print("[OK] All rows already have embeddings. Nothing to do.")
        return

    print(f"[INFO] Found {total} items without embeddings. Generating embeddings...")

    success = 0
    failed = 0

    for i, row in enumerate(rows, start=1):
        row_id = row["id"]
        # Embed question + answer together for richer semantic meaning
        text = f"{row['question']} {row['answer']}"

        embedding = embedder.embed_text(text)

        if embedding is None:
            print(f"  [{i}/{total}] FAILED  id={row_id[:8]}...")
            failed += 1
            time.sleep(1)
            continue

        # Update the row in Supabase
        
        supabase.table("knowledge_items") \
            .update({"embedding": embedding}) \
            .eq("id", row_id) \
            .execute()

        print(f"  [{i}/{total}] OK  id={row_id[:8]}...")
        success += 1

        # Brief pause to avoid hitting Gemini rate limit (60 RPM on free tier)
        time.sleep(0.5)

    print(f"\n=== Done: {success} embedded, {failed} failed ===")


if __name__ == "__main__":
    embed_all_items()
