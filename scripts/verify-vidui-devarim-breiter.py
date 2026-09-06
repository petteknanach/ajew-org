#!/usr/bin/env python3
"""Integrity gates for the bilingual Vidui Devarim Reader text."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "sources/vidui-devarim-breiter/hebrew.txt"
TRANSLATION = ROOT / "sources/vidui-devarim-breiter/english.txt"
READER = ROOT / "public/reader/vidui-devarim-breiter/section-1.json"
INDEX = ROOT / "public/reader/vidui-devarim-breiter/index.json"
CATALOG = ROOT / "public/reader/catalog.json"
ROUTE = ROOT / "src/pages/reader/vidui-devarim-breiter/[part]/[torah].astro"
EXPECTED_HE_SHA = "dafad42988e7b2606b788b031bcea818d307a07e34ccb21b3669a2a33e46fc89"


def paragraphs(path: Path) -> list[str]:
    return [part.strip() for part in re.split(r"\n\s*\n", path.read_text(encoding="utf-8")) if part.strip()]


source = paragraphs(SOURCE)
translation = paragraphs(TRANSLATION)
digest = hashlib.sha256("\n".join(source).encode("utf-8")).hexdigest()
if digest != EXPECTED_HE_SHA:
    raise SystemExit(f"Hebrew source hash mismatch: {digest}")
if len(source) != 9 or len(translation) != 9:
    raise SystemExit(f"Source alignment is incomplete: Hebrew={len(source)}, English={len(translation)}")

reader = json.loads(READER.read_text(encoding="utf-8"))
segments = reader.get("segments") or []
aligned = reader.get("aligned_segments") or []
if len(segments) != 9 or len(aligned) != 9:
    raise SystemExit(f"Reader alignment is incomplete: segments={len(segments)}, aligned={len(aligned)}")
for number, (he, en, segment, pair) in enumerate(zip(source, translation, segments, aligned, strict=True), start=1):
    if segment.get("index") != number or pair.get("index") != number:
        raise SystemExit(f"Paragraph {number}: index mismatch")
    if segment.get("he") != he or segment.get("he_nikud") != he or pair.get("he") != he:
        raise SystemExit(f"Paragraph {number}: Hebrew differs from supplied source")
    if segment.get("en") != en or pair.get("en") != en:
        raise SystemExit(f"Paragraph {number}: English differs from aligned translation source")
    if not he or not en:
        raise SystemExit(f"Paragraph {number}: empty counterpart")

joined_he = "\n".join(source)
for witness in (
    """וִדּוּי דְּבָרִים""",
    """רַבִּי יִצְחָק בְּרַיְיטֶער""",
    """לִקּוּטֵי מוֹהֲרַ"ן בְּתוֹרָה ד'""",
    """תּוֹרָה קפ"ח""",
    """נַ נַחְ נַחְמָ נַחְמָן מֵאוּמָן""",
):
    if witness not in joined_he:
        raise SystemExit(f"Required Hebrew witness missing: {witness}")
joined_en = "\n".join(translation).lower()
for witness in ("confession of words", "rabbi yitzchak breiter", "likutay moharan, torah 4", "torah 188", "na nach nachma nachman meuman"):
    if witness not in joined_en:
        raise SystemExit(f"Required English witness missing: {witness}")

index = json.loads(INDEX.read_text(encoding="utf-8"))
if index.get("totalTorahs") != 1 or index.get("torahs", [{}])[0].get("paragraphs") != 9:
    raise SystemExit("Reader index count mismatch")
catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
books = [book for book in catalog.get("books", []) if book.get("id") == "vidui-devarim-breiter"]
if len(books) != 1 or not books[0].get("hasHebrew") or not books[0].get("hasEnglish"):
    raise SystemExit("Reader catalog entry missing or not bilingual")
route = ROUTE.read_text(encoding="utf-8")
for witness in ("vidui-devarim-breiter", "reader-v2.css", "reader-content-original", "aligned_segments", "Book Index"):
    if witness not in route:
        raise SystemExit(f"Reader route missing capability: {witness}")

print("Vidui Devarim verified: exact supplied Hebrew hash, 9/9 aligned English paragraphs, catalog and route present")
