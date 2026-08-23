#!/usr/bin/env python3
"""Rebuild Chayey Moharan siman Hebrew from the canonical project text.

The individual siman files previously contained short, shifted Hebrew fragments.
This script treats public/books/MyBooks/1_ספרי רבי נחמן/07_חיי מוהר''ן.txt
as the canonical Hebrew source and preserves each siman's existing English.
"""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/books/MyBooks/1_ספרי רבי נחמן/07_חיי מוהר''ן.txt"
SIMAN_DIR = ROOT / "public/reader/chayey-moharan/simanim"

VALUES = {
    "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9,
    "י": 10, "כ": 20, "ל": 30, "מ": 40, "נ": 50, "ס": 60, "ע": 70, "פ": 80,
    "צ": 90, "ק": 100, "ר": 200, "ש": 300, "ת": 400,
}
MARKER_RE = re.compile(r"(?m)^~\s*([א-ת\"׳״']+)\s*$")
ENGLISH_OVERRIDES = {
    241: (
        '(1.) I heard in his name that he said: "When do I have hisbodidus?" '
        'And he said: "At the hour when the entire world is standing around me and I am sitting among them — '
        'that is when I have hisbodidus. For I can cry out with a still small voice and my voice is heard from one '
        'end of the world to the other." And I also heard from his holy mouth himself that he has a still small voice — '
        'that he can stand among the people and a crowd of people and cry out with a still small voice from one end '
        'of the world to the other, and all the people around him will not hear at all. Likewise regarding dancing, '
        'he said that when he sits among the people he can perform a very wondrous dance. Once I myself heard him say: '
        '"When I sit among people, I am like someone around whom the entire world stands while he dances greatly" — '
        'and in the midst of this, the musicians of a wedding arrived. Later, on one occasion, he spoke with us and '
        'revealed to us a little of this matter as well: that we too can stand among people and cry out with a still '
        'small voice, etc., as explained elsewhere (Sichos HaRan 16).'
    ),
}


def gematria(value: str) -> int:
    return sum(VALUES.get(char, 0) for char in re.sub(r"[^א-ת]", "", value))


def canonical_simanim() -> dict[int, str]:
    text = SOURCE.read_text(encoding="utf-8")
    matches = list(MARKER_RE.finditer(text))
    result: dict[int, str] = {}
    for index, match in enumerate(matches):
        number = gematria(match.group(1))
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[match.end():end].strip()
        if 60 <= number <= 615:
            if number in result:
                raise RuntimeError(f"Duplicate canonical marker for siman {number}")
            result[number] = body

    # Two markers were omitted in the source formatting and occur as bare numeral lines.
    for previous, missing, marker in ((269, 270, "ער"), (303, 304, "דש")):
        body = result[previous]
        parts = re.split(rf"(?m)^\s*{marker}\s*$", body, maxsplit=1)
        if len(parts) != 2:
            raise RuntimeError(f"Could not split embedded siman {missing} from {previous}")
        result[previous], result[missing] = parts[0].strip(), parts[1].strip()

    expected = set(range(60, 616))
    missing = sorted(expected - result.keys())
    extras = sorted(set(result) - expected)
    if missing or extras:
        raise RuntimeError(f"Canonical coverage mismatch: missing={missing}, extras={extras}")
    return result


def plain_english(value: str) -> str:
    # The siman page renders text, not trusted HTML. Preserve every word while removing
    # legacy presentational tags that otherwise appeared literally to readers.
    value = re.sub(r"</?em\s*>", "", value or "", flags=re.I)
    return html.unescape(value)


def main() -> None:
    canonical = canonical_simanim()
    files = sorted(SIMAN_DIR.glob("siman-*.json"), key=lambda p: int(p.stem.split("-")[1]))
    if len(files) != 556:
        raise RuntimeError(f"Expected 556 siman files, found {len(files)}")

    changed = 0
    for path in files:
        number = int(path.stem.split("-")[1])
        data = json.loads(path.read_text(encoding="utf-8"))
        segments = data.get("segments") or []
        if len(segments) != 1:
            # Simanim 441 and 447 have manually reviewed multi-segment media layouts.
            # Do not flatten those curated structures here.
            if number not in {441, 447}:
                raise RuntimeError(f"Unexpected multi-segment siman in {path}: {len(segments)}")
            continue
        segment = segments[0]
        english = ENGLISH_OVERRIDES.get(number, plain_english(segment.get("en", "")))
        segment["he"] = canonical[number]
        segment["he_nikud"] = ""
        segment["en"] = english
        data["aligned_segments"] = [{"index": segment.get("index", 1), "he": canonical[number], "en": english}]
        data["hasEnglish"] = bool(english.strip())
        data["hasNikud"] = False
        rendered = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
        if path.read_text(encoding="utf-8") != rendered:
            path.write_text(rendered, encoding="utf-8")
            changed += 1

    sample = canonical[241]
    required = ["מתי יש לי התבודדות", "קול דממה דקה", "כלי זמר של חתנה", "שיחות הר\"ן טז"]
    if not all(term in sample for term in required):
        raise RuntimeError("Siman 241 canonical text failed its exact-content gate")
    print(f"Rebuilt {changed} Chayey Moharan siman files from {SOURCE}")


if __name__ == "__main__":
    main()
