# scripts/extract_web.py
# Extract clean text from an XMUM website page
# Usage: python scripts/extract_web.py "https://www.xmu.edu.my/library" > database/seeds/library_raw.txt

import sys
import requests
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 (XMUM chatbot research project)"}


def extract_web_text(url: str):
    print(f"Fetching: {url}\n", file=sys.stderr)
    res = requests.get(url, headers=HEADERS, timeout=10)
    res.raise_for_status()

    soup = BeautifulSoup(res.text, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    lines = [line.strip() for line in soup.get_text(separator="\n").splitlines() if line.strip()]
    print("\n".join(lines))
    print(f"\n✅ Total lines extracted: {len(lines)}", file=sys.stderr)


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "https://www.xmu.edu.my"
    extract_web_text(url)