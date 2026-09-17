#!/usr/bin/env python3
"""Import explicitly approved, source-verified Tishray entries idempotently."""
import argparse
import json
from pathlib import Path

FILES = ['tzaddikim-database.json', 'tzaddikim-database-complete.json', 'tzaddikim-database-filtered.json']

def apply(data, entries):
    rows = data['all_tzaddikim']
    for entry in entries:
        aliases = set(entry.get('aliases', [])) | {entry['record']['name']}
        matches = [i for i, row in enumerate(rows) if row.get('name') in aliases or row.get('tishray_review_id') == entry['id']]
        if len(matches) > 1 and not entry.get('merge_verified_aliases'):
            raise ValueError(f"Unreviewed duplicate identities: {entry['id']}")
        record = dict(rows[matches[0]]) if matches else {}
        record.update(entry['record'])
        record['tishray_review_id'] = entry['id']
        if matches:
            rows[matches[0]] = record
            for i in reversed(matches[1:]):
                del rows[i]
        else:
            rows.append(record)
    return data

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    p.add_argument('--manifest', type=Path, default=Path(__file__).with_name('approved-tishray-records.json'))
    p.add_argument('--check', action='store_true')
    args = p.parse_args()
    entries = json.loads(args.manifest.read_text())
    assert len({e['id'] for e in entries}) == len(entries)
    for e in entries:
        r = e['record']
        assert e['approved'] and e['date_status'] in ('verified', 'traditional', 'disputed_documented')
        assert r['source_urls'] and r['hebrew_name'] and r['name']
        assert r['yahrzeit_month'] == 'Tishrei' and 1 <= int(r['yahrzeit_day']) <= 30
    for filename in FILES:
        path = args.root / 'public/data' / filename
        before = json.loads(path.read_text())
        after = apply(json.loads(json.dumps(before)), entries)
        assert apply(json.loads(json.dumps(after)), entries) == after, 'Not idempotent'
        for e in entries:
            assert sum(r.get('tishray_review_id') == e['id'] for r in after['all_tzaddikim']) == 1
        if args.check:
            assert after == before, f'{filename}: import not applied'
        else:
            path.write_text(json.dumps(after, ensure_ascii=False, indent=2) + '\n')
        print(f'{filename}: {len(entries)} unique approved identities; idempotence passed')

if __name__ == '__main__':
    main()
