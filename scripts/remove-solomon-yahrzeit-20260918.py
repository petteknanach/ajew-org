#!/usr/bin/env python3
"""Remove the unsourced King Solomon yahrzeit (2026-09-18 user decision).

The "7 Tishrei / 797 BCE / source: editable" record had no source. Public data
keeps the identity but drops the unverified yahrzeit fields. The First
Temple's dedication festivities opened 8 Tishrei and the box marks that as an
important date in CompactYahrzeit.astro instead. Idempotent; updates all three
tzaddikim databases.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ['tzaddikim-database.json', 'tzaddikim-database-complete.json', 'tzaddikim-database-filtered.json']

NEW_NOTES = ("Built the First Temple. No established yahrzeit date exists. The Temple's "
             "seven days of dedication festivities opened on 8 Tishrei (Divrei HaYamim II 7:8-9); "
             "construction was completed in the month of Bul / MarCheshvan (Melachim I 6:38).")
SOURCE = "Divrei HaYamim II 7:8-9; Melachim I 6:38"
SOURCE_URLS = ["https://mechon-mamre.org/p/pt/pt25b07.htm", "https://mechon-mamre.org/p/pt/pt11a06.htm"]
DROP_KEYS = ['yahrzeit_hebrew', 'yahrzeit_month', 'yahrzeit_day', 'is_adar_ii', 'year_passed']


def apply(rows):
    changed = 0
    for row in rows:
        if row.get('name') != 'King Solomon':
            continue
        for key in DROP_KEYS:
            row.pop(key, None)
        row['notes'] = NEW_NOTES
        row['source'] = SOURCE
        row['source_urls'] = SOURCE_URLS
        changed += 1
    return changed


def main():
    for filename in FILES:
        path = ROOT / 'public/data' / filename
        data = json.loads(path.read_text())
        rows = data['all_tzaddikim']
        if apply(rows) != 1:
            raise SystemExit(f"{filename}: expected exactly 1 King Solomon record")
        # idempotence: second pass must change nothing
        before = json.dumps(rows, ensure_ascii=False, sort_keys=True)
        apply(rows)
        after = json.dumps(rows, ensure_ascii=False, sort_keys=True)
        assert before == after, f"{filename}: not idempotent"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
        print(f"{filename}: King Solomon yahrzeit removed; idempotence passed")


if __name__ == '__main__':
    main()
