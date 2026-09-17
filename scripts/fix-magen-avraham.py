#!/usr/bin/env python3
"""Idempotent, identity-preserving correction; both sourced dates are displayed."""
import json
from pathlib import Path
import sys
ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
FILES = ['tzaddikim-database.json', 'tzaddikim-database-complete.json', 'tzaddikim-database-filtered.json']
NOTE = 'Author of Magen Avraham on Shulchan Aruch, Orach Chaim. (Yahrzeit date disputed: 9 Tishray; other sources give 3 Tishray.)'
for name in FILES:
    p = ROOT / 'public/data' / name
    data = json.loads(p.read_text())
    rows = data['all_tzaddikim']
    matches = [r for r in rows if r.get('name') == 'Magen Avraham (Rabbi Avraham Gombiner)']
    assert len(matches) == 1, (name, len(matches))
    matches[0].update({
        'yahrzeit_hebrew': '9 Tishray (other sources: 3 Tishray)',
        'yahrzeit_month': 'Tishrei', 'yahrzeit_day': '9',
        'yahrzeit_alternate_dates': [{'month': 'Tishrei', 'day': '3'}],
        'year_passed': '5443 / 1682', 'notes': NOTE,
        'source': 'TorahTots: 9 Tishrei, alternative 3; Hamichlol: 3 Tishrei, alternative 9. Both dates displayed by user request.',
        'source_url': 'https://www.torahtots.com/timecapsule/thismonth/tishrei.htm',
        'source_urls': ['https://www.torahtots.com/timecapsule/thismonth/tishrei.htm', 'https://www.hamichlol.org.il/רבי_אברהם_אבלי_הלוי_גומבינר']
    })
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(name, 'one identity; 9 + 3 Tishray; no 5')
