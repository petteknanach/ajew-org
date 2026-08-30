#!/usr/bin/env python3
"""Build-safe verification for the repaired Sichos HaRan bilingual corpus."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
READER = ROOT / "public" / "reader" / "sichos-haran"
REPORT = ROOT / "analysis" / "sichos-haran-alignment-report.json"


def sha(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main():
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    rows = {int(row["sicha"]): row for row in report["rows"]}
    assert set(rows) == set(range(1, 309)), "alignment report must cover Sichos 1–308"
    total = 0
    for number in range(1, 309):
        path = READER / f"sicha-{number}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        segments = data.get("segments") or []
        assert len(segments) == 1, f"{path}: expected one whole-sicha bilingual segment"
        seg = segments[0]
        assert seg.get("index") == 1, f"{path}: segment index must be 1"
        assert str(seg.get("he") or "").strip(), f"{path}: Hebrew is empty"
        assert str(seg.get("en") or "").strip(), f"{path}: English is empty"
        row = rows[number]
        assert sha(seg["he"]) == row["renderedHebrewSha256"], f"{path}: Hebrew changed after reviewed repair"
        assert sha(seg.get("he_nikud", "")) == row["renderedNikudSha256"], f"{path}: vocalized Hebrew changed after reviewed repair"
        assert sha(seg["en"]) == row["authoritativeEnglishSha256"], f"{path}: English differs from numbered authoritative source"
        assert data.get("totalParagraphs") == 1 and data.get("hasEnglish") is True
        total += 1
    assert report["beforeSegments"] == 614
    assert report["afterSegments"] == total == 308
    assert report["beforeEmptyHebrewSegments"] == 234
    assert report["afterEmptyHebrewSegments"] == report["afterEmptyEnglishSegments"] == 0
    assert report["hebrewCharacterSequencePreserved"] is True
    assert report["nikudCharacterSequencePreserved"] is True
    print("Sichos HaRan alignment verified: 308/308 exact bilingual whole-sicha segments; 0 empty language fields.")


if __name__ == "__main__":
    main()
