#!/usr/bin/env python3
"""Build-safe verification for complete Sichos HaRan bilingual alignment."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
READER = ROOT / "public" / "reader" / "sichos-haran"
REPORT = ROOT / "analysis" / "sichos-haran-alignment-report.json"


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main() -> None:
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    assert report.get("schemaVersion") == 3
    assert report.get("sichos") == 308
    rows = {int(row["sicha"]): row for row in report["rows"]}
    assert set(rows) == set(range(1, 309))
    total = 0
    for number in range(1, 309):
        path = READER / f"sicha-{number}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        segments = data.get("segments") or []
        row = rows[number]
        assert len(segments) == row["segments"] > 0, f"{path}: segment-count mismatch"
        assert [seg.get("index") for seg in segments] == list(range(1, len(segments) + 1)), f"{path}: non-sequential indexes"
        for segment in segments:
            assert str(segment.get("he") or "").strip(), f"{path}: empty Hebrew"
            assert str(segment.get("he_nikud") or "").strip(), f"{path}: empty vocalized Hebrew"
            assert str(segment.get("en") or "").strip(), f"{path}: empty English"
        assert data.get("totalParagraphs") == len(segments)
        assert data.get("hasEnglish") is True and data.get("hasNikud") is True
        assert sha("\n\n".join(seg["he"] for seg in segments)) == row["renderedHebrewSha256"], f"{path}: Hebrew changed"
        assert sha("\n\n".join(seg["he_nikud"] for seg in segments)) == row["renderedNikudSha256"], f"{path}: vocalized Hebrew changed"
        assert sha("\n\n".join(seg["en"] for seg in segments)) == row["authoritativeEnglishSha256"], f"{path}: English changed"
        total += len(segments)
    assert total == report["segments"]
    assert report["emptyHebrewSegments"] == 0
    assert report["emptyNikudSegments"] == 0
    assert report["emptyEnglishSegments"] == 0
    print(f"Sichos HaRan verified: 308/308 sichos, {total} bilingual segments, 0 empty language fields.")


if __name__ == "__main__":
    main()
