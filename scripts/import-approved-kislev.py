#!/usr/bin/env python3
"""Synchronize the owner's approved Torat Emet cohort, preserving unrelated rows.

Run without --check to apply; --check verifies the already-applied, idempotent
three-feed and text-only CompactYahrzeit importantDates publication.
"""
import argparse
import copy
import json
from pathlib import Path

FILES = ('tzaddikim-database-complete.json', 'tzaddikim-database.json', 'tzaddikim-database-filtered.json')
APPROVED_IDS = {4, 6, 7, 16, 18, 20, 24, 30, 31, 38, 39, 40, 45, 53, 54, 58, 63, 66, 73, 80, 85, 90, 91, 95, 99, 108, 115, 117, 118, 124, 126, 127, 131, 136, 137, 140, 144}
EXCLUDED_IDS = {43, 44, 119}
START = '    // BEGIN OWNER-APPROVED TORAT EMET KISLEV\n'
END = '    // END OWNER-APPROVED TORAT EMET KISLEV\n'


def validate(entries):
    ids = [e['id'] for e in entries]
    assert len(ids) == len(set(ids)), 'Duplicate review IDs'
    assert set(ids) <= APPROVED_IDS and not (set(ids) & EXCLUDED_IDS)
    assert entries, 'Empty import'
    for e in entries:
        r = e['record']
        assert e['approved'] is True and not e.get('hold', False)
        assert e['date_status'] in ('verified', 'traditional', 'disputed_documented')
        assert e['source_text'] and e['source_document']
        assert r['source_urls'] and r['name'] and r['hebrew_name']
        assert any('\u05d0' <= c <= '\u05ea' for c in r['hebrew_name'])
        assert r['yahrzeit_month'] in ('Kislev', 'Iyyar', 'Sivan', 'Tishrei', 'Tevet', 'Tamuz', 'Av', 'Elul', 'Cheshvan', 'Nissan', "Sh'vat", 'Adar', 'Adar II')
        assert type(r['yahrzeit_day']) is int and 1 <= r['yahrzeit_day'] <= 30
        assert r['kislev_review_id'] == 'torat-emet-kislev-' + str(e['id'])


def matched_indices(rows, entry):
    r = entry['record']
    names = set(entry.get('aliases', [])) | {r['name']}
    hebrew = set(entry.get('hebrew_aliases', [])) | {r['hebrew_name']}
    return [i for i, old in enumerate(rows)
            if old.get('kislev_review_id') == r['kislev_review_id']
            or old.get('name') in names or old.get('hebrew_name') in hebrew]


def apply(data, entries, held_entries=()):
    result = copy.deepcopy(data)
    rows = result['all_tzaddikim']
    for e in entries:
        matches = matched_indices(rows, e)
        if len(matches) > 1:
            raise ValueError(f'Unreviewed duplicate identities for {e["id"]}: {matches}')
        if matches:
            i = matches[0]
            before = rows[i]
            record = copy.deepcopy(before)
            record.update(copy.deepcopy(e['record']))
            aliases = list(before.get('aliases', []))
            for name in (before.get('name'), before.get('hebrew_name')):
                if name and name not in (record['name'], record['hebrew_name']) and name not in aliases:
                    aliases.append(name)
            if aliases:
                record['aliases'] = aliases
            rows[i] = record
        else:
            rows.append(copy.deepcopy(e['record']))
    for e in held_entries:
        matches = matched_indices(rows, e)
        assert len(matches) <= 1, f'Duplicate held identity: {e["id"]}'
        for i in matches:
            rows[i].update(yahrzeit_hebrew='', yahrzeit_month='', yahrzeit_day='',
                           yahrzeit_alternate_dates=[], year_passed='',
                           notes=e['notes'], date_status=e['date_status'],
                           source_urls=e['source_urls'], kislev_date_hold_id=e['record']['kislev_review_id'])
    if isinstance(result.get('metadata'), dict) and 'total_count' in result['metadata']:
        result['metadata']['total_count'] = len(rows)
    return result


