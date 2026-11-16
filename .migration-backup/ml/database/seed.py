# database/seed.py
#
# Knowledge Base Seed Script
# Run with: python -m database.seed
#
# Reads all JSON files from database/seeds/ and UPSERTS them into Supabase.
# Uses upsert (insert-or-update) so existing rows added via the admin panel
# are NEVER deleted. Rows in the seeds will be added or updated; rows only
# in Supabase (added manually) are left untouched.
#
# Uses SERVICE ROLE KEY (admin) to bypass RLS during seeding.
#
# JSON format expected per entry:
#   {
#     "module":   "campus_life",
#     "question": "What time does the library close?",
#     "answer":   "The library closes at 9:00 PM on weekdays.",
#     "keywords": ["library", "hours", "close", "open"]
#   }

import json
import pathlib
from database.client import get_admin_client

SEEDS_DIR = pathlib.Path(__file__).parent / "seeds"
MODULES = ["general", "admin_directory", "campus_life", "academic_navigation"]

# How many rows to insert per API call (Supabase recommends <= 500)
BATCH_SIZE = 100


def load_seed_file(module_name: str) -> list[dict]:
    """Load and parse the JSON seed file for a given module."""
    path = SEEDS_DIR / f"{module_name}.json"
    if not path.exists():
        print(f"  [SKIP] Seed file not found: {path.name}")
        return []
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    print(f"  Loaded {len(data)} rows from {path.name}")
    return data


def upsert_in_batches(client, items: list[dict], module_name: str) -> int:
    """Add only NEW rows to Supabase. Existing rows (by question+module) are skipped.
    
    Fetches the current set of questions from Supabase for this module,
    then inserts only the rows that are not already there.
    Rows added manually in Supabase are completely untouched.
    """
    # Fetch existing questions for this module from Supabase
    existing_resp = (
        client.table("knowledge_items")
        .select("question")
        .eq("module", module_name)
        .execute()
    )
    existing_questions = {
        row["question"].strip().lower()
        for row in (existing_resp.data or [])
    }

    # Filter to only new rows
    new_items = [
        item for item in items
        if item.get("question", "").strip().lower() not in existing_questions
    ]

    if not new_items:
        print(f"  All {len(items)} rows already exist in Supabase. Nothing to insert.")
        return 0

    skipped = len(items) - len(new_items)
    if skipped:
        print(f"  Skipping {skipped} already-existing rows.")

    total = 0
    for i in range(0, len(new_items), BATCH_SIZE):
        batch = new_items[i : i + BATCH_SIZE]
        client.table("knowledge_items").insert(batch).execute()
        total += len(batch)
        print(f"  Inserted batch {i // BATCH_SIZE + 1}: {len(batch)} rows")
    return total



def main():
    print("=" * 55)
    print("  XMUM Chatbot — Seed Knowledge Base")
    print("=" * 55)

    print("\nConnecting to Supabase...")
    client = get_admin_client()
    print("Connection OK.")
    print("[INFO] Using UPSERT mode — existing manually-added rows in Supabase will NOT be deleted.")

    grand_total = 0
    for module in MODULES:
        print(f"\n[MODULE: {module}]")
        items = load_seed_file(module)
        if not items:
            continue
        inserted = upsert_in_batches(client, items, module)
        grand_total += inserted
        print(f"  Done: {inserted} rows upserted for '{module}'.")


    print("\n" + "=" * 55)
    print(f"  Seeding complete. Total rows upserted: {grand_total}")
    print("  (Manually-added rows in Supabase were preserved)")
    print("=" * 55)


if __name__ == "__main__":
    main()
