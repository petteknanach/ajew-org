#!/usr/bin/env python3
"""Yahrzeit data corrections, 2026-09-18 user decisions.

1. Hillel the Elder: no public source establishes a yahrzeit day (MyTzadik:
   "לא ידוע"; zadikim.net: "טרם אומת"; @Yahrtzeits on X never tweeted him).
   The unsourced "8 Tishrei" hand-entry is removed so he never displays.
2. King Solomon: keep the identity but state the sourced Temple timeline —
   the work was completed on 7 Tishrei (the last day) and the dedication
   festivities opened on 8 Tishrei for seven days (Divrei HaYamim II 7:8-9;
   Melachim I 7:51). Idempotent; updates all three tzaddikim databases.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ['tzaddikim-database.json', 'tzaddikim-database-complete.json', 'tzaddikim-database-filtered.json']

HILLEL = 'Hillel the Elder'
SOLOMON = 'King Solomon'
DATE_KEYS = ['yahrzeit_hebrew', 'yahrzeit_month', 'yahrzeit_day', 'is_adar_ii', 'year_passed']
SOLOMON_NOTES = ("Built the First Temple. The work was completed on 7 Tishrei — the last day of "
                 "building — and the dedication festivities opened on 8 Tishrei, running seven days "
                 "(Divrei HaYamim II 7:8-9; Melachim I 7:51). No established yahrzeit date exists.")
SOLOMON_SOURCE = "Divrei HaYamim II 7:8-9; Melachim I 7:51"
HILLEL_NOTES = ("Nasi of the Sanhedrin, founder of the House of Hillel. No established yahrzeit "
                "date exists (MyTzadik: unknown; zadikim.net: unverified).")


def apply(rows):
    touched = {'hillel': 0, 'solomon': 0}
    for row in rows:
        if row.get('name') == HILLEL:
            for key in DATE_KEYS:
                row.pop(key, None)
            row['notes'] = HILLEL_NOTES
            row['source_urls'] = ["https://www.mytzadik.com/tzadik.aspx?id=130",
                                  "https://www.zadikim.net/tzadikim/hillel-hazaken"]
            touched['hillel'] += 1
        elif row.get('name') == SOLOMON:
            row['notes'] = SOLOMON_NOTES
            row['source'] = SOLOMON_SOURCE
            touched['solomon'] += 1
    return touched


def main():
    for filename in FILES:
        path = ROOT / 'public/data' / filename
        data = json.loads(path.read_text())
        rows = data['all_tzaddikim']
        counts = apply(rows)
        if counts['hillel'] != 1:
            raise SystemExit(f"{filename}: expected exactly 1 Hillel the Elder record")
        if counts['solomon'] != 1:
            raise SystemExit(f"{filename}: expected exactly 1 King Solomon record")
        before = json.dumps(rows, ensure_ascii=False, sort_keys=True)
        apply(rows)
        after = json.dumps(rows, ensure_ascii=False, sort_keys=True)
        assert before == after, f"{filename}: not idempotent"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
        print(f"{filename}: Hillel yahrzeit removed, Solomon completion note set; idempotence passed")


if __name__ == '__main__':
    main()
