#!/usr/bin/env python3
"""Apply owner-approved, day-resolved Cheshvon records without changing other identities."""
import argparse
import copy
import json
import re
from pathlib import Path

FILES = ('tzaddikim-database.json', 'tzaddikim-database-complete.json', 'tzaddikim-database-filtered.json')
EXCLUDED_NAMES = {'Rabbi Binyamin Zeev Cheshin', "R' Binyamin Ze'ev Cheshin", 'Rabbi Yitzchak of Volozhin', 'Rabbi Yitzchak of Volozhin, son of Rabbi Chaim'}
EXCLUDED_HEBREW = {'בנימיןזאבחשין', 'יצחקמוולוזין', 'יצחקבןחייםמוולוזין'}


def hebrew_identity(value):
    value = re.sub(r'^(?:הרב|רבי|רב|ר[\'׳])\s*', '', value or '')
    return re.sub(r'[\s\"\'׳״’\u0591-\u05c7]', '', value)


def excluded(row):
    return row.get('name') in EXCLUDED_NAMES or hebrew_identity(row.get('hebrew_name')) in EXCLUDED_HEBREW


def matches(row, entry):
    record = entry['record']
    return (row.get('cheshvon_review_id') == entry['id']
            or row.get('name') in set(entry.get('aliases', [])) | {record['name']}
            or hebrew_identity(row.get('hebrew_name')) == hebrew_identity(record['hebrew_name']))


def validate(entries):
    assert len(entries) == 22 and len({e['id'] for e in entries}) == 22
    for entry in entries:
        record = entry['record']
        assert entry['approved'] is True
        assert record['name'] and record['hebrew_name'] and record['source_urls']
        assert record['yahrzeit_month'] == 'Cheshvan'
        assert 1 <= int(record['yahrzeit_day']) <= 30
        assert record['date_status'] in ('traditional', 'verified_month_day')
        assert not excluded(record)
    indexed = {e['id']: e['record'] for e in entries}
    assert indexed['cheshvon-028']['description'] == 'hosted and fully participated the breslov kibutz of rosh hashana.'
    assert indexed['cheshvon-067']['description'] == 'He accepted upon himself suffering to atone for having once spoken disparagingly about Rabbi Nachman.'
    assert indexed['cheshvon-070']['yahrzeit_day'] == '9'
    assert indexed['cheshvon-148']['yahrzeit_day'] == '30'


def apply(data, entries):
    result = copy.deepcopy(data)
    original = data['all_tzaddikim']
    untouched = [r for r in original if not excluded(r) and not any(matches(r, e) for e in entries)]
    rows = [r for r in result['all_tzaddikim'] if not excluded(r)]
    for entry in entries:
        indices = [i for i, row in enumerate(rows) if matches(row, entry)]
        if len(indices) > 1 and not entry.get('merge_verified_aliases'):
            raise ValueError(f"Unreviewed duplicates for {entry['id']}")
        record = copy.deepcopy(rows[indices[0]]) if indices else {}
        # Unsupported legacy alternate dates must not survive an authenticated replacement.
        record.pop('yahrzeit_alternate_dates', None)
        record.update(entry['record'])
        record['cheshvon_review_id'] = entry['id']
        if indices:
            rows[indices[0]] = record
            for i in reversed(indices[1:]):
                del rows[i]
        else:
            rows.append(record)
    assert [r for r in rows if not any(matches(r, e) for e in entries)] == untouched, 'Foreign row/order changed'
    for entry in entries:
        selected = [r for r in rows if matches(r, entry)]
        assert len(selected) == 1 and selected[0]['cheshvon_review_id'] == entry['id']
        assert all(selected[0][key] == value for key, value in entry['record'].items())
    assert not any(excluded(r) for r in rows)
    result['all_tzaddikim'] = rows
    result.setdefault('metadata', {})['total_count'] = len(rows)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--manifest', type=Path, default=Path(__file__).with_name('approved-cheshvon-records.json'))
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    entries = json.loads(args.manifest.read_text())
    validate(entries)
    for filename in FILES:
        path = args.root / 'public' / 'data' / filename
        before = json.loads(path.read_text())
        after = apply(before, entries)
        assert apply(after, entries) == after, 'Import is not idempotent'
        if args.check:
            assert before == after, f'{filename}: import not applied'
        else:
            path.write_text(json.dumps(after, ensure_ascii=False, indent=2) + '\n')
        print(f'{filename}: 22 unique approved identities; unrelated rows conserved; idempotence PASS')


if __name__ == '__main__':
    main()
