# =============================================================================
# chatbot/entity_recognizer.py
#
# Entity Recognition — XMUM Campus Knowledge Chatbot
# ====================================================
# Extracts domain-specific entities from a user message using classical NLP:
#   1. NLTK tokenisation + POS tagging  (Nouns, Proper Nouns, Verbs, etc.)
#   2. Local keyword lookup dictionary   (multi-word & single-word matching)
#
# Target entity categories (derived from the three knowledge modules):
#   - "facility"    → library, canteen, hostel, Wi-Fi, room, etc.
#   - "office"      → International Affairs, Student Affairs, Housing, etc.
#   - "academic"    → AC System, leave application, academic calendar, etc.
#   - "action"      → verbs that signal user intent (borrow, return, pay…)
#
# Public API:
#   extract_entities(user_message: str) -> dict[str, list[str]]
#
# NOTE:
#   This module is responsible ONLY for entity extraction.
#   Intent recognition, response retrieval, context management, fallback
#   handling, and text preprocessing are handled by other team members.
#
# NOTE (Database):
#   Entity extraction is a pure NLP step that operates on the raw user
#   message *before* any database query.  The lookup dictionary below is
#   defined locally in this file — it does NOT need a MySQL or Supabase
#   connection.  The extracted entities are later passed downstream to the
#   Retriever, which is the component that actually queries the database.
#   Therefore NO database client is imported or required here.
# =============================================================================

from __future__ import annotations

import re
import string
from typing import Dict, List

import nltk
from nltk.tokenize import word_tokenize
from nltk.tag import pos_tag

# ---------------------------------------------------------------------------
# Ensure required NLTK data packages are available.
# On the first run these will be downloaded (~2 MB total).  Subsequent runs
# will skip the download because the data is cached locally.
#
# The download directory is set to a project-local folder (./nltk_data) to
# avoid permission issues on restricted Windows environments.
# ---------------------------------------------------------------------------
import os as _os
import pathlib as _pathlib

_NLTK_DATA_DIR = str(
    _pathlib.Path(__file__).resolve().parent.parent / "nltk_data"
)
# Register the local path so NLTK can find previously-downloaded data.
if _NLTK_DATA_DIR not in nltk.data.path:
    nltk.data.path.insert(0, _NLTK_DATA_DIR)

_REQUIRED_RESOURCES = {
    "punkt_tab":                       "tokenizers/punkt_tab",
    "averaged_perceptron_tagger_eng":  "taggers/averaged_perceptron_tagger_eng",
}

for _pkg_id, _resource_path in _REQUIRED_RESOURCES.items():
    try:
        nltk.data.find(_resource_path)
    except LookupError:
        _os.makedirs(_NLTK_DATA_DIR, exist_ok=True)
        nltk.download(_pkg_id, download_dir=_NLTK_DATA_DIR, quiet=True)


# ============================================================================
# 1. ENTITY LOOKUP DICTIONARY
# ============================================================================
# Each key is the canonical entity name that will appear in the output.
# Each value is a tuple of (category, list-of-surface-forms).
#
# Surface forms are matched CASE-INSENSITIVELY against the user message.
# Multi-word surface forms (e.g. "student affairs") are matched FIRST so
# that they take priority over single-word matches.
#
# Maintainability: to add a new entity simply add a new entry here.
# ============================================================================

