#!/usr/bin/env python3
"""Merge independently translated and reviewed Saba segments.

Nothing is published from a translator's staging file alone. A separate review
JSON must approve the exact source hash and either approve or correct the English.
After merging, the loss-aware importer is rerun to refresh index/manifest status
while preserving verified English, followed by the complete corpus verifier.
"""
from __future__ import annotations
import argparse, hashlib, json, re, subprocess, sys
from pathlib import Path
from typing import NoReturn

ROOT = Path(__file__).resolve().parents[1]
TAPES = ROOT / "public/reader/saba-tape-transcripts/tapes"


def sha(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


def die(msg: str) -> NoReturn:
    raise SystemExit(f"MERGE REFUSED: {msg}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("staging", type=Path)
    ap.add_argument("review", type=Path)
    args = ap.parse_args()
    staged = json.loads(args.staging.read_text(encoding="utf-8"))
    review = json.loads(args.review.read_text(encoding="utf-8"))
    seg_id = str(staged.get("id") or "")
    match = re.fullmatch(r"(\d+)-([ab])-(\d{3})", seg_id)
    if not match:
        die(f"invalid segment id {seg_id!r}")
    if review.get("id") != seg_id:
        die("review id does not match staging id")
    if staged.get("sourceSha256") != review.get("sourceSha256"):
        die("review and staging source hashes differ")
    he = staged.get("he", "")
    if not he or sha(he) != staged.get("sourceSha256"):
        die("staging Hebrew is empty or its hash is invalid")
    verdict = review.get("verdict")
    if verdict not in {"approved", "corrected"}:
        die("review verdict must be approved or corrected")
    checks = review.get("checks") or {}
    required = ("complete", "noSkipping", "noTruncation", "noSummarization", "uncertaintiesPreserved", "repetitionsPreserved")
    if any(checks.get(k) is not True for k in required):
        die(f"review did not affirm all required checks: {required}")
    en = (review.get("correctedEn") if verdict == "corrected" else staged.get("en")) or ""
    en = en.strip()
    if not en:
        die("approved English is empty")
    ratio = len(en) / len(he)
    if not 0.25 <= ratio <= 6.0:
        die(f"suspicious English/Hebrew character ratio {ratio:.2f}")

    tape, side, _ = match.groups()
    target = TAPES / f"tape-{int(tape):03d}-{side}.json"
    data = json.loads(target.read_text(encoding="utf-8"))
    found = False
    for seg in data.get("segments", []):
        if seg.get("id") != seg_id:
            continue
        found = True
        if seg.get("he") != he or sha(seg.get("he", "")) != staged.get("sourceSha256"):
            die("canonical Hebrew changed or differs from reviewed source")
        seg["en"] = en
        seg["translationStatus"] = "verified"
        seg["qa"] = {
            "sourceSha256": staged["sourceSha256"],
            "translatorChecks": staged.get("qa", {}),
            "reviewVerdict": verdict,
            "reviewChecks": checks,
            "reviewNotes": review.get("reviewerNotes", ""),
        }
        break
    if not found:
        die(f"segment {seg_id} not found in {target.name}")
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    subprocess.run([sys.executable, str(ROOT / "scripts/import-sichos-saba-full.py")], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
    subprocess.run([sys.executable, str(ROOT / "scripts/verify-sichos-saba-full.py")], cwd=ROOT, check=True)
    print(f"MERGED_VERIFIED {seg_id} EN_CHARS={len(en)}")

if __name__ == "__main__":
    main()
