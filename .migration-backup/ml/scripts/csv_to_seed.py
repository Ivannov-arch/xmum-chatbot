# scripts/csv_to_seed.py
# Import CSV (e.g. from Google Sheets) directly into Supabase knowledge_items JSON format
# Usage: python scripts/csv_to_seed.py knowledge_items.csv
#
# Expected CSV format (required columns):
#   module,question,answer,keywords
#   campus_life,"Where is the library?","The library is at Block A.","library,location"
#
# Workflow with Google Sheets:
#   1. Create a Google Sheet with columns: module | question | answer | keywords
#   2. Team fills data collaboratively
#   3. File -> Download -> CSV
#   4. python scripts/csv_to_seed.py filename.csv

import sys
import csv
import json
import pathlib

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "database" / "seeds"


def csv_to_json(csv_path: str, output_dir: pathlib.Path = DEFAULT_OUTPUT_DIR):
    path = pathlib.Path(csv_path)
    if not path.exists():
        print(f"ERROR: File not found: {csv_path}")
        sys.exit(1)

    # Group by module
    modules: dict[str, list[dict]] = {}

    with open(path, encoding="utf-8-sig", newline="") as f:  # utf-8-sig handles Excel BOM
        reader = csv.DictReader(f, skipinitialspace=True)
        rows = list(reader)

    for row in rows:
        module = row.get("module", "").strip()
        sub_intent = row.get("sub_intent", "").strip()
        question = row.get("question", "").strip()
        answer = row.get("answer", "").strip()
        keywords_raw = row.get("keywords", "")
        keywords = [k.strip() for k in keywords_raw.split(",") if k.strip()]

        if not module or not question or not answer:
            print(f"  [SKIP] Incomplete row: {row}")
            continue

        if module not in modules:
            modules[module] = []
        item = {
            "module": module,
            "question": question,
            "answer": answer,
            "keywords": keywords,
        }
        if sub_intent:
            item["sub_intent"] = sub_intent
        modules[module].append(item)

    # Save each module to its respective JSON file
    output_dir.mkdir(parents=True, exist_ok=True)
    total = 0
    for module, items in modules.items():
        out_path = output_dir / f"{module}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(items, f, indent=2, ensure_ascii=False)
        print(f"✅ [{module}] {len(items)} items → {out_path}")
        total += len(items)

    print(f"\n🎉 Total: {total} items from {len(modules)} modules ready to be seeded.")
    print("Run: python -m database.seed")


if __name__ == "__main__":
    csv_path = sys.argv[1] if len(sys.argv) > 1 else "knowledge_items.csv"
    csv_to_json(csv_path)
