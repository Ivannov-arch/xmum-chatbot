"""Validate ROLE 6 seed data for the XMUM campus chatbot.

Run from the project root:
    python scripts/validate_seeds.py
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SEEDS_DIR = PROJECT_ROOT / "database" / "seeds"
SEED_FILES = {
    "general.json": "general",
    "admin_directory.json": "admin_directory",
    "campus_life.json": "campus_life",
    "academic_navigation.json": "academic_navigation",
}
REQUIRED_FIELDS = ("module", "sub_intent", "question", "answer", "keywords")


def load_json(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, list):
        raise ValueError(f"{path.name} must contain a JSON array.")

    return data


def is_non_empty(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return bool(value)
    return True


def check_structure(
    filename: str,
    expected_module: str,
    rows: list[dict[str, Any]],
) -> list[str]:
    errors: list[str] = []

    for row_number, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            errors.append(f"{filename} row {row_number}: row must be an object.")
            continue

        for field in REQUIRED_FIELDS:
            if not is_non_empty(row.get(field)):
                errors.append(f"{filename} row {row_number}: missing or empty {field!r}.")

        module = row.get("module")
        if module and module != expected_module:
            errors.append(
                f"{filename} row {row_number}: module {module!r} should be "
                f"{expected_module!r}."
            )

        keywords = row.get("keywords")
        if not isinstance(keywords, list):
            errors.append(f"{filename} row {row_number}: keywords must be a list.")
            continue

        for keyword_index, keyword in enumerate(keywords, start=1):
            if not isinstance(keyword, str) or not keyword.strip():
                errors.append(
                    f"{filename} row {row_number}: keyword #{keyword_index} "
                    "must be a non-empty string."
                )

    return errors


def check_keyword_lowercase(
    filename: str,
    rows: list[dict[str, Any]],
) -> list[str]:
    errors: list[str] = []

    for row_number, row in enumerate(rows, start=1):
        keywords = row.get("keywords")
        if not isinstance(keywords, list):
            continue

        for keyword in keywords:
            if isinstance(keyword, str) and keyword != keyword.lower():
                errors.append(
                    f"{filename} row {row_number}: {keyword!r} should be "
                    f"{keyword.lower()!r}."
                )

    return errors


def collect_keyword_modules(
    rows_by_file: dict[str, list[dict[str, Any]]],
) -> dict[str, set[str]]:
    keyword_modules: dict[str, set[str]] = defaultdict(set)

    for rows in rows_by_file.values():
        for row in rows:
            module = row.get("module")
            keywords = row.get("keywords")
            if not isinstance(module, str) or not isinstance(keywords, list):
                continue

            for keyword in keywords:
                if isinstance(keyword, str) and keyword.strip():
                    keyword_modules[keyword.strip().lower()].add(module)

    return keyword_modules


def find_cross_module_conflicts(
    keyword_modules: dict[str, set[str]],
) -> dict[str, list[str]]:
    return {
        keyword: sorted(modules)
        for keyword, modules in sorted(keyword_modules.items())
        if len(modules) >= 2
    }


def load_sub_intent_module_map() -> dict[str, str] | None:
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))

    try:
        from chatbot.intent_classifier import IntentClassifier  # type: ignore
    except ModuleNotFoundError:
        return None

    return IntentClassifier().sub_intent_to_module


def check_sub_intent_modules(
    filename: str,
    rows: list[dict[str, Any]],
    sub_intent_map: dict[str, str],
) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    for row_number, row in enumerate(rows, start=1):
        module = row.get("module")
        sub_intent = row.get("sub_intent")
        if not isinstance(module, str) or not isinstance(sub_intent, str):
            continue

        expected_module = sub_intent_map.get(sub_intent)
        if expected_module is None:
            if module != "general":
                warnings.append(
                    f"{filename} row {row_number}: sub_intent {sub_intent!r} "
                    "is not returned by IntentClassifier."
                )
            continue

        if expected_module != module:
            errors.append(
                f"{filename} row {row_number}: sub_intent {sub_intent!r} maps "
                f"to {expected_module!r}, not {module!r}."
            )

    return errors, warnings


def find_duplicate_questions(
    rows_by_file: dict[str, list[dict[str, Any]]],
) -> list[str]:
    seen: dict[tuple[str, str], str] = {}
    duplicates: list[str] = []

    for filename, rows in rows_by_file.items():
        for row_number, row in enumerate(rows, start=1):
            module = row.get("module")
            question = row.get("question")
            if not isinstance(module, str) or not isinstance(question, str):
                continue
            key = (module, " ".join(question.lower().split()))
            first_seen = seen.get(key)
            location = f"{filename} row {row_number}"
            if first_seen:
                duplicates.append(
                    f"{location}: duplicates question already seen at {first_seen}."
                )
            else:
                seen[key] = location

    return duplicates


def load_synonym_map() -> dict[str, str] | None:
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))

    try:
        from chatbot.preprocessor import SYNONYM_MAP  # type: ignore
    except ModuleNotFoundError:
        return None

    return {
        str(source).strip().lower(): str(target).strip().lower()
        for source, target in SYNONYM_MAP.items()
        if str(source).strip() and str(target).strip()
    }


def find_synonym_warnings(
    rows_by_file: dict[str, list[dict[str, Any]]],
    synonym_map: dict[str, str],
) -> list[str]:
    warnings: list[str] = []

    for filename, rows in rows_by_file.items():
        for row_number, row in enumerate(rows, start=1):
            keywords = row.get("keywords")
            if not isinstance(keywords, list):
                continue

            for keyword in keywords:
                if not isinstance(keyword, str):
                    continue

                normalized = keyword.strip().lower()
                canonical = synonym_map.get(normalized)
                if canonical and canonical != normalized:
                    warnings.append(
                        f"{filename} row {row_number}: keyword {keyword!r} should "
                        f"use canonical synonym {canonical!r}."
                    )

    return warnings


def print_report_list(title: str, items: list[str] | dict[str, list[str]]) -> None:
    if not items:
        return

    print(title)
    if isinstance(items, dict):
        for keyword, modules in items.items():
            print(f"  - {keyword}: {', '.join(modules)}")
    else:
        for item in items:
            print(f"  - {item}")


def main() -> int:
    print("=" * 64)
    print("  XMUM Chatbot Seed Validation")
    print("=" * 64)

    rows_by_file: dict[str, list[dict[str, Any]]] = {}
    structural_errors: list[str] = []
    lowercase_errors: list[str] = []
    sub_intent_errors: list[str] = []
    sub_intent_warnings: list[str] = []

    for filename, expected_module in SEED_FILES.items():
        path = SEEDS_DIR / filename
        try:
            rows = load_json(path)
        except (FileNotFoundError, json.JSONDecodeError, ValueError) as error:
            structural_errors.append(f"{filename}: {error}")
            print(f"[FAIL] {filename}: could not load file.")
            continue

        rows_by_file[filename] = rows

        file_structure_errors = check_structure(filename, expected_module, rows)
        file_lowercase_errors = check_keyword_lowercase(filename, rows)
        structural_errors.extend(file_structure_errors)
        lowercase_errors.extend(file_lowercase_errors)

        if file_structure_errors:
            print(f"[FAIL] {filename}: {len(file_structure_errors)} structural issue(s).")
        else:
            print(f"[PASS] {filename}: {len(rows)} structurally valid row(s).")

        if file_lowercase_errors:
            print(f"[FAIL] {filename}: {len(file_lowercase_errors)} uppercase keyword(s).")
        else:
            print(f"[PASS] {filename}: all keywords are lowercase.")

    sub_intent_map = load_sub_intent_module_map()
    if sub_intent_map is None:
        print("[SKIP] Sub-intent compatibility: chatbot/intent_classifier.py not found.")
    else:
        for filename, rows in rows_by_file.items():
            errors, warnings = check_sub_intent_modules(
                filename, rows, sub_intent_map
            )
            sub_intent_errors.extend(errors)
            sub_intent_warnings.extend(warnings)

        if sub_intent_errors:
            print(
                "[FAIL] Sub-intent compatibility: "
                f"{len(sub_intent_errors)} mismatch(es)."
            )
        else:
            print("[PASS] Sub-intent compatibility: no module mismatches.")

        if sub_intent_warnings:
            print(
                "[WARN] Sub-intent coverage: "
                f"{len(sub_intent_warnings)} sub-intent(s) are not routed."
            )
        else:
            print("[PASS] Sub-intent coverage: all non-general sub-intents are routed.")

    duplicate_questions = find_duplicate_questions(rows_by_file)
    if duplicate_questions:
        print(
            "[FAIL] Duplicate questions: "
            f"{len(duplicate_questions)} duplicate row(s) within the same module."
        )
    else:
        print("[PASS] Duplicate questions: none within the same module.")

    keyword_modules = collect_keyword_modules(rows_by_file)
    conflicts = find_cross_module_conflicts(keyword_modules)

    synonym_map = load_synonym_map()
    synonym_warnings: list[str] = []
    if synonym_map is None:
        print("[SKIP] Synonym compatibility: chatbot/preprocessor.py not found yet.")
    else:
        synonym_warnings = find_synonym_warnings(rows_by_file, synonym_map)
        if synonym_warnings:
            print(
                "[WARN] Synonym compatibility: "
                f"{len(synonym_warnings)} incompatible keyword(s)."
            )
        else:
            print("[PASS] Synonym compatibility: no incompatible keywords found.")

    print()
    print_report_list("[DETAIL] Structural issues:", structural_errors)
    print_report_list("[DETAIL] Uppercase keyword issues:", lowercase_errors)
    print_report_list("[DETAIL] Sub-intent module issues:", sub_intent_errors)
    print_report_list("[WARN] Unrouted sub-intents:", sub_intent_warnings)
    print_report_list("[DETAIL] Duplicate question issues:", duplicate_questions)
    print_report_list("[WARN] Cross-module keyword conflicts:", conflicts)
    print_report_list("[DETAIL] Synonym compatibility warnings:", synonym_warnings)

    total_rows = sum(len(rows) for rows in rows_by_file.values())
    failure_count = (
        len(structural_errors)
        + len(lowercase_errors)
        + len(sub_intent_errors)
        + len(duplicate_questions)
    )
    warning_count = len(conflicts) + len(synonym_warnings) + len(sub_intent_warnings)

    print()
    print("=" * 64)
    print(f"  Rows checked : {total_rows}")
    print(f"  Failures     : {failure_count}")
    print(f"  Warnings     : {warning_count}")
    print("=" * 64)

    return 1 if failure_count else 0


if __name__ == "__main__":
    raise SystemExit(main())
