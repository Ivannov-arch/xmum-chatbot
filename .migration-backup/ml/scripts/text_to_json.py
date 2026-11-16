# scripts/text_to_json.py
# Convert Q&A text files into JSON format ready for Supabase seeding
# Usage: python scripts/text_to_json.py campus_life database/seeds/campus_life_qa.txt
#
# Expected input .txt format:
#   Q: Where is the library?
#   A: The library is located at Block A, Level 2.
#   K: library, location, block a
#   ---
#   Q: What time does the library open?
#   A: Opens at 8:30 AM on weekdays, 9:00 AM on Saturdays.
#   K: library, open, hours, time, weekday
#   ---

import sys
import json
import pathlib


def parse_qa_file(module: str, txt_path: str):
    path = pathlib.Path(txt_path)
    if not path.exists():
        print(f"ERROR: File not found: {txt_path}")
        return

    content = path.read_text(encoding="utf-8")
    blocks = [b.strip() for b in content.split("---") if b.strip()]
    items = []
    skipped = 0

    for block in blocks:
        entry = {"module": module, "question": "", "answer": "", "keywords": []}
        for line in block.splitlines():
            if line.startswith("Q:"):
                entry["question"] = line[2:].strip()
            elif line.startswith("A:"):
                entry["answer"] = line[2:].strip()
            elif line.startswith("K:"):
                entry["keywords"] = [k.strip() for k in line[2:].split(",")]

        if entry["question"] and entry["answer"]:
            items.append(entry)
        else:
            skipped += 1
            print(f"  [SKIP] Incomplete block: {block[:50]}...")

    output_path = pathlib.Path(f"database/seeds/{module}.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)

    print(f"✅ {len(items)} Q&A saved to {output_path}")
    if skipped:
        print(f"         ({skipped} blocks skipped due to missing information)")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python scripts/text_to_json.py <module_name> <qa_txt_file>")
        print("Example: python scripts/text_to_json.py campus_life database/seeds/campus_life_qa.txt")
        sys.exit(1)
    parse_qa_file(module=sys.argv[1], txt_path=sys.argv[2])