#!/usr/bin/env python3
"""Prevent outside-source attribution from returning to the Super Reader edition."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public/reader/super/likutay-moharan"
PAGES = ROOT / "src/pages/reader/super/likutay-moharan"
FORBIDDEN = (
    "sefaria",
    "rabenubook",
    "moshe mykoff",
    "breslov research inst",
    "cc-by-nc",
    "cc by-nc",
    "nli.org/he/books/nnl01",
)
PEER_URL = "https://www.peer-halikutim.com/"

issues = []
for base, patterns in ((PUBLIC, ("*.json",)), (PAGES, ("*.astro",))):
    for pattern in patterns:
        for path in base.rglob(pattern):
            text = path.read_text(encoding="utf-8")
            lower = text.lower()
            for marker in FORBIDDEN:
                if marker in lower:
                    issues.append(f"{path.relative_to(ROOT)}: forbidden attribution/source marker {marker!r}")

for number in range(1, 35):
    page = PAGES / "1" / f"{number}.astro"
    if not page.exists():
        issues.append(f"missing Super Reader page: {page.relative_to(ROOT)}")
    elif PEER_URL not in page.read_text(encoding="utf-8"):
        issues.append(f"{page.relative_to(ROOT)}: required Pe’er HaLikutim attribution link missing")

if issues:
    print("Super Reader source-policy verification FAILED:")
    for issue in issues:
        print(f"  - {issue}")
    raise SystemExit(1)

print("Super Reader source policy verified: project edition has no outside-source attribution; Pe’er HaLikutim credit retained on Torahs 1–34.")
