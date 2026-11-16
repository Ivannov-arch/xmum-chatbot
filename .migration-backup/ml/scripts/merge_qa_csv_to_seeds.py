"""Merge curated *_qa.csv files into the main seed JSON files.

Run from the repository root:
    python ml/scripts/merge_qa_csv_to_seeds.py

The CSV extraction files use source-specific module names such as
``international_handbook`` and ``postgrad_handbook``. The chatbot runtime only
routes across the three production modules, so this script maps source modules
into the current module/sub_intent taxonomy and appends only new questions.
"""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SEEDS_DIR = PROJECT_ROOT / "database" / "seeds"

MAIN_SEED_FILES = {
    "general": SEEDS_DIR / "general.json",
    "admin_directory": SEEDS_DIR / "admin_directory.json",
    "campus_life": SEEDS_DIR / "campus_life.json",
    "academic_navigation": SEEDS_DIR / "academic_navigation.json",
}

SOURCE_MAP: dict[str, tuple[str, str]] = {
    "about_xmum": ("admin_directory", "about_xmum"),
    "contact_us": ("admin_directory", "contact_us"),
    "student_affairs": ("admin_directory", "contact_us"),
    "admission_faq": ("academic_navigation", "admissions_enrollment"),
    "career_services": ("academic_navigation", "internship_career"),
    "international_handbook": ("academic_navigation", "visa_immigration"),
    "postgrad_handbook": ("academic_navigation", "postgrad_resources"),
    "programmes": ("academic_navigation", "courses_syllabus"),
    "scholarship": ("academic_navigation", "finance_fees"),
    "xmum_handbook_ocr": ("academic_navigation", "courses_syllabus"),
    "accommodation": ("campus_life", "housing_application"),
    "accommodation_faq": ("campus_life", "housing_application"),
    "clubs_societies": ("campus_life", "clubs_activities"),
    "counseling": ("campus_life", "health_safety"),
    "facilities": ("campus_life", "facilities_services"),
    "it_policy": ("campus_life", "it_connectivity"),
    "it_services": ("campus_life", "it_connectivity"),
    "library": ("campus_life", "library"),
    "student_activities": ("campus_life", "clubs_activities"),
    "student_card": ("campus_life", "documents_identity"),
    "student_email": ("campus_life", "it_connectivity"),
    "student_helpdesk": ("campus_life", "documents_identity"),
    "wifi_network": ("campus_life", "it_connectivity"),
    "foundation_student": ("academic_navigation", "courses_syllabus"),
    "mba_student": ("academic_navigation", "courses_syllabus"),
}

SOURCE_KEYWORD_EXTRAS: dict[str, list[str]] = {
    "international_handbook": [
        "international student",
        "international students",
        "isao",
        "international student affairs office",
        "visa",
        "student pass",
        "emgs",
        "immigration",
    ],
    "postgrad_handbook": [
        "postgraduate",
        "postgrad",
        "master",
        "phd",
        "ph.d.",
        "psu",
    ],
    "accommodation": [
        "accommodation",
        "hostel",
        "residence",
        "room type",
        "rental",
    ],
    "it_services": ["it services", "it policy", "email", "network", "account"],
    "it_policy": ["it services", "it policy", "email", "network", "account"],
    "scholarship": ["scholarship", "study grant", "financial aid"],
    "counseling": ["counselling", "counseling", "mental health"],
    "student_activities": ["student activities", "eca", "event"],
    "facilities": ["facilities", "student activity centre"],
}

ACADEMIC_CALENDAR_TERMS = {
    "academic calendar",
    "semester break",
    "revision week",
    "registration days",
    "orientation day",
}

INTERNATIONAL_VISA_TERMS = {
    "isao",
    "student pass",
    "student visa",
    "visa",
    "visa renewal",
    "visa cancellation",
    "passport",
    "immigration",
    "emgs",
    "eval",
    "evisa",
    "sev",
    "i-kad",
    "ikad",
    "mdac",
    "checkout memo",
}