ENTITY_CATALOG: Dict[str, tuple[str, list[str]]] = {
    # ── Facilities (Module 2 – Campus Life) ──────────────────────────────
    "library": (
        "facility",
        ["library", "lib"],
    ),
    "canteen": (
        "facility",
        ["canteen", "cafeteria", "food court", "dining hall", "food stall"],
    ),
    "hostel": (
        "facility",
        ["hostel", "dorm", "dormitory", "accommodation", "residence hall"],
    ),
    "wi-fi": (
        "facility",
        ["wi-fi", "wifi", "wi fi", "campus network", "internet connection",
         "internet", "network"],
    ),
    "student email": (
        "facility",
        ["student email", "campus email", "outlook", "office 365", "teams"],
    ),
    "room": (
        "facility",
        ["room", "block"],
    ),

    # ── Offices / Departments (Module 1 – Admin Directory) ───────────────
    "International & Student Affairs": (
        "office",
        ["international affairs", "student affairs", "international office",
         "student office", "isa", "i&sa", "isao",
         "international student affairs",
         "international student affairs office"],
    ),
    "Accommodation Services": (
        "office",
        ["accommodation services", "housing office", "accommodation office",
         "housing"],
    ),
    "Registration Office": (
        "office",
        ["registration office", "registrar", "registration counter"],
    ),

    # ── Academic Systems (Module 3 – Academic Navigation) ────────────────
    "AC System": (
        "academic",
        ["ac system", "ac portal", "student portal", "academic portal",
         "academic system"],
    ),
    "leave application": (
        "academic",
        ["leave application", "apply for leave", "leave request",
         "sick leave", "absence form", "leave"],
    ),
    "academic calendar": (
        "academic",
        ["academic calendar", "school calendar", "semester calendar",
         "term dates", "exam schedule", "semester break", "sem break",
         "term break", "revision week", "registration days",
         "orientation day"],
    ),
    "student pass": (
        "academic",
        ["student pass", "student visa", "visa renewal", "visa cancellation",
         "emgs", "eval", "evisa", "i-kad", "ikad", "mdac"],
    ),
    "postgraduate studies": (
        "academic",
        ["postgraduate", "postgrad", "master", "phd", "ph.d.",
         "doctorate", "thesis", "dissertation", "viva", "psu"],
    ),
    "course registration": (
        "academic",
        ["course registration", "register for course", "course enrolment",
         "enrol", "enroll", "sign up for course"],
    ),
    "tuition fees": (
        "academic",
        ["tuition fees", "tuition fee", "tuition", "fees", "payment",
         "pay tuition"],
    ),
    "timetable": (
        "academic",
        ["timetable", "class schedule", "lecture schedule"],
    ),
    "grades": (
        "academic",
        ["grades", "grade", "result", "results", "transcript", "gpa", "cgpa"],
    ),

    # ── Food Types (sub-entities under canteen) ──────────────────────────
    "halal food": (
        "food_type",
        ["halal"],
    ),
    "vegetarian food": (
        "food_type",
        ["vegetarian", "vegan", "veggie"],
    ),
    "chinese food": (
        "food_type",
        ["chinese food", "chinese cuisine", "chinese stall"],
    ),
    "western food": (
        "food_type",
        ["western food", "western cuisine", "western stall"],
    ),
}


# ============================================================================
# OPTIONAL: DYNAMIC DATABASE ENTITY LOADING (COMMENTED OUT)
# ============================================================================
# If your team decides to store entity synonyms dynamically in the database,
# you can uncomment, adapt, and run the following helper functions to load
# them during chatbot startup.
#
# --- [OPTION A: OFFLINE LOCAL MYSQL] ---
# Requires: pip install mysql-connector-python
#
# import mysql.connector
#
# def load_entities_from_mysql():
#     """
#     Fetch dynamic entities from a local MySQL database.
#     Assumes a table structure like:
#         CREATE TABLE entity_dictionary (
#             id INT AUTO_INCREMENT PRIMARY KEY,
#             canonical_name VARCHAR(255) NOT NULL,
#             category VARCHAR(50) NOT NULL,
#             surface_form VARCHAR(255) NOT NULL
#         );
#     """
#     try:
#         conn = mysql.connector.connect(
#             host="localhost",
#             user="root",
#             password="your_mysql_password",
#             database="xmum_chatbot"
#         )
#         cursor = conn.cursor(dictionary=True)
#         cursor.execute("SELECT canonical_name, category, surface_form FROM entity_dictionary")
#         rows = cursor.fetchall()
#
#         for row in rows:
#             canonical = row["canonical_name"]
#             cat = row["category"]
#             surface = row["surface_form"]
#
#             # Add to local CATALOG
#             if canonical not in ENTITY_CATALOG:
#                 ENTITY_CATALOG[canonical] = (cat, [])
#             if surface not in ENTITY_CATALOG[canonical][1]:
#                 ENTITY_CATALOG[canonical][1].append(surface)
#
#         cursor.close()
#         conn.close()
#         print("[MySQL] Successfully loaded dynamic entities.")
#         rebuild_surface_map()
#     except Exception as e:
#         print(f"[MySQL] Error loading entities: {e}")
#
#
# --- [OPTION B: ONLINE SUPABASE] ---
# Requires: database.client to be implemented with supabase-py
#
# def load_entities_from_supabase():
#     """
#     Fetch dynamic entities from Supabase.
#     Assumes a 'knowledge_items' table or a custom 'entity_dictionary' table.
#     """
#     try:
#         # Import the client builder (provided by database component owner)
#         from database.client import get_client
#         supabase_client = get_client()
#
#         # Option 1: Load keywords straight from your knowledge_items table
#         response = supabase_client.table("knowledge_items").select("question, keywords, module").execute()
#         items = response.data
#
#         for item in items:
#             module = item["module"]
#             keywords = item.get("keywords", [])
#             # Map database modules to matching extraction categories
#             category_map = {
#                 "campus_life": "facility",
#                 "admin_directory": "office",
#                 "academic_navigation": "academic"
#             }
#             category = category_map.get(module, "facility")
#
#             for kw in keywords:
#                 canonical = kw.lower()
#                 if canonical not in ENTITY_CATALOG:
#                     ENTITY_CATALOG[canonical] = (category, [])
#                 if kw not in ENTITY_CATALOG[canonical][1]:
#                     ENTITY_CATALOG[canonical][1].append(kw)
#
#         print("[Supabase] Successfully loaded dynamic entities.")
#         rebuild_surface_map()
#     except Exception as e:
#         print(f"[Supabase] Error loading entities from Supabase: {e}")
# ============================================================================


