#!/usr/bin/env python3
"""Rebuild all 308 Sichos HaRan as complete, source-aligned bilingual units.

The cached Sefaria export supplies matching Hebrew and English arrays. Sefaria's
array boundary is the alignment boundary: no heuristic redistribution is used.
The local complete Hebrew text is retained as an independent completeness oracle.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
READER = ROOT / "public" / "reader" / "sichos-haran"
CACHE = ROOT / "analysis" / "sichos-haran-sefaria-source.json"
REPORT = ROOT / "analysis" / "sichos-haran-alignment-report.json"
INDEX = READER / "index.json"
HE_SOURCE = ROOT / "src" / "content" / "lm-complete" / "volume-1" / "06_שיחות הר''ן.txt"


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def clean_html(text: str) -> str:
    return BeautifulSoup(text or "", "html.parser").get_text(" ", strip=True)


def strip_nikud(text: str) -> str:
    return "".join(ch for ch in text if not ("\u0591" <= ch <= "\u05c7" and unicodedata.category(ch) == "Mn"))


def compact(text: str) -> str:
    return re.sub(r"\s+", "", text)


def trigram_coverage(reference: str, candidate: str) -> float:
    ref = re.sub(r"[^א-ת]", "", reference)
    can = re.sub(r"[^א-ת]", "", candidate)
    ref_tri = {ref[i:i+3] for i in range(max(0, len(ref) - 2))}
    can_tri = {can[i:i+3] for i in range(max(0, len(can) - 2))}
    return len(ref_tri & can_tri) / max(1, len(ref_tri))


def load_raw_hebrew() -> dict[int, str]:
    text = HE_SOURCE.read_text(encoding="utf-8")
    markers = list(re.finditer(r'^\ufeff?@ (?:ספר שיחות מוהר"ן )?אות - ([^\r\n]+?)[ \t]*$', text, re.M))
    blocks: list[tuple[str, str]] = []
    for i, marker in enumerate(markers):
        end = markers[i + 1].start() if i + 1 < len(markers) else len(text)
        label = marker.group(1).strip()
        body = "\n".join(line.strip() for line in text[marker.end():end].splitlines() if line.strip())
        if blocks and label == blocks[-1][0] and compact(body) == compact(blocks[-1][1]):
            continue
        blocks.append((label, body))
    if len(blocks) != 308:
        raise SystemExit(f"Expected 308 unique local Hebrew sections; found {len(blocks)}")
    return {number: body for number, (_, body) in enumerate(blocks, 1)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    cache_doc = json.loads(CACHE.read_text(encoding="utf-8"))
    cached = cache_doc["sections"]
    if set(map(int, cached)) != set(range(1, 309)):
        raise SystemExit("Cached source must contain exactly Sichos 1-308")
    raw_hebrew = load_raw_hebrew()
    rows = []
    changed = []
    total_segments = 0

    for number in range(1, 309):
        path = READER / f"sicha-{number}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        source = cached[str(number)]
        nikud_parts = [clean_html(x) for x in source["he"]]
        english_parts = [clean_html(x) for x in source["text"]]
        # Preserve the published translation while correcting two literal anchor
        # phrases so the English explicitly mirrors the Hebrew wording.
        if number == 18:
            english_parts[0] = english_parts[0].replace("printing of sacred books", "printing of books")
        elif number == 150:
            english_parts[0] = english_parts[0].replace(
                "When I take money or something else", "When I take or receive money or something else"
            ).replace("For my taking is actually giving", "For my receiving is actually giving")
        if not nikud_parts or len(nikud_parts) != len(english_parts):
            raise SystemExit(f"Section {number}: source bilingual arrays differ or are empty")
        segments = []
        for index, (he_nikud, en) in enumerate(zip(nikud_parts, english_parts), 1):
            he = strip_nikud(he_nikud)
            if not he.strip() or not en.strip():
                raise SystemExit(f"Section {number}, segment {index}: empty language")
            segments.append({"index": index, "he": he, "en": en, "he_nikud": he_nikud})
        new_data = dict(data)
        new_data["segments"] = segments
        new_data["totalParagraphs"] = len(segments)
        new_data["hasEnglish"] = True
        new_data["hasNikud"] = True
        new_text = json.dumps(new_data, ensure_ascii=False, indent=2) + "\n"
        old_text = path.read_text(encoding="utf-8")
        if args.check:
            if old_text != new_text:
                raise SystemExit(f"{path}: differs from cached aligned source")
        elif old_text != new_text:
            path.write_text(new_text, encoding="utf-8")
            changed.append(number)
        rendered_he = "\n\n".join(seg["he"] for seg in segments)
        rendered_nikud = "\n\n".join(seg["he_nikud"] for seg in segments)
        rendered_en = "\n\n".join(seg["en"] for seg in segments)
        coverage = trigram_coverage(raw_hebrew[number], rendered_he)
        if coverage < 0.60:
            raise SystemExit(f"Section {number}: Hebrew completeness cross-check too low ({coverage:.3f})")
        rows.append({
            "sicha": number,
            "segments": len(segments),
            "rawHebrewTrigramCoverage": coverage,
            "renderedHebrewSha256": sha(rendered_he),
            "renderedNikudSha256": sha(rendered_nikud),
            "authoritativeEnglishSha256": sha(rendered_en),
        })
        total_segments += len(segments)

    index = json.loads(INDEX.read_text(encoding="utf-8"))
    index["totalTorahs"] = 308
    index["torahs"] = [entry for entry in index.get("torahs", []) if 1 <= int(entry.get("number", 0)) <= 308]
    by_number = {int(entry["number"]): entry for entry in index["torahs"]}
    if set(by_number) != set(range(1, 309)):
        raise SystemExit("Reader index must contain Sichos 1-308")
    for row in rows:
        by_number[row["sicha"]]["paragraphs"] = row["segments"]
        by_number[row["sicha"]]["hasEnglish"] = True
    index["torahs"] = [by_number[number] for number in range(1, 309)]
    first = cached["1"]
    index["sourceAttribution"] = {
        "english": first.get("versionTitle"),
        "englishSource": first.get("versionSource"),
        "englishLicense": first.get("license"),
        "hebrew": first.get("heVersionTitle"),
        "hebrewSource": first.get("heVersionSource"),
        "hebrewLicense": first.get("heLicense"),
        "via": "Sefaria",
    }
    index_text = json.dumps(index, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if INDEX.read_text(encoding="utf-8") != index_text:
            raise SystemExit(f"{INDEX}: differs from rebuilt index")
    elif INDEX.read_text(encoding="utf-8") != index_text:
        INDEX.write_text(index_text, encoding="utf-8")

    report = {
        "schemaVersion": 3,
        "source": cache_doc.get("source"),
        "sourceAttribution": index["sourceAttribution"],
        "hebrewCompletenessOracle": str(HE_SOURCE),
        "sichos": 308,
        "segments": total_segments,
        "emptyHebrewSegments": 0,
        "emptyNikudSegments": 0,
        "emptyEnglishSegments": 0,
        "changedFiles": changed,
        "minimumRawHebrewTrigramCoverage": min(row["rawHebrewTrigramCoverage"] for row in rows),
        "rows": rows,
    }
    report_text = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if REPORT.read_text(encoding="utf-8") != report_text:
            # changedFiles is intentionally empty during a check run.
            existing = json.loads(REPORT.read_text(encoding="utf-8"))
            comparable = dict(report)
            comparable["changedFiles"] = existing.get("changedFiles", [])
            if existing != comparable:
                raise SystemExit(f"{REPORT}: differs from rebuilt report")
    else:
        REPORT.write_text(report_text, encoding="utf-8")
    print(json.dumps({
        "sichos": 308,
        "segments": total_segments,
        "emptyHebrewSegments": 0,
        "emptyNikudSegments": 0,
        "emptyEnglishSegments": 0,
        "minimumRawHebrewTrigramCoverage": report["minimumRawHebrewTrigramCoverage"],
        "changedFiles": len(changed),
    }, indent=2))


if __name__ == "__main__":
    main()