def component_after(source, entries):
    assert source.count(START) == source.count(END) and source.count(START) <= 1
    objects = []
    for e in entries:
        r = e['record']
        objects.append({'month': r['yahrzeit_month'], 'day': r['yahrzeit_day'], 'type': 'yahrzeit',
                        'name': r['name'], 'hebrew_name': r['hebrew_name'],
                        'description': r['notes'], 'priority': 3,
                        'kislev_review_id': r['kislev_review_id']})
        if e.get('observed_hillula'):
            event = e['observed_hillula']
            assert event['type'] in ('birth', 'special')
            objects.append({'month': event['month'], 'day': event['day'], 'type': event['type'],
                            'name': event['label_en'], 'hebrew_name': event['label_he'],
                            'description': event['description'], 'priority': 3,
                            'kislev_review_id': r['kislev_review_id'] + '-observance'})
    block = START + ''.join('    ' + json.dumps(obj, ensure_ascii=False) + ',\n' for obj in objects) + END
    if START in source:
        begin = source.index(START)
        end = source.index(END, begin) + len(END)
        return source[:begin] + block + source[end:]
    needle = '  const importantDates = [\n'
    assert source.count(needle) == 1
    return source.replace(needle, needle + block, 1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--manifest', type=Path, default=Path(__file__).with_name('approved-kislev-records.json'))
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding='utf-8'))
    entries = manifest['entries']
    held_entries = manifest.get('held_existing', [])
    validate(entries)
    assert {e['id'] for e in entries} | set(manifest.get('held_ids', [])) == APPROVED_IDS, 'Cohort coverage mismatch'
    assert {e['id'] for e in held_entries} == set(manifest['held_ids'])
    outputs = []
    for filename in FILES:
        path = args.root / 'public/data' / filename
        before = json.loads(path.read_text(encoding='utf-8'))
        after = apply(before, entries, held_entries)
        assert apply(after, entries, held_entries) == after, 'Import is not idempotent'
        for e in entries:
            assert len(matched_indices(after['all_tzaddikim'], e)) == 1
            actual = after['all_tzaddikim'][matched_indices(after['all_tzaddikim'], e)[0]]
            assert all(actual[k] == v for k, v in e['record'].items())
        # Existing ordinals must not shift: the Today-in-Breslov builder binds them.
        assert len(after['all_tzaddikim']) >= len(before['all_tzaddikim'])
        changed_indices = {i for e in entries + held_entries for i in matched_indices(before['all_tzaddikim'], e)}
        for e in held_entries:
            for i in matched_indices(after['all_tzaddikim'], e):
                assert not after['all_tzaddikim'][i].get('yahrzeit_month')
                assert not after['all_tzaddikim'][i].get('yahrzeit_day')
        for i, row in enumerate(before['all_tzaddikim']):
            if i not in changed_indices:
                assert after['all_tzaddikim'][i] == row, f'Unrelated row changed: {filename}:{i}'
        expected_metadata = copy.deepcopy(before.get('metadata'))
        if isinstance(expected_metadata, dict) and 'total_count' in expected_metadata:
            expected_metadata['total_count'] = len(after['all_tzaddikim'])
        assert after.get('metadata') == expected_metadata
        if args.check:
            assert after == before, f'{filename}: import has not been applied'
        outputs.append((path, json.dumps(after, ensure_ascii=False, indent=2) + '\n'))
        print(f'{filename}: {len(entries)} exact unique identities, unchanged unrelated ordinals; idempotence passed')
    component = args.root / 'src/components/CompactYahrzeit.astro'
    source = component.read_text(encoding='utf-8')
    updated = component_after(source, entries)
    assert component_after(updated, entries) == updated
    if args.check:
        assert updated == source, 'CompactYahrzeit: approved importantDates not synchronized'
    else:
        for path, content in outputs:
            path.write_text(content, encoding='utf-8')
        component.write_text(updated, encoding='utf-8')
    print(f'CompactYahrzeit: {len(entries)} text-only approved yahrzeits synchronized')


if __name__ == '__main__':
    main()
