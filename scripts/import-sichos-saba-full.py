#!/usr/bin/env python3
"""Import the complete ABBYY Hebrew transcript into tape/side JSON files.

The importer is deliberately loss-aware:
- all 234 expected tape sides are emitted;
- each side retains an exact `sourceSlice` from the OCR text;
- display segments are grouped only at existing blank-line paragraph boundaries;
- source and display SHA-256/count invariants are written to a manifest;
- known missing/partial sides are represented explicitly, never omitted.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "public/reader/saba-tape-transcripts"
TAPES = BOOK / "tapes"
DEFAULT_SOURCE = Path("/mnt/c/Users/Pettek/Downloads/Sichos_Saba_FULL_2072_pages_ABBYY16_OCR.txt")
START_RE = re.compile(r"(?m)^קלטת\s+(\d+)([אב])(?:\s*\([^\n]*\))?\s*$")
END_RE_TEMPLATE = r"(?m)^סוף קלטת\s+{n}{side}\s*$"
KNOWN_MISSING = {(9, "ב"), (23, "ב"), (62, "ב"), (89, "ב"), (90, "ב"), (99, "ב")}
KNOWN_PARTIAL = {(92, "ב")}
SIDE_EN = {"א": "A", "ב": "B"}
SIDE_SLUG = {"א": "a", "ב": "b"}


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def group_paragraphs(text: str, target: int = 1200, maximum: int = 1800) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n[ \t]*\n+", text.strip()) if p.strip()]
    grouped: list[str] = []
    current: list[str] = []
    length = 0
    for para in paragraphs:
        extra = len(para) + (2 if current else 0)
        if current and length + extra > maximum and length >= target // 2:
            grouped.append("\n\n".join(current))
            current = []
            length = 0
        current.append(para)
        length += len(para) + (2 if len(current) > 1 else 0)
        if length >= target:
            grouped.append("\n\n".join(current))
            current = []
            length = 0
    if current:
        grouped.append("\n\n".join(current))
    return grouped


def clean_display(source_slice: str, marker_text: str | None, tape: int, side: str) -> tuple[str, bool]:
    text = source_slice
    if marker_text and text.startswith(marker_text):
        text = text[len(marker_text):]
    end_re = re.compile(END_RE_TEMPLATE.format(n=tape, side=side))
    matches = list(end_re.finditer(text))
    had_end = bool(matches)
    if matches:
        # Remove only the final structural end marker; retain anything after it as a
        # source note so no text is silently discarded.
        m = matches[-1]
        text = text[:m.start()] + text[m.end():]
    return text.strip(), had_end


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    args = ap.parse_args()
    source_path = args.source
    raw = source_path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")

    # Preserve the already-published English tape-side translations. These 28
    # historical chapter files cover specific sides among tapes 1–16. They stay
    # at their numeric URLs while each is reviewed against the canonical Hebrew.
    legacy_english: dict[tuple[int, str], dict] = {}
    for legacy_path in sorted(BOOK.glob("chapter-*.json")):
        try:
            legacy = json.loads(legacy_path.read_text(encoding="utf-8-sig"))
        except (OSError, json.JSONDecodeError):
            continue
        title = str(legacy.get("title") or "")
        match = re.search(r"Tape\s+(\d+)G?,\s+Side\s+(Aleph|Bais)", title, re.I)
        chapter_match = re.search(r"chapter-(\d+)\.json$", legacy_path.name)
        if not match or not chapter_match:
            continue
        key = (int(match.group(1)), "א" if match.group(2).lower() == "aleph" else "ב")
        english_segments = [s.get("en", "").strip() for s in legacy.get("segments", []) if s.get("en", "").strip()]
        if english_segments:
            legacy_english[key] = {
                "url": f"/reader/saba-tape-transcripts/1/{chapter_match.group(1)}",
                "chapter": int(chapter_match.group(1)),
                "segments": len(english_segments),
                "characters": sum(len(s) for s in english_segments),
            }

    starts: dict[tuple[int, str], tuple[int, int, str]] = {}
    prior_translations: dict[str, dict] = {}
    for tape_path in TAPES.glob("tape-*.json"):
        try:
            prior = json.loads(tape_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        for seg in prior.get("segments", []):
            if seg.get("translationStatus") == "verified" and seg.get("en", "").strip():
                prior_translations[str(seg.get("id"))] = seg

    duplicate_starts: dict[str, int] = {}
    for m in START_RE.finditer(raw):
        key = (int(m.group(1)), m.group(2))
        if key in starts:
            duplicate_starts[f"{key[0]}{key[1]}"] = duplicate_starts.get(f"{key[0]}{key[1]}", 1) + 1
            continue
        starts[key] = (m.start(), m.end(), m.group(0))

    expected = [(n, side) for n in range(1, 118) for side in "אב"]
    # Tape 4B lacks a printed start marker. Its text begins immediately after the
    # structural end marker for 4A and ends at the printed 4B end marker.
    if (4, "ב") not in starts:
        end4a = re.search(END_RE_TEMPLATE.format(n=4, side="א"), raw)
        if not end4a:
            raise SystemExit("Cannot infer tape 4B: end marker for tape 4A not found")
        starts[(4, "ב")] = (end4a.end(), end4a.end(), "")

    missing_starts = [key for key in expected if key not in starts]
    if missing_starts:
        raise SystemExit(f"Missing tape start markers: {missing_starts}")

    ordered = sorted(((starts[key][0], key) for key in expected), key=lambda x: x[0])
    if [key for _, key in ordered] != expected:
        raise SystemExit("Tape markers are not in strict 1A,1B,...,117B order")

    BOOK.mkdir(parents=True, exist_ok=True)
    TAPES.mkdir(parents=True, exist_ok=True)
    download = ROOT / "public/downloads/sichos-saba-complete-hebrew-ocr.txt"
    download.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source_path, download)

    first_start = starts[(1, "א")][0]
    front_matter = raw[:first_start]
    (BOOK / "front-matter.json").write_text(json.dumps({
        "title": "Source introduction and transcription notice",
        "hebrewTitle": "מבוא והערת המתמלל",
        "sourceText": front_matter,
        "sourceSha256": sha(front_matter),
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    flat_index = []
    grouped_index = []
    manifest_sides = []
    concatenated_slices = []
    total_segments = 0
    total_display_chars = 0
    total_hebrew_chars = 0

    for idx, key in enumerate(expected):
        tape, side = key
        start_pos, _marker_end, marker = starts[key]
        next_pos = starts[expected[idx + 1]][0] if idx + 1 < len(expected) else len(raw)
        source_slice = raw[start_pos:next_pos]
        concatenated_slices.append(source_slice)
        display, had_end = clean_display(source_slice, marker, tape, side)
        grouped = group_paragraphs(display)
        canonical_grouped_display = "\n\n".join(grouped)
        status = "missing" if key in KNOWN_MISSING else "partial" if key in KNOWN_PARTIAL else "available"
        language = "yi" if tape == 116 else "he"
        slug = f"{tape}-{SIDE_SLUG[side]}"
        existing = legacy_english.get(key)
        side_translation_status = "existing_review_pending" if existing else ("source_missing" if status == "missing" else "not_started")
        segments = []
        for i, text in enumerate(grouped, 1):
            seg_id = f"{slug}-{i:03d}"
            prior = prior_translations.get(seg_id)
            if prior and prior.get("he") == text:
                segments.append({
                    "id": seg_id,
                    "he": text,
                    "en": prior["en"],
                    "translationStatus": "verified",
                    "qa": prior.get("qa", {}),
                })
            else:
                segments.append({
                    "id": seg_id,
                    "he": text,
                    "en": "",
                    "translationStatus": side_translation_status,
                })
        verified_here = sum(s["translationStatus"] == "verified" for s in segments)
        if segments and verified_here == len(segments):
            side_translation_status = "verified"
        elif verified_here:
            side_translation_status = "in_progress"
        total_segments += len(segments)
        total_display_chars += len(display)
        total_hebrew_chars += sum("\u0590" <= ch <= "\u05ff" for ch in display)
        item = {
            "number": slug,
            "displayNumber": f"{tape}{side}",
            "title": f"Tape {tape}, Side {SIDE_EN[side]}",
            "hebrewTitle": f"קלטת {tape}{side}",
            "paragraphs": len(segments),
            "url": f"/reader/saba-tape-transcripts/1/{slug}",
            "tapeNumber": tape,
            "side": SIDE_SLUG[side],
            "sourceStatus": status,
            "translationStatus": side_translation_status,
            "existingEnglishUrl": existing["url"] if existing else None,
        }
        flat_index.append(item)
        if side == "א":
            grouped_index.append({"tapeNumber": tape, "sides": []})
        grouped_index[-1]["sides"].append(item)
        payload = {
            "book": "saba-tape-transcripts",
            "bookTitle": "Saba Tape Transcripts",
            "hebrewBook": "תמלולי קלטות סבא",
            "part": 1,
            "torah": slug,
            "title": item["title"],
            "hebrewTitle": item["hebrewTitle"],
            "tapeNumber": tape,
            "side": SIDE_SLUG[side],
            "language": language,
            "sourceStatus": status,
            "translationStatus": item["translationStatus"],
            "existingEnglish": existing,
            "sourceMarker": marker,
            "sourceSlice": source_slice,
            "sourceSha256": sha(source_slice),
            "displaySha256": sha(canonical_grouped_display),
            "segments": segments,
            "navigation": {
                "prevUrl": flat_index[idx - 1]["url"] if idx else None,
                "nextUrl": f"/reader/saba-tape-transcripts/1/{expected[idx + 1][0]}-{SIDE_SLUG[expected[idx + 1][1]]}" if idx + 1 < len(expected) else None,
                "indexUrl": "/reader/saba-tape-transcripts/1",
            },
            "review": {
                "startMarkerInferred": key == (4, "ב"),
                "endMarkerPresent": had_end,
                "duplicateStartMarkerInSource": key == (73, "א"),
                "notes": "Source explicitly marks this side as missing." if status == "missing" else "Source states that much of the wording is missing or inaudible." if status == "partial" else "",
            },
        }
        (TAPES / f"tape-{tape:03d}-{SIDE_SLUG[side]}.json").write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        manifest_sides.append({
            "tape": tape,
            "side": SIDE_SLUG[side],
            "file": f"tapes/tape-{tape:03d}-{SIDE_SLUG[side]}.json",
            "sourceStatus": status,
            "language": language,
            "sourceChars": len(source_slice),
            "displayChars": len(display),
            "hebrewChars": sum("\u0590" <= ch <= "\u05ff" for ch in display),
            "segments": len(segments),
            "verifiedEnglishSegments": verified_here,
            "sourceSha256": sha(source_slice),
            "displaySha256": sha(canonical_grouped_display),
            "translationStatus": item["translationStatus"],
            "existingEnglish": existing,
        })

    reconstructed = front_matter + "".join(concatenated_slices)
    if reconstructed != raw:
        raise SystemExit("LOSS CHECK FAILED: front matter plus source slices does not reconstruct source exactly")

    index = {
        "book": "saba-tape-transcripts",
        "title": "Saba Tape Transcripts",
        "hebrewBook": "תמלולי קלטות סבא",
        "author": "Saba Yisroel (Rabbi Yisroel Dov Odesser)",
        "totalTapes": 117,
        "totalSides": 234,
        "description": "Complete Hebrew transcripts organized by tape and side, with verified English translation added segment by segment.",
        "sourceNotice": "The supplied Hebrew transcript states that it contains errors and that unclear matters should be checked against the recordings. Missing and partial sides are marked explicitly.",
        "downloadUrl": "/downloads/sichos-saba-complete-hebrew-ocr.txt",
        "torahs": flat_index,
        "tapes": grouped_index,
    }
    (BOOK / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    manifest = {
        "schemaVersion": 1,
        "sourceFile": source_path.name,
        "sourceSha256": sha(raw),
        "sourceChars": len(raw),
        "frontMatterChars": len(front_matter),
        "expectedTapes": 117,
        "expectedSides": 234,
        "emittedSides": len(manifest_sides),
        "availableSides": sum(x["sourceStatus"] == "available" for x in manifest_sides),
        "missingSides": [f"{x['tape']}{'א' if x['side']=='a' else 'ב'}" for x in manifest_sides if x["sourceStatus"] == "missing"],
        "partialSides": [f"{x['tape']}{'א' if x['side']=='a' else 'ב'}" for x in manifest_sides if x["sourceStatus"] == "partial"],
        "yiddishSides": ["116א", "116ב"],
        "duplicateStartMarkers": duplicate_starts,
        "totalDisplayChars": total_display_chars,
        "totalHebrewChars": total_hebrew_chars,
        "totalSegments": total_segments,
        "verifiedEnglishSegments": sum(x["verifiedEnglishSegments"] for x in manifest_sides),
        "verifiedEnglishSides": sum(x["translationStatus"] == "verified" for x in manifest_sides),
        "inProgressSides": sum(x["translationStatus"] == "in_progress" for x in manifest_sides),
        "existingEnglishSides": len(legacy_english),
        "lossCheck": "PASS",
        "sides": manifest_sides,
    }
    (BOOK / "translation-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: manifest[k] for k in (
        "sourceSha256", "sourceChars", "expectedSides", "emittedSides", "availableSides",
        "missingSides", "partialSides", "yiddishSides", "totalDisplayChars", "totalHebrewChars",
        "totalSegments", "lossCheck"
    )}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
