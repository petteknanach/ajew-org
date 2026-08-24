#!/usr/bin/env python3
"""Integrity gates for the bilingual Uzi Meshulam prison letter."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "sources/uzi-meshulam-prison-letter/hebrew.txt"
TRANSLATION = ROOT / "sources/uzi-meshulam-prison-letter/english.txt"
READER = ROOT / "public/reader/uzi-meshulam-prison-letter/section-1.json"
CATALOG = ROOT / "public/reader/catalog.json"
ROUTE = ROOT / "src/pages/reader/uzi-meshulam-prison-letter/[part]/[torah].astro"
READER_SCRIPT = ROOT / "public/reader-script.js"
EXPECTED_SHA = "1d48fc00a43fa201f8f487dacd797eff0d14975f0609e0a9b59334b7bf1dfa53"


def compact(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


digest = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
if digest != EXPECTED_SHA:
    raise SystemExit(f"Hebrew source hash mismatch: {digest}")
source_paragraphs = [line.strip() for line in SOURCE.read_text(encoding="utf-8").splitlines() if line.strip()]
if len(source_paragraphs) != 37:
    raise SystemExit(f"Hebrew source has {len(source_paragraphs)} paragraphs, expected 37")

reader = json.loads(READER.read_text(encoding="utf-8"))
segments = reader.get("segments") or []
aligned = reader.get("aligned_segments") or []
if len(segments) != 37 or len(aligned) != 37:
    raise SystemExit(f"Reader alignment is incomplete: segments={len(segments)}, aligned={len(aligned)}")
for index, (source, segment, pair) in enumerate(zip(source_paragraphs, segments, aligned, strict=True), start=1):
    if segment.get("index") != index or pair.get("index") != index:
        raise SystemExit(f"Paragraph {index}: index mismatch")
    if segment.get("he") != source or pair.get("he") != source:
        raise SystemExit(f"Paragraph {index}: Hebrew differs from supplied source")
    if not compact(segment.get("en")) or compact(segment.get("en")) != compact(pair.get("en")):
        raise SystemExit(f"Paragraph {index}: English missing or misaligned")
    if len(segment["en"]) < max(2, int(len(source) * 0.35)):
        raise SystemExit(f"Paragraph {index}: English is suspiciously short ({len(segment['en'])} vs Hebrew {len(source)})")

joined_hebrew = "\n".join(segment["he"] for segment in segments)
for required in (
    "עוזי משולם", "תלמידי היקר", "נחל נובע מקור חכמה", "רוח אפינו משיח ה'",
    "ליקוטי מוהר\"ן ח\"א סימן קנ\"ב", "הכשר כלים", "בשר וחלב", "מ\"ה החדש",
    "אם אין קמח אין תורה", "נַ נַחְ נַחְמָ נַחְמָן מאומן",
):
    if required not in joined_hebrew:
        raise SystemExit(f"Required Hebrew witness missing: {required}")
joined_english = "\n".join(segment["en"] for segment in segments)
for required in (
    "Uzi Meshulam", "my precious disciple", "flowing stream, the source of wisdom", "Messiah",
    "Likkutei Moharan", "Hilkhot Hekhsher Kelim", "Meat and Milk", "New MaH", "flour", "Na Naḥ",
):
    if required.lower() not in joined_english.lower():
        raise SystemExit(f"Required English witness missing: {required}")

catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
books = [book for book in catalog.get("books", []) if book.get("id") == "uzi-meshulam-prison-letter"]
if len(books) != 1 or not books[0].get("hasEnglish"):
    raise SystemExit("Reader catalog entry missing or not bilingual")
route = ROUTE.read_text(encoding="utf-8")
for required in ("reader-v2.css", "reader-content-original", "aligned_segments", "Book Index"):
    if required not in route:
        raise SystemExit(f"Reader route missing capability: {required}")
reader_script = READER_SCRIPT.read_text(encoding="utf-8")
if "document.querySelectorAll('.segment-he [data-nikud]')).some" not in reader_script:
    raise SystemExit("Nikud detection does not scan beyond an unpointed introductory segment")

print("Uzi Meshulam letter verified: exact Hebrew hash, 37/37 bilingual paragraphs, catalog and route present")
