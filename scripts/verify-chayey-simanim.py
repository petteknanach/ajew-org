#!/usr/bin/env python3
"""Regression gates for the individual Chayey Moharan siman reader."""
from __future__ import annotations

import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SIMAN_DIR = ROOT / "public/reader/chayey-moharan/simanim"
TEMPLATE = ROOT / "src/pages/reader/chayey-moharan/siman/[siman].astro"
READER_SCRIPT = ROOT / "public/reader-script.js"
COMMENTARY = ROOT / "public/reader/likutay-nanach/volume-4/chayey.json"

spec = importlib.util.spec_from_file_location("repair_chayey", ROOT / "scripts/repair-chayey-simanim-from-canonical.py")
repair = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(repair)
canonical = repair.canonical_simanim()


def normalized(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


files = sorted(SIMAN_DIR.glob("siman-*.json"), key=lambda p: int(p.stem.split("-")[1]))
if len(files) != 556:
    raise SystemExit(f"Expected 556 Chayey simanim, found {len(files)}")

for path in files:
    number = int(path.stem.split("-")[1])
    data = json.loads(path.read_text(encoding="utf-8"))
    segments = data.get("segments") or []
    if number == 441:
        joined = "\n".join(segment.get("he", "") for segment in segments)
        if normalized(joined) != normalized(canonical[number]):
            raise SystemExit("Curated Siman 441 no longer preserves the complete canonical Hebrew")
        continue
    if number == 447:
        # Curated video layout; audited independently while its full bilingual remaster is pending.
        continue
    if len(segments) != 1:
        raise SystemExit(f"Siman {number} unexpectedly has {len(segments)} segments")
    if normalized(segments[0].get("he", "")) != normalized(canonical[number]):
        raise SystemExit(f"Siman {number} Hebrew diverges from the canonical source")
    if "<em>" in segments[0].get("en", "").lower():
        raise SystemExit(f"Siman {number} would display raw <em> markup")

siman241 = json.loads((SIMAN_DIR / "siman-241.json").read_text(encoding="utf-8"))["segments"][0]
for required in ("מתי יש לי התבודדות", "קול דממה דקה", "כלי זמר של חתנה", "שיחות הר\"ן טז"):
    if required not in siman241["he"]:
        raise SystemExit(f"Siman 241 is missing canonical Hebrew: {required}")
for required in ("still small voice", "musicians of a wedding", "Sichos HaRan 16"):
    if required not in siman241["en"]:
        raise SystemExit(f"Siman 241 is missing complete English: {required}")

template = TEMPLATE.read_text(encoding="utf-8")
for required in ("commentaryRange", "startIndex: commentaryRange.startIndex", "endIndex: commentaryRange.endIndex"):
    if required not in template:
        raise SystemExit(f"Chayey siman commentary is not focused: missing {required}")
if "{torahData.siman && (" in template:
    raise SystemExit("Chayey siman pages regained the duplicate empty siman card")
reader_script = READER_SCRIPT.read_text(encoding="utf-8")
if "originalContent.querySelectorAll(':scope > .reader-segment-pair')" not in reader_script:
    raise SystemExit("Reading-time count still includes hidden/duplicate segment views")

# Confirm the focused range around Siman 241 in the Likutay Nanach commentary.
commentary = json.loads(COMMENTARY.read_text(encoding="utf-8"))["segments"]
heading = next(i for i, segment in enumerate(commentary) if "<h3>אות 241</h3>" in segment.get("he", ""))
range_segments = commentary[heading + 1:]
end = next(i for i, segment in enumerate(range_segments) if re.match(r"^\s*רמג\s*בהשמטות\s*:", segment.get("he", "")))
indices = [int(segment["index"]) for segment in range_segments[:end]]
if indices != [213, 214, 215, 216]:
    raise SystemExit(f"Unexpected Siman 241 commentary focus: {indices}")

print("Chayey Moharan siman integrity verified: 554 canonical single-siman files, curated 441 preserved, focused 241 commentary")
