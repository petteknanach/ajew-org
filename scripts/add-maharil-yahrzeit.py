#!/usr/bin/env python3
"""Idempotently add the Maharil's verified yahrzeit to all public databases."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ROOT / "public/data/tzaddikim-database-complete.json",
    ROOT / "public/data/tzaddikim-database.json",
    ROOT / "public/data/tzaddikim-database-filtered.json",
]

RECORD = {
    "name": "Rabbi Yaakov ben Moshe Levi Moelin (Maharil)",
    "hebrew_name": "רבי יעקב בן משה הלוי מולין (מהרי״ל)",
    "yahrzeit_hebrew": "22 Elul",
    "yahrzeit_month": "Elul",
    "yahrzeit_day": "22",
    "is_adar_ii": False,
    "year_passed": "1427",
    "notes": "Leading Ashkenazic posek and source of Minhagei Ashkenaz; his rulings and customs strongly influenced later Ashkenazic practice.",
    "category": "rishonim",
    "source": "Chabad.org biography; corroborated by Chinuch.org (22 Elul, citing Yated 2006)",
    "source_url": "https://www.chabad.org/library/article_cdo/aid/112354/jewish/Rabbi-Jacob-Halevi-Moelin-Maharil.htm",
}


def norm(value):
    return re.sub(r"[\s\"'׳״()\-–—.,]+", "", value or "").lower()


ALIASES = {
    norm(RECORD["name"]),
    norm(RECORD["hebrew_name"]),
    norm("Rabbi Jacob Halevi Moelin (Maharil)"),
    norm("Rav Yaakov HaLevi ben Moshe Moellin, the Maharil"),
    norm("רבי יעקב בן משה מולין"),
    norm("רבי יעקב בן משה הלוי סגל מולין"),
}

summary = {}
for path in FILES:
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = data.setdefault("all_tzaddikim", [])
    matches = [
        i for i, row in enumerate(rows)
        if norm(row.get("name")) in ALIASES or norm(row.get("hebrew_name")) in ALIASES
    ]
    if matches:
        rows[matches[0]] = RECORD.copy()
        for i in reversed(matches[1:]):
            rows.pop(i)
        action = "updated"
    else:
        rows.append(RECORD.copy())
        action = "added"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary[path.name] = {"action": action, "matches_removed": max(0, len(matches) - 1), "total": len(rows)}

print(json.dumps(summary, ensure_ascii=False, indent=2))
