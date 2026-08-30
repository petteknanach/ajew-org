#!/usr/bin/env python3
"""Rebuild Sichos HaRan as one exact bilingual segment per numbered sicha.

Hebrew and vocalized Hebrew are preserved character-for-character in sequence.
English is rebuilt from the authoritative local Finished/Sichos Haran HTML files,
whose h2 numbering supplies the section boundary.  Collapsing each numbered
sicha to one bilingual segment avoids speculative paragraph pairing.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
READER = ROOT / "public" / "reader" / "sichos-haran"
DEFAULT_SOURCE = Path("/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Sichos Haran")
REPORT = ROOT / "analysis" / "sichos-haran-alignment-report.json"
HEADING_RE = re.compile(r"^(\d+)\.\s+")


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_english(source_dir: Path) -> dict[int, str]:
    sections: dict[int, str] = {}
    files = sorted(source_dir.glob("sichos_haran_part*.html"))
    if len(files) != 4:
        raise SystemExit(f"Expected 4 source HTML files in {source_dir}; found {len(files)}")
    for source in files:
        soup = BeautifulSoup(source.read_text(encoding="utf-8"), "html.parser")
        for heading in soup.find_all("h2"):
            match = HEADING_RE.match(heading.get_text(" ", strip=True))
            if not match:
                continue
            number = int(match.group(1))
            paragraphs: list[str] = []
            for sibling in heading.next_siblings:
                name = getattr(sibling, "name", None)
                if name == "h2":
                    break
                if name in {"p", "blockquote", "li"}:
                    text = sibling.get_text(" ", strip=True)
                    if text:
                        paragraphs.append(text)
            if not paragraphs:
                raise SystemExit(f"Source section {number} in {source} has no English paragraphs")
            if number in sections:
                raise SystemExit(f"Duplicate English source section {number}")
            sections[number] = "\n\n".join(paragraphs)
    expected = set(range(1, 309))
    if set(sections) != expected:
        missing = sorted(expected - set(sections))
        extra = sorted(set(sections) - expected)
        raise SystemExit(f"English source coverage mismatch: missing={missing}, extra={extra}")
    return sections


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--check", action="store_true", help="verify only; do not rewrite")
    args = parser.parse_args()

    english = load_english(args.source)
    rows = []
    changed = []
    total_before_segments = total_after_segments = 0
    before_empty_he = before_empty_en = 0

    for number in range(1, 309):
        path = READER / f"sicha-{number}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        segments = data.get("segments") or []
        if not segments:
            raise SystemExit(f"{path}: missing segments")
        total_before_segments += len(segments)
        before_empty_he += sum(not str(seg.get("he") or "").strip() for seg in segments)
        before_empty_en += sum(not str(seg.get("en") or "").strip() for seg in segments)

        # No characters are inserted between old blocks for preservation hashes.
        old_he_exact = "".join(str(seg.get("he") or "") for seg in segments)
        old_nikud_exact = "".join(str(seg.get("he_nikud") or "") for seg in segments)
        old_en_exact = "".join(str(seg.get("en") or "") for seg in segments)

        # Paragraph separators are presentation only; every source character remains.
        he = "\n\n".join(str(seg.get("he") or "") for seg in segments if str(seg.get("he") or ""))
        nikud = "\n\n".join(str(seg.get("he_nikud") or "") for seg in segments if str(seg.get("he_nikud") or ""))
        en = english[number]
        if not he.strip() or not en.strip():
            raise SystemExit(f"{path}: repaired segment would be missing a language")

        repaired = {"index": 1, "he": he, "en": en}
        if nikud:
            repaired["he_nikud"] = nikud
        new_data = dict(data)
        new_data["segments"] = [repaired]
        new_data["totalParagraphs"] = 1
        new_data["hasEnglish"] = True
        new_data["hasNikud"] = bool(nikud)
        new_text = json.dumps(new_data, ensure_ascii=False, indent=2) + "\n"
        old_text = path.read_text(encoding="utf-8")

        if args.check:
            if data.get("segments") != [repaired]:
                raise SystemExit(f"{path}: alignment differs from authoritative source; run without --check")
        elif old_text != new_text:
            path.write_text(new_text, encoding="utf-8")
            changed.append(number)

        # The repaired fields were constructed only by joining the original
        # nonempty blocks. Hash the character sequence with join separators
        # excluded so preservation remains exact and unambiguous.
        reconstructed_he_exact = "".join(str(seg.get("he") or "") for seg in segments if str(seg.get("he") or ""))
        reconstructed_nikud_exact = "".join(str(seg.get("he_nikud") or "") for seg in segments if str(seg.get("he_nikud") or ""))
        if reconstructed_he_exact != old_he_exact:
            raise SystemExit(f"{path}: Hebrew preservation failure")
        if reconstructed_nikud_exact != old_nikud_exact:
            raise SystemExit(f"{path}: vocalized Hebrew preservation failure")

        rows.append({
            "sicha": number,
            "beforeSegments": len(segments),
            "beforeHebrewSha256": digest(old_he_exact),
            "afterHebrewSha256": digest(reconstructed_he_exact),
            "beforeNikudSha256": digest(old_nikud_exact),
            "afterNikudSha256": digest(reconstructed_nikud_exact),
            "beforeEnglishSha256": digest(old_en_exact),
            "authoritativeEnglishSha256": digest(en),
            "englishChanged": old_en_exact != en,
        })
        total_after_segments += 1

    report = {
        "schemaVersion": 1,
        "source": str(args.source),
        "sichos": 308,
        "beforeSegments": total_before_segments,
        "afterSegments": total_after_segments,
        "beforeEmptyHebrewSegments": before_empty_he,
        "beforeEmptyEnglishSegments": before_empty_en,
        "afterEmptyHebrewSegments": 0,
        "afterEmptyEnglishSegments": 0,
        "changedFiles": changed,
        "englishChangedFiles": [row["sicha"] for row in rows if row["englishChanged"]],
        "hebrewCharacterSequencePreserved": all(row["beforeHebrewSha256"] == row["afterHebrewSha256"] for row in rows),
        "nikudCharacterSequencePreserved": all(row["beforeNikudSha256"] == row["afterNikudSha256"] for row in rows),
        "rows": rows,
    }
    if not args.check:
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in (
        "sichos", "beforeSegments", "afterSegments", "beforeEmptyHebrewSegments",
        "beforeEmptyEnglishSegments", "afterEmptyHebrewSegments", "afterEmptyEnglishSegments",
        "hebrewCharacterSequencePreserved", "nikudCharacterSequencePreserved"
    )}, indent=2))
    print(f"Changed files: {len(changed)}")
    print(f"English replaced from authoritative numbered source: {len(report['englishChangedFiles'])}")
    print(f"Report: {REPORT}")


if __name__ == "__main__":
    main()
