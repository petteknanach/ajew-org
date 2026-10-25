#!/usr/bin/env python3
"""Clear the unsupported 15-Cheshvan date without shifting registry source rows.

The Today-in-Breslov registry has legacy index-bound exclusions and public source
pointers. Retain Jacob's existing catalog identity, but no unsourced date/year.
The separately sourced Yaakov Avinu entry is unchanged. A predecessor removal
is repaired only at its original, neighbor-checked slot. No new date is assigned.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SLOTS = {
    'tzaddikim-database.json': (359, 'Rav Eliezer ben Yitzchak ibn Archa', 'Rav (Reb) Shlomo Carlebach'),
    'tzaddikim-database-complete.json': (107, 'Rabbi Avraham Chazan', 'Rabban Gamliel the Elder'),
    'tzaddikim-database-filtered.json': (80, 'Rabbi Avraham bar Nachman of Tulchin', 'Mattisyahu ben Yochanan'),
}
FILES = tuple(SLOTS)
DROP_KEYS = ('yahrzeit_hebrew', 'yahrzeit_month', 'yahrzeit_day', 'is_adar_ii', 'year_passed')
IDENTITY = {'name': 'Jacob', 'hebrew_name': 'יעקב', 'notes': 'Third Patriarch', 'category': 'biblical', 'source': 'editable'}


def legacy(row):
    return all(row.get(k) == value for k, value in IDENTITY.items()) and not row.get('source_urls') and not row.get('source_url')


def corrected(data, filename):
    result = json.loads(json.dumps(data, ensure_ascii=False))
    rows = result['all_tzaddikim']
    slot, previous, following = SLOTS[filename]
    matches = [i for i, row in enumerate(rows) if legacy(row)]
    assert len(matches) <= 1, 'Unexpected legacy duplicates'
    if not matches:
        assert rows[slot - 1]['name'] == previous and rows[slot]['name'] == following, 'Original slot/neighbor drift'
        rows.insert(slot, dict(IDENTITY))
    else:
        assert matches == [slot], 'Legacy identity moved: do not rewrite source-pointer positions'
        row = rows[slot]
        if any(key in row for key in DROP_KEYS):
            assert row.get('yahrzeit_month') == 'Cheshvan' and str(row.get('yahrzeit_day')) == '15', 'Unexpected date: requires review'
        for key in DROP_KEYS:
            row.pop(key, None)
    assert rows[slot] == IDENTITY
    canonical = [row for row in rows if row.get('name') == 'Yaakov Avinu' and row.get('hebrew_name') == 'יעקב אבינו']
    assert len(canonical) == 1 and canonical[0].get('source_urls'), 'Sourced identity missing'
    result['metadata']['total_count'] = len(rows)
    return result


def main():
    pending = []
    for filename in FILES:
        path = ROOT / 'public' / 'data' / filename
        before = json.loads(path.read_text(encoding='utf-8'))
        after = corrected(before, filename)
        assert corrected(after, filename) == after, 'Not idempotent'
        pending.append((path, before, after))
    for path, before, after in pending:
        if before != after:
            path.write_text(json.dumps(after, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'{path.name}: unsupported date absent; source-row positions retained')


if __name__ == '__main__':
    main()
