# scripts/extract_pdf.py
# Extract raw text from a PDF handbook to a .txt file
# Usage: python scripts/extract_pdf.py "XMUM_Handbook.pdf" campus_life

import sys
import pathlib


def extract_pdf_text(pdf_path: str, output_name: str):
    import pdfplumber  # import inside function for clearer errors

    path = pathlib.Path(pdf_path)

    # --- Check if file exists ---
    if not path.exists():
        print(f"[ERROR] File not found: '{pdf_path}'")
        print(f"        Available PDF files in current directory:")
        for f in pathlib.Path(".").glob("*.pdf"):
            print(f"          {f.name}")
        sys.exit(1)

    print(f"[1/4] File found: {path.name}  ({path.stat().st_size / 1024:.1f} KB)")

    output_dir = pathlib.Path("database/seeds")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f"{output_name}_raw.txt"

    # --- Open PDF ---
    print(f"[2/4] Opening PDF with pdfplumber...")
    try:
        pdf = pdfplumber.open(path)
    except Exception as e:
        print(f"[ERROR] Failed to open PDF: {e}")
        sys.exit(1)

    print(f"[3/4] Total pages: {len(pdf.pages)}")

    # --- Extract text page by page ---
    all_text = []
    skipped = 0
    for i, page in enumerate(pdf.pages):
        try:
            text = page.extract_text()
        except Exception as e:
            print(f"       Page {i+1}: ERROR ({e})")
            skipped += 1
            continue

        if text and text.strip():
            all_text.append(f"\n=== PAGE {i+1} ===\n{text}")
        else:
            skipped += 1

    pdf.close()

    print(f"       Success: {len(all_text)} pages  |  Skipped/Empty: {skipped} pages")

    # --- Write output ---
    raw = "\n".join(all_text)

    if not raw.strip():
        print()
        print("[WARNING] No text could be extracted!")
        print("          This PDF might be a SCAN (images), not a text PDF.")
        print("          Solution: Use an OCR tool like Adobe Acrobat or pytesseract.")
        sys.exit(1)

    output_file.write_text(raw, encoding="utf-8")
    print(f"[4/4] SUCCESS: Saved to {output_file} ({len(raw):,} characters, {len(all_text)} pages)")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python scripts/extract_pdf.py <filename.pdf> <output_name>")
        print("Example: python scripts/extract_pdf.py \"Xmum Student_Handbook.pdf\" xmum_handbook")
        sys.exit(1)

    extract_pdf_text(pdf_path=sys.argv[1], output_name=sys.argv[2])