#!/usr/bin/env python3
"""Approve an independently reviewed legacy English tape-side translation."""
from __future__ import annotations
import argparse, json, subprocess, sys
from pathlib import Path
from typing import NoReturn

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "public/reader/saba-tape-transcripts"
LEDGER = BOOK / "existing-english-reviews.json"
REQUIRED = ("complete", "noSkipping", "noTruncation", "noSummarization", "noAdditions", "uncertaintiesPreserved")


def die(msg: str) -> NoReturn:
    raise SystemExit(f"APPROVAL REFUSED: {msg}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("review", type=Path)
    args = ap.parse_args()
    review = json.loads(args.review.read_text(encoding="utf-8"))
    side_id = str(review.get("id") or "")
    parts = side_id.split("-")
    if len(parts) != 2 or not parts[0].isdigit() or parts[1] not in {"a", "b"}:
        die("id must have form tape-side, for example 1-a")
    tape, side = int(parts[0]), parts[1]
    canonical_path = BOOK / f"tapes/tape-{tape:03d}-{side}.json"
    canonical = json.loads(canonical_path.read_text(encoding="utf-8"))
    existing = canonical.get("existingEnglish")
    if not existing:
        die("canonical side has no mapped existing English")
    if review.get("verdict") not in {"approved", "corrected_in_legacy"}:
        die("verdict must be approved or corrected_in_legacy")
    if review.get("sourceSha256") != canonical.get("sourceSha256"):
        die("review source hash does not match the canonical source slice")
    if review.get("legacyChapter") != existing.get("chapter"):
        die("review chapter does not match canonical mapping")
    if any(review.get("checks", {}).get(k) is not True for k in REQUIRED):
        die(f"all checks must be true: {REQUIRED}")
    legacy = json.loads((BOOK / f"chapter-{existing['chapter']}.json").read_text(encoding="utf-8-sig"))
    legacy_en = [s.get("en", "").strip() for s in legacy.get("segments", []) if s.get("en", "").strip()]
    if len(legacy_en) != existing.get("segments") or sum(len(s) for s in legacy_en) != existing.get("characters"):
        die("legacy English changed since canonical mapping")

    ledger = json.loads(LEDGER.read_text(encoding="utf-8"))
    ledger.setdefault("reviews", {})[side_id] = {
        "sourceSha256": review["sourceSha256"],
        "legacyChapter": review["legacyChapter"],
        "verdict": review["verdict"],
        "checks": review["checks"],
        "reviewerNotes": review.get("reviewerNotes", ""),
    }
    LEDGER.write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    subprocess.run([sys.executable, str(ROOT / "scripts/import-sichos-saba-full.py")], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
    subprocess.run([sys.executable, str(ROOT / "scripts/verify-sichos-saba-full.py")], cwd=ROOT, check=True)
    print(f"APPROVED_EXISTING_ENGLISH {side_id} CHAPTER={existing['chapter']}")

if __name__ == "__main__":
    main()
