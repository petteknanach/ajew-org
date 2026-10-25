#!/usr/bin/env python3
"""Remove only the unsupported legacy 15-Cheshvan Jacob duplicate.

User correction: 2026-10-25. Each database already has a separately sourced
Yaakov Avinu identity; preserve it byte-for-byte as a decoded row. No replacement
date is researched or assigned here. The removed row remains in Git history.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = (
    'tzaddikim-database.json',
    'tzaddikim-database-complete.json',
    'tzaddikim-database-filtered.json',
)


def unsupported(row):
    return (
        row.get('name') == 'Jacob'
        and row.get('hebrew_name') == 'יעקב'
        and row.get('category') == 'biblical'
        and row.get('source') == 'editable'
        and row.get('yahrzeit_month') == 'Cheshvan'
        and str(row.get('yahrzeit_day')) == '15'
        and row.get('notes') == 'Third Patriarch'
        and not row.get('source_url')
        and not row.get('source_urls')
    )


def corrected(data):
    rows = data['all_tzaddikim']
    assert sum(unsupported(row) for row in rows) <= 1, 'Unexpected legacy duplicates'
    canonical = [row for row in rows if row.get('name') == 'Yaakov Avinu'
                 and row.get('hebrew_name') == 'יעקב אבינו']
    assert len(canonical) == 1 and canonical[0].get('source_urls'), 'Sourced identity missing'
    result = json.loads(json.dumps(data, ensure_ascii=False))
    result['all_tzaddikim'] = [row for row in result['all_tzaddikim'] if not unsupported(row)]
    result['metadata']['total_count'] = len(result['all_tzaddikim'])
    return result


def main():
    # Validate every file and idempotence before the first write.
    pending = []
    for filename in FILES:
        path = ROOT / 'public' / 'data' / filename
        before = json.loads(path.read_text(encoding='utf-8'))
        after = corrected(before)
        assert corrected(after) == after, 'Not idempotent'
        pending.append((path, before, after))
    for path, before, after in pending:
        if before != after:
            path.write_text(json.dumps(after, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'{path.name}: removed {len(before["all_tzaddikim"]) - len(after["all_tzaddikim"])} unsupported row(s)')


if __name__ == '__main__':
    main()
