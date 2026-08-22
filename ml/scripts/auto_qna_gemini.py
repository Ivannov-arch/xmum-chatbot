# scripts/auto_qna_gemini.py
#
# Usage: python scripts/auto_qna_gemini.py <file_raw.txt>
# Automatically generates Q&A pairs in CSV format using Gemini API.
# Supports model fallback (if primary model hits quota, tries next one).
# Splits large text into chunks to avoid token limits.

import os
import sys
import time
import pathlib

import requests
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

# Fallback model order: cheapest/fastest first, premium last
FALLBACK_MODELS = [
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-3.1-pro-preview",
]

# Max characters per chunk (keep well under token limits)
CHUNK_SIZE = 40_000

# Seconds to wait between chunk requests to avoid per-minute rate limits
CHUNK_DELAY = 6


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def build_prompt(raw_text: str, module_name: str) -> str:
    return f"""You are a campus chatbot dataset builder.
Analyze the following raw text extracted from a university student handbook and extract all important factual information into comprehensive Question and Answer (Q&A) pairs.
Format the output EXACTLY as CSV data (no markdown, no code blocks) with this header on the first line:
module,question,answer,keywords

Rules:
1. 'module' must be exactly: {module_name}
2. 'keywords' must be 3-5 comma-separated words enclosed in double quotes (e.g. "library, hours, open, schedule").
3. Both 'question' and 'answer' MUST be enclosed in double quotes to prevent comma issues.
4. If the answer contains double quotes, escape them as two double quotes ("").
5. Produce as many relevant Q&A pairs as possible (aim for 10-20 per chunk if the text is detailed).
6. Focus on unique, factual information: rules, procedures, deadlines, contacts, locations, fees, and policies.
7. Do NOT output any conversational text, explanation, or markdown. Output ONLY the raw CSV rows (no header repeat).

Here is the raw text:
{raw_text}
"""


def call_gemini_rest(prompt: str, api_keys: list[str]) -> str:
    """Try each API key and model fallback; return the text output or raise RuntimeError."""
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 8192},
    }

    for api_key in api_keys:
        key_exhausted = False
        for model in FALLBACK_MODELS:
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model}:generateContent?key={api_key}"
            )
            try:
                resp = requests.post(url, headers=headers, json=payload, timeout=120)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text = (
                            candidates[0]
                            .get("content", {})
                            .get("parts", [{}])[0]
                            .get("text", "")
                            .strip()
                        )
                        print(f"  [OK] Key: {api_key[:8]}..., Model: {model}")
                        return text
                    print(f"  [WARN] Key: {api_key[:8]}..., Model {model} returned empty candidates.")
                else:
                    print(f"  [SKIP] Key: {api_key[:8]}..., Model {model}: HTTP {resp.status_code}. Trying next...")
                    if resp.status_code in (429, 403) or (resp.status_code == 400 and "API key" in resp.text):
                        key_exhausted = True
                        break
            except Exception as exc:
                print(f"  [SKIP] Key: {api_key[:8]}..., Model {model}: {exc}. Trying next...")
        if key_exhausted:
            continue

    raise RuntimeError("All Gemini API keys or models failed or are rate-limited.")


def clean_csv_output(text: str) -> str:
    """Strip markdown code fences if the model adds them."""
    if text.startswith("```csv"):
        text = text[6:].strip()
    elif text.startswith("```"):
        text = text[3:].strip()
    if text.endswith("```"):
        text = text[:-3].strip()
    return text


# ---------------------------------------------------------------------------
# Main conversion
# ---------------------------------------------------------------------------

def convert_text_to_csv(input_file: str, output_file: str, module_name: str) -> bool:
    api_keys = []
    for key_name in ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3"]:
        val = os.environ.get(key_name, "").strip()
        if val and val != "your-gemini-api-key-here":
            api_keys.append(val)
            
    if not api_keys:
        print("ERROR: No valid GEMINI_API_KEY, GEMINI_API_KEY_2, or GEMINI_API_KEY_3 found in .env")
        return False

    # Read source file
    raw_text = None
    for enc in ("utf-8", "utf-16", "latin-1"):
        try:
            with open(input_file, "r", encoding=enc) as f:
                raw_text = f.read()
            break
        except (UnicodeDecodeError, Exception):
            continue
    if raw_text is None:
        print(f"[ERROR] Could not read: {input_file}")
        return False

    if not raw_text.strip():
        print(f"[SKIP] {input_file} is empty. Writing empty CSV.")
        with open(output_file, "w", encoding="utf-8-sig") as f:
            f.write("module,question,answer,keywords\n")
        return True

    # Split into chunks
    chunks = [raw_text[i : i + CHUNK_SIZE] for i in range(0, len(raw_text), CHUNK_SIZE)]
    total = len(chunks)
    print(f"[INFO] Text: {len(raw_text):,} chars -> {total} chunk(s) of up to {CHUNK_SIZE:,} chars each.")

    all_csv_rows: list[str] = []

    for idx, chunk in enumerate(chunks, 1):
        print(f"\n[CHUNK {idx}/{total}] Sending {len(chunk):,} chars to Gemini API...")
        prompt = build_prompt(chunk, module_name)
        try:
            output = call_gemini_rest(prompt, api_keys)
            output = clean_csv_output(output)
            # Drop any repeated header lines the model may emit
            for line in output.splitlines():
                stripped = line.strip()
                if not stripped or stripped.lower().startswith("module,"):
                    continue
                all_csv_rows.append(stripped)
        except RuntimeError as e:
            print(f"[ERROR] Chunk {idx}: {e}")
            print("[WARN] Skipping this chunk and continuing with others.")

        if idx < total:
            print(f"  Waiting {CHUNK_DELAY}s before next chunk...")
            time.sleep(CHUNK_DELAY)

    if not all_csv_rows:
        print("[ERROR] No Q&A pairs were generated.")
        return False

    # Write final CSV with single header
    with open(output_file, "w", encoding="utf-8-sig") as f:
        f.write("module,question,answer,keywords\n")
        for row in all_csv_rows:
            f.write(row + "\n")

    print(f"\n[SUCCESS] {len(all_csv_rows)} Q&A rows saved to: {output_file}")
    return True


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/auto_qna_gemini.py <file_raw.txt>")
        print("Example: python scripts/auto_qna_gemini.py database/seeds/foundation_student_raw.txt")
        sys.exit(1)

    target_file = sys.argv[1]

    # Auto-derive module name and output path from input filename
    # e.g. database/seeds/foundation_student_raw.txt -> module: foundation_student
    base_name = pathlib.Path(target_file).stem          # foundation_student_raw
    module_name = base_name.replace("_raw", "")         # foundation_student

    output_dir = pathlib.Path(target_file).parent
    output_csv = output_dir / f"{module_name}_qa.csv"

    print(f"Module : {module_name}")
    print(f"Input  : {target_file}")
    print(f"Output : {output_csv}\n")

    success = convert_text_to_csv(target_file, str(output_csv), module_name)
    if not success:
        sys.exit(1)

    print("\n[NEXT STEP] Run: python scripts/merge_qa_csv_to_seeds.py")