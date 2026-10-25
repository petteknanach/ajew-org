#!/usr/bin/env python3
"""Publish the explicitly requested Shlomo Carlebach yahrzeit in every feed.

Update the existing base-feed identity in place. Append missing identities to
other feeds: never compact/reorder existing rows or shift index-bound policies.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = ('tzaddikim-database.json', 'tzaddikim-database-complete.json', 'tzaddikim-database-filtered.json')
ALIASES = ('Rav (Reb) Shlomo Carlebach', 'Rabbi Shlomo Carlebach', 'Reb Shlomo Carlebach', 'Shlomo Carlebach')
RECORD = {
    'name': 'Rabbi Shlomo Carlebach',
    'hebrew_name': 'רבי שלמה קרליבך',
    'yahrzeit_hebrew': '16 Cheshvan',
    'yahrzeit_month': 'Cheshvan',
    'yahrzeit_day': '16',
    'is_adar_ii': False,
    'year_passed': '1994',
    'notes': 'Rabbi and composer of Jewish melodies.',
    'category': 'other',
    'source': 'curated',
    'source_urls': ['https://matzav.com/videos-shlomo-carlebach-17-years-since-his-passing'],
    'aliases': list(ALIASES),
}


def matches(row):
    return row.get('name') in ALIASES or row.get('hebrew_name') == RECORD['hebrew_name']


def updated(data):
    result = json.loads(json.dumps(data, ensure_ascii=False))
    rows = result['all_tzaddikim']
    found = [row for row in rows if matches(row)]
    assert len(found) <= 1, 'Namesake/duplicate ambiguity requires review'
    if found:
        assert found[0].get('category') == 'other', 'Unexpected policy/category change'
        found[0].update(RECORD)
    else:
        rows.append(dict(RECORD))
    result['metadata']['total_count'] = len(rows)
    assert len([r for r in rows if matches(r)]) == 1
    return result


def main():
    pending = []
    for filename in FILES:
        path = ROOT / 'public' / 'data' / filename
        before = json.loads(path.read_text(encoding='utf-8'))
        after = updated(before)
        assert updated(after) == after, 'Not idempotent'
        pending.append((path, before, after))
    for path, before, after in pending:
        if before != after:
            path.write_text(json.dumps(after, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'{path.name}: exactly one sourced Shlomo Carlebach, 16 Cheshvan; other ordinals preserved')


if __name__ == '__main__':
    main()
