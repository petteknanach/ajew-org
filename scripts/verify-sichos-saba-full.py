#!/usr/bin/env python3
"""Structural and completeness checks for the full Saba tape corpus."""
from __future__ import annotations
import hashlib, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "public/reader/saba-tape-transcripts"
TAPES = BOOK / "tapes"
SOURCE = ROOT / "public/downloads/sichos-saba-complete-hebrew-ocr.txt"
SIDE_HE = {"a": "א", "b": "ב"}


def sha(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


def canonical_display(text: str) -> str:
    return "\n\n".join(p.strip() for p in re.split(r"\n[ \t]*\n+", text.strip()) if p.strip())


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    index = json.loads((BOOK / "index.json").read_text())
    manifest = json.loads((BOOK / "translation-manifest.json").read_text())
    front = json.loads((BOOK / "front-matter.json").read_text())
    source = SOURCE.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")
    expected = [(n, side) for n in range(1, 118) for side in ("a", "b")]
    files = sorted(TAPES.glob("tape-*.json"))
    if len(files) != 234: fail(f"expected 234 tape JSON files, got {len(files)}")
    if len(index.get("torahs", [])) != 234 or len(index.get("tapes", [])) != 117:
        fail("index must contain 234 sides grouped into 117 tapes")
    if manifest.get("emittedSides") != 234 or manifest.get("lossCheck") != "PASS":
        fail("manifest side count or loss check is invalid")
    if sha(source) != manifest.get("sourceSha256"):
        fail("public source download hash differs from manifest")

    slices = []
    total_segments = 0
    verified_segments = 0
    existing_english_sides = 0
    actual_order = []
    for n, side in expected:
        p = TAPES / f"tape-{n:03d}-{side}.json"
        d = json.loads(p.read_text())
        actual_order.append((d.get("tapeNumber"), d.get("side")))
        source_slice = d.get("sourceSlice", "")
        slices.append(source_slice)
        if sha(source_slice) != d.get("sourceSha256"):
            fail(f"source hash mismatch in {p.name}")
        segments = d.get("segments", [])
        total_segments += len(segments)
        displayed = "\n\n".join(x.get("he", "") for x in segments)
        # Structural start/end markers are excluded from display. The importer records
        # an independent display hash; compare canonical paragraph content to prevent loss.
        if segments and sha(displayed) != d.get("displaySha256"):
            fail(f"display text hash mismatch in {p.name}")
        if d.get("sourceStatus") == "available" and not segments:
            fail(f"available side has no display segments: {p.name}")
        existing = d.get("existingEnglish")
        if existing:
            existing_english_sides += 1
            chapter = existing.get("chapter")
            legacy_path = BOOK / f"chapter-{chapter}.json"
            if not isinstance(chapter, int) or not legacy_path.exists():
                fail(f"invalid existing-English chapter reference in {p.name}")
            legacy = json.loads(legacy_path.read_text(encoding="utf-8-sig"))
            legacy_en = [s.get("en", "").strip() for s in legacy.get("segments", []) if s.get("en", "").strip()]
            if len(legacy_en) != existing.get("segments"):
                fail(f"existing-English segment count mismatch in {p.name}")
            if sum(len(s) for s in legacy_en) != existing.get("characters"):
                fail(f"existing-English character count mismatch in {p.name}")
        for seg in segments:
            he, en = seg.get("he", "").strip(), seg.get("en", "").strip()
            if not he: fail(f"empty Hebrew segment {seg.get('id')} in {p.name}")
            if len(he) > 1800: fail(f"oversized translation segment {seg.get('id')}: {len(he)} chars")
            status = seg.get("translationStatus")
            if status == "verified":
                verified_segments += 1
                if not en: fail(f"verified segment lacks English: {seg.get('id')}")
                ratio = len(en) / max(len(he), 1)
                if not 0.25 <= ratio <= 6.0:
                    fail(f"suspicious HE/EN length ratio {ratio:.2f} for {seg.get('id')}")
            elif en:
                fail(f"unverified segment contains publishable English: {seg.get('id')}")
    if actual_order != expected: fail("tape JSON order or metadata is incomplete")
    reconstructed = front.get("sourceText", "") + "".join(slices)
    if reconstructed != source: fail("front matter plus 234 exact source slices does not reconstruct source")
    if total_segments != manifest.get("totalSegments"):
        fail(f"segment count differs: {total_segments} vs manifest {manifest.get('totalSegments')}")
    if existing_english_sides != manifest.get("existingEnglishSides"):
        fail(f"existing-English side count differs: {existing_english_sides} vs manifest {manifest.get('existingEnglishSides')}")
    print(json.dumps({
        "status": "PASS", "tapes": 117, "sides": 234,
        "segments": total_segments, "verifiedEnglishSegments": verified_segments,
        "existingEnglishSides": existing_english_sides,
        "sourceSha256": sha(source), "exactSourceReconstruction": True,
    }, indent=2))

if __name__ == "__main__":
    main()