# ---------------------------------------------------------------------------
# Pre-compute sorted surface forms: longest first so multi-word phrases
# are matched before their individual tokens.
# ---------------------------------------------------------------------------
_SURFACE_MAP: list[tuple[str, str, str]] = []  # (surface, canonical, category)

def rebuild_surface_map() -> None:
    """Helper to update _SURFACE_MAP if ENTITY_CATALOG is updated dynamically."""
    global _SURFACE_MAP
    _SURFACE_MAP = []
    for _canonical, (_cat, _surfaces) in ENTITY_CATALOG.items():
        for _surf in _surfaces:
            _SURFACE_MAP.append((_surf.lower(), _canonical, _cat))

# Sort by descending length to ensure greedy matching of longer phrases.
    _SURFACE_MAP.sort(key=lambda t: len(t[0]), reverse=True)

# Initial build
rebuild_surface_map()



# ============================================================================
# 2. ACTION-VERB DICTIONARY
# ============================================================================
# Common user-intent verbs relevant to the XMUM campus domain.
# These are matched via POS tags (VB, VBP, VBG, VBZ, VBD, VBN).
# ============================================================================

ACTION_VERBS: Dict[str, list[str]] = {
    "find":     ["find", "locate", "search", "look"],
    "borrow":   ["borrow", "loan", "check out", "checkout"],
    "return":   ["return", "give back"],
    "pay":      ["pay", "settle", "transfer"],
    "register": ["register", "enrol", "enroll", "sign up"],
    "apply":    ["apply", "submit", "request"],
    "connect":  ["connect", "log in", "login", "access"],
    "download": ["download", "get", "obtain"],
    "view":     ["view", "see", "check", "show"],
}

_VERB_SURFACE_MAP: Dict[str, str] = {}
for _canonical_verb, _forms in ACTION_VERBS.items():
    for _form in _forms:
        _VERB_SURFACE_MAP[_form.lower()] = _canonical_verb


# ============================================================================
# 3. CORE FUNCTION — extract_entities()
# ============================================================================

