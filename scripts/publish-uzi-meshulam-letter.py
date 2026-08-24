#!/usr/bin/env python3
"""Publish the bilingual Uzi Meshulam prison letter into Reader JSON."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "sources/uzi-meshulam-prison-letter"
HEBREW_PATH = SOURCE_DIR / "hebrew.txt"
ENGLISH_PATH = SOURCE_DIR / "english.txt"
OUTPUT_PATH = ROOT / "public/reader/uzi-meshulam-prison-letter/section-1.json"
EXPECTED_HEBREW_SHA256 = "1d48fc00a43fa201f8f487dacd797eff0d14975f0609e0a9b59334b7bf1dfa53"


def nonempty_lines(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if line.strip()]


def english_paragraphs(text: str, expected: int) -> list[str]:
    blocks = [re.sub(r"\s*\n\s*", " ", block).strip() for block in re.split(r"\n\s*\n", text.strip()) if block.strip()]
    if len(blocks) == expected:
        return blocks
    lines = nonempty_lines(text)
    if len(lines) == expected:
        return lines
    raise RuntimeError(f"English paragraph count is {len(blocks)} blocks / {len(lines)} lines; expected {expected}")


def main() -> None:
    hebrew_bytes = HEBREW_PATH.read_bytes()
    digest = hashlib.sha256(hebrew_bytes).hexdigest()
    if digest != EXPECTED_HEBREW_SHA256:
        raise RuntimeError(f"Hebrew source changed: {digest}")

    hebrew = nonempty_lines(hebrew_bytes.decode("utf-8"))
    english = english_paragraphs(ENGLISH_PATH.read_text(encoding="utf-8"), len(hebrew))
    if len(hebrew) != 37:
        raise RuntimeError(f"Expected 37 Hebrew paragraphs, found {len(hebrew)}")
    if any(not paragraph for paragraph in english):
        raise RuntimeError("An English paragraph is empty")

    segments = [
        {
            "index": index,
            "he": he,
            "he_nikud": "",
            "en": en,
        }
        for index, (he, en) in enumerate(zip(hebrew, english, strict=True), start=1)
    ]
    payload = {
        "id": "uzi-meshulam-prison-letter-1-1",
        "book": "uzi-meshulam-prison-letter",
        "part": 1,
        "torah": 1,
        "displayNumber": 1,
        "title": "Prison Letter of 18 MarCheshvan 5755",
        "hebrewTitle": "מכתב מן הכלא — ח״י במרחשוון התשנ״ה",
        "subtitle": "On Rabbi Nachman, the Hidden Light, Self-Sacrifice, and the Soul of Mashiach",
        "hebrewSubtitle": "על רבי נחמן, האור הגנוז, מסירות נפש ונשמת משיח",
        "author": "Uzi A. Meshulam",
        "hebrewAuthor": "עוזי א. בר׳ דוד משולם",
        "sourceDate": "18 MarCheshvan 5755",
        "sourceContext": "Written in prison on the day of Saba Yisroel’s passing, according to the supplied introduction.",
        "translationRegister": "Scholastic formal equivalence; complete paragraph-level alignment",
        "sourceHebrewSha256": EXPECTED_HEBREW_SHA256,
        "themes": ["Rabbi Nachman", "Hidden Light", "Soul of Mashiach", "Self-Sacrifice", "Tzaddik HaEmes"],
        "keywords": [
            "Uzi Meshulam", "Ozi Meshulam", "Uzzi Meshulam", "עוזי משולם", "prison letter",
            "Rabbi Nachman", "רבי נחמן", "hidden light", "אור הגנוז", "soul of Mashiach",
            "נשמת משיח", "Tzaddik HaEmes", "צדיק האמת", "18 MarCheshvan 5755", "ח״י במרחשוון התשנ״ה",
        ],
        "segments": segments,
        "aligned_segments": [{"index": segment["index"], "he": segment["he"], "en": segment["en"]} for segment in segments],
        "hasEnglish": True,
        "hasNikud": True,
        "navigation": {"prevUrl": None, "nextUrl": None},
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Published {len(segments)} aligned Hebrew-English paragraphs to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
