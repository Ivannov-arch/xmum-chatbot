# scripts/extract_pdf_ocr.py
# Extract raw text from a scanned (image-based) PDF handbook using OCR.
# Usage: python scripts/extract_pdf_ocr.py "Xmum Student_Handbook.pdf" xmum_handbook_ocr

import sys
import pathlib
import pypdfium2 as pdfium
import pytesseract
from PIL import Image

# ============================================================================
# IMPORTANT WINDOWS SETUP FOR OCR:
# Tesseract-OCR is an external software that must be installed on your system.
# 1. Download it here: https://github.com/UB-Mannheim/tesseract/wiki
# 2. Install it (default path is usually C:\Program Files\Tesseract-OCR)
# 3. If you get a "TesseractNotFoundError", UNCOMMENT the line below and 
#    update the path to point to your tesseract.exe location:
# ============================================================================
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'


def extract_pdf_ocr(pdf_path: str, output_name: str):
    path = pathlib.Path(pdf_path)

    if not path.exists():
        print(f"[ERROR] File not found: '{pdf_path}'")
        sys.exit(1)

    # --- Check Tesseract Installation ---
    try:
        tesseract_version = pytesseract.get_tesseract_version()
        print(f"[1/4] Found Tesseract OCR version {tesseract_version}")
    except pytesseract.TesseractNotFoundError:
        print("[ERROR] Tesseract OCR is not installed or not configured correctly.")
        print("        Please read the IMPORTANT WINDOWS SETUP comment inside this script.")
        sys.exit(1)

    print(f"[2/4] Opening PDF: {path.name} ({path.stat().st_size / 1024:.1f} KB)")
    output_dir = pathlib.Path("database/seeds")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f"{output_name}_raw.txt"

    all_text = []

    # --- Open PDF with pypdfium2 ---
    try:
        pdf = pdfium.PdfDocument(pdf_path)
    except Exception as e:
        print(f"[ERROR] Failed to open PDF: {e}")
        sys.exit(1)

    n_pages = len(pdf)
    print(f"[3/4] Total pages to OCR: {n_pages}. This may take a few minutes...")

    # --- Process pages one by one ---
    for i in range(n_pages):
        print(f"      Processing page {i+1}/{n_pages}...", end="\r", flush=True)
        page = pdf.get_page(i)

        # Render the PDF page to a high-resolution bitmap image (scale=3 is roughly 216 DPI)
        bitmap = page.render(scale = 3)
        pil_image = bitmap.to_pil()

        #Run Tesseract OCR on the image
        text = pytesseract.image_to_string(pil_image)

        # Append to list if not empty
        if text.strip():
            all_text.append(f"\n=== PAGE {i + 1} ===\n{text}")

    
    print(f"\n      Finished processing {n_pages} pages.")
    pdf.close()

    # --- Save output ---
    raw = "\n".join(all_text)

    if not raw.strip():
        print("[WARNING] OCR failed to extract any meaningful text.")
        sys.exit(1)

    output_file.write_text(raw, encoding="utf-8")
    print(f"[4/4] SUCCESS: Saved to {output_file} ({len(raw):,} characters, {n_pages} pages)")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python scripts/extract_pdf_ocr.py <filename.pdf> <output_name>")
        print("Example: python scripts/extract_pdf_ocr.py \"Xmum Student_Handbook.pdf\" xmum_handbook_ocr")
        sys.exit(1)

    extract_pdf_ocr(pdf_path=sys.argv[1], output_name=sys.argv[2])