def extract_entities(user_message: str) -> Dict[str, List[str]]:
    """
    Extract domain-specific entities from a user message.

    The function applies two complementary strategies:
        A) **Keyword Lookup** — scans the lowered message against the
           ENTITY_CATALOG surface forms (multi-word first, then single-word).
        B) **POS-Tag Scan** — uses NLTK POS tagging to find Proper Nouns
           (NNP/NNPS) and action Verbs (VB*) that may not be in the catalog.

    Args:
        user_message: The raw input string from the user.

    Returns:
        A dictionary with the structure::

            {
                "facility":  ["library", "canteen"],
                "office":    ["International & Student Affairs"],
                "academic":  ["AC System"],
                "food_type": ["halal food"],
                "action":    ["borrow"],
                "pos_nouns": ["SAIR"],   # Proper Nouns found via POS tags
            }

        Any category with zero matches is omitted from the dict.
    """
    result: Dict[str, List[str]] = {}
    message_lower = user_message.lower()

    # ------------------------------------------------------------------
    # STRATEGY A — Keyword Lookup (greedy, longest-match-first)
    # ------------------------------------------------------------------
    # We keep a set of character spans already consumed so that the same
    # substring is not matched by a shorter surface form later.
    # ------------------------------------------------------------------
    consumed_spans: list[tuple[int, int]] = []

    def _is_overlapping(start: int, end: int) -> bool:
        """Return True if the span [start, end) overlaps any consumed span."""
        for cs, ce in consumed_spans:
            if start < ce and end > cs:
                return True
        return False

    for surface, canonical, category in _SURFACE_MAP:
        # Use word-boundary regex so "lib" doesn't match inside "calibrate".
        pattern = r"\b" + re.escape(surface) + r"\b"
        for match in re.finditer(pattern, message_lower):
            if _is_overlapping(match.start(), match.end()):
                continue
            consumed_spans.append((match.start(), match.end()))
            result.setdefault(category, [])
            if canonical not in result[category]:
                result[category].append(canonical)

    # ------------------------------------------------------------------
    # STRATEGY B — POS-Tag Scan
    # ------------------------------------------------------------------
    tokens = word_tokenize(user_message)
    tagged = pos_tag(tokens)

    # B-1: Capture Proper Nouns (NNP / NNPS) not already matched.
    matched_canonical_lower = {
        v.lower() for vals in result.values() for v in vals
    }
    proper_nouns: list[str] = []
    for token, tag in tagged:
        if tag in ("NNP", "NNPS"):
            # Skip if this token (or its lowercase) was already captured
            # by the keyword lookup, or is punctuation.
            if (token.lower() in matched_canonical_lower
                    or token in string.punctuation):
                continue
            # Also skip if any surface form contains this token
            if any(token.lower() in surf for surf, _, _ in _SURFACE_MAP):
                continue
            if token not in proper_nouns:
                proper_nouns.append(token)

    if proper_nouns:
        result["pos_nouns"] = proper_nouns

    # B-2: Capture action verbs via POS tags.
    verb_tags = {"VB", "VBP", "VBG", "VBZ", "VBD", "VBN"}
    for token, tag in tagged:
        if tag in verb_tags:
            canonical_verb = _VERB_SURFACE_MAP.get(token.lower())
            if canonical_verb:
                result.setdefault("action", [])
                if canonical_verb not in result["action"]:
                    result["action"].append(canonical_verb)

    return result


# ============================================================================
# 4. PRETTY-PRINT HELPER
# ============================================================================

def print_entities(entities: Dict[str, List[str]]) -> None:
    """Print extracted entities in a clean, human-readable format."""
    if not entities:
        print("  (no entities detected)")
        return

    category_labels = {
        "facility":  "Facilities",
        "office":    "Offices / Departments",
        "academic":  "Academic Systems",
        "food_type": "Food Types",
        "action":    "Actions (Verbs)",
        "pos_nouns": "Other Proper Nouns (POS)",
    }

    for category, items in entities.items():
        label = category_labels.get(category, category)
        print(f"  {label:.<30s} {', '.join(items)}")


# ============================================================================
# 5. TEST BLOCK
# ============================================================================

if __name__ == "__main__":
    # Sample queries that a XMUM student might type into the chatbot.
    test_queries = [
        "Where is the library?",
        "How do I connect to the campus Wi-Fi?",
        "List the halal food options at the canteen",
        "How do I borrow books from the library?",
        "Where is the International Affairs office?",
        "I want to apply for leave on the AC System",
        "How to register for a course and pay tuition fees?",
        "When does the academic calendar start?",
        "What are the hostel rules?",
        "How do I download my timetable and check grades?",
        "How to submit a maintenance request for my room?",
        "Show me vegetarian food near the dormitory",
    ]

    print("=" * 65)
    print("  XMUM Campus Chatbot - Entity Recognition Demo")
    print("  Method: NLTK POS Tagging + Keyword Lookup Dictionary")
    print("=" * 65)

    for query in test_queries:
        print(f"\n> Query: \"{query}\"")
        entities = extract_entities(query)
        print_entities(entities)

    print("\n" + "=" * 65)
    print("  Done. Entity extraction completed for all test queries.")
    print("=" * 65)