def load_json(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as file:
        json.dump(rows, file, indent=2, ensure_ascii=False)
        file.write("\n")


def normalize_question(question: str) -> str:
    return " ".join(question.strip().lower().split())


def contains_term(text: str, term: str) -> bool:
    import re

    return bool(re.search(r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])", text))


def contains_any(text: str, terms: set[str]) -> bool:
    return any(contains_term(text, term) for term in terms)


def clean_text(value: str) -> str:
    return (
        value.strip()
        .strip('"')
        .replace("\ufeff", "")
        .replace("m▓", "m2")
        .replace("Ph.D.", "PhD")
    )


def parse_keywords(raw_keywords: str, extras: list[str]) -> list[str]:
    keywords: list[str] = []
    seen: set[str] = set()
    for keyword in [*raw_keywords.split(","), *extras]:
        cleaned = clean_text(keyword).lower()
        if not cleaned or cleaned in seen:
            continue
        keywords.append(cleaned)
        seen.add(cleaned)
    return keywords


def infer_target(source_module: str, question: str, answer: str, keywords: list[str]) -> tuple[str, str] | None:
    target = SOURCE_MAP.get(source_module)
    if target is None:
        return None

    text = " ".join([question, answer, *keywords]).lower()
    if source_module == "international_handbook":
        if contains_any(text, INTERNATIONAL_VISA_TERMS):
            return "academic_navigation", "visa_immigration"
        if "academic dishonesty" in text or "cheating" in text or "plagiarism" in text:
            return "academic_navigation", "exams_grades"
        if "email" in text:
            return "campus_life", "it_connectivity"
        return "admin_directory", "about_xmum"

    if source_module == "xmum_handbook_ocr":
        if any(term in text for term in ACADEMIC_CALENDAR_TERMS):
            return "academic_navigation", "academic_calendar"
        if "examination" in text or "exam" in text or "grade" in text or "cgpa" in text:
            return "academic_navigation", "exams_grades"
        if "fee" in text or "refund" in text or "payment" in text:
            return "academic_navigation", "finance_fees"
        if "library" in text:
            return "campus_life", "library"
        if "student pass" in text or "visa" in text or "international student" in text:
            return "academic_navigation", "visa_immigration"

    return target


def load_seed_rows() -> dict[str, list[dict[str, Any]]]:
    return {module: load_json(path) for module, path in MAIN_SEED_FILES.items()}


def iter_csv_rows() -> list[tuple[str, str, str, str]]:
    rows: list[tuple[str, str, str, str]] = []
    for path in sorted(SEEDS_DIR.glob("*_qa.csv")):
        with path.open(encoding="utf-8-sig", newline="") as file:
            reader = csv.reader(file, skipinitialspace=True)
            for row in reader:
                if len(row) < 4:
                    continue
                source_module = clean_text(row[0]).lower()
                question = clean_text(row[1])
                answer = clean_text(row[2])
                keywords = clean_text(row[3])
                if not question or question.lower() == "question":
                    continue
                rows.append((source_module, question, answer, keywords))
    return rows


def main() -> int:
    seed_rows = load_seed_rows()
    existing_questions = {
        (row["module"], normalize_question(row["question"]))
        for rows in seed_rows.values()
        for row in rows
        if row.get("module") and row.get("question")
    }

    added_by_module: dict[str, int] = defaultdict(int)
    skipped_unknown: dict[str, int] = defaultdict(int)

    for source_module, question, answer, raw_keywords in iter_csv_rows():
        keywords = parse_keywords(raw_keywords, [])
        target = infer_target(source_module, question, answer, keywords)
        if target is None:
            skipped_unknown[source_module] += 1
            continue

        module, sub_intent = target
        question_key = (module, normalize_question(question))
        if question_key in existing_questions:
            continue

        extras = SOURCE_KEYWORD_EXTRAS.get(source_module, [])
        if source_module == "international_handbook" and sub_intent != "visa_immigration":
            extras = []
        keywords = parse_keywords(raw_keywords, extras)
        seed_rows[module].append(
            {
                "module": module,
                "sub_intent": sub_intent,
                "question": question,
                "answer": answer,
                "keywords": keywords,
            }
        )
        existing_questions.add(question_key)
        added_by_module[module] += 1

    for module, path in MAIN_SEED_FILES.items():
        write_json(path, seed_rows[module])

    print("Added rows:")
    for module in sorted(MAIN_SEED_FILES):
        print(f"  {module}: {added_by_module[module]}")

    if skipped_unknown:
        print("Skipped unknown source modules:")
        for source_module, count in sorted(skipped_unknown.items()):
            print(f"  {source_module}: {count}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
