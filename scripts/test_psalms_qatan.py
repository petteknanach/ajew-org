#!/usr/bin/env python3
"""Offline ledger/rejection/corpus tests; run before and after candidate writes."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import unittest
from psalms_qatan_overlay import (apply_book, canonical, digest, load_ledger,
                                 repair_verse, unique_object)
from psalms_annotation_overlay import apply_book as combined_book, load_ledger as combined_ledger
ANNOTATIONS = combined_ledger()

ROOT = Path(__file__).resolve().parents[1]
LEDGER = load_ledger()
BASE = ('3fcb1bc5edbd515a080eeb95d3d1e075480ccee1' if (ROOT / 'app.json').exists()
        else '56f18b2bbe52a77ad0927de17b421d41abe8de4e')


def baseline(path):
    return subprocess.check_output(['git', 'show', f'{BASE}:{path}'], cwd=ROOT)


def row(e, after=False):
    return dict(copy.deepcopy(e['source_fields']),
                m=copy.deepcopy(e['after_m'] if after else e['before_m']))


def call(e, value, **kwargs):
    return repair_verse('Psalms', e['chapter'], e['verse'], value, **kwargs)


class QatanTests(unittest.TestCase):
    def test_29_approved_deltas_and_inverse(self):
        self.assertEqual(len(LEDGER['entries']), 29)
        self.assertEqual(sum(e['paired_before'][2:] == ['uncertain', 1]
                             for e in LEDGER['entries']), 24)
        for e in LEDGER['entries']:
            with self.subTest(ref=e['ref']):
                before = row(e)
                saved = copy.deepcopy(before)
                after = call(e, before)
                self.assertEqual(before, saved)
                self.assertEqual(after, row(e, True))
                self.assertEqual(call(e, after), after)
                self.assertEqual(call(e, after, reverse=True), before)
                self.assertEqual(call(e, before, reverse=True), before)
                expected = copy.deepcopy(e['before_m'])
                i = e['paired_mark_index']
                expected[i] = e['paired_after']
                expected.insert(i + 1, e['qk'])
                self.assertEqual(expected, e['after_m'])
                self.assertEqual(digest(before), e['before_verse_sha256'])
                self.assertEqual(digest(after), e['after_verse_sha256'])

    def test_source_vowel_qere_position_and_metadata_rejects(self):
        for e in LEDGER['entries']:
            mutations = {}
            def add(name, fn):
                x = row(e); fn(x); mutations[name] = x
            ti = e['token_index']
            add('source-tail', lambda x: x['t'].__setitem__(-1, x['t'][-1] + ' '))
            add('wrong-vowel', lambda x: x['t'].__setitem__(ti, x['t'][ti].replace('\u05b8', '\u05b7', 1)))
            add('qere', lambda x: x['k'].__setitem__(ti, 1))
            add('wrong-mark-position', lambda x: x['m'][e['paired_mark_index']].__setitem__(1, 99))
            add('duplicate-mark', lambda x: x['m'].append(copy.deepcopy(e['paired_before'])))
            if e['paired_before'][2:] == ['uncertain', 1]:
                add('partial-qk-only', lambda x: x['m'].append(e['qk']))
            add('unrelated-mark', lambda x: x['m'].append([0, 0, 'na', 0]))
            add('boundary-drift', lambda x: x.__setitem__('b', [[0, 'p']]))
            for name, bad in mutations.items():
                with self.subTest(ref=e['ref'], mutation=name):
                    snapshot = copy.deepcopy(bad)
                    with self.assertRaises(ValueError): call(e, bad)
                    self.assertEqual(bad, snapshot)

    def test_wrong_reference_and_held_scope(self):
        for e in LEDGER['entries']:
            x = row(e)
            self.assertEqual(repair_verse('Genesis', e['chapter'], e['verse'], x), x)
            self.assertEqual(repair_verse('Psalms', 999, e['verse'], x), x)
        a, b = LEDGER['entries'][:2]
        with self.assertRaises(ValueError): call(b, row(a))
        for c, v in [(21, 2), (94, 1), (3, 5), (2, 12), (4, 2)]:
            x = {'t': ['unapproved'], 'm': [[0, 0, 'uncertain', 1]]}
            self.assertEqual(repair_verse('Psalms', c, v, x), x)

    def test_ledger_fixture_hash_witness_and_duplicate_rejects(self):
        mutations = {
            'source-hash': lambda l: l['entries'][0].__setitem__('source_sha256', '0' * 64),
            'fixture-id': lambda l: l['entries'][0].__setitem__('fixture_id', 'qwalk_001'),
            'fixture-hash': lambda l: l['entries'][0].__setitem__('fixture_record_sha256', '0' * 64),
            'wrong-reference': lambda l: l['entries'][0].__setitem__('verse', 7),
            'wrong-position': lambda l: l['entries'][0].__setitem__('letter_index', 1),
            'wrong-vowel-offset': lambda l: l['entries'][0].__setitem__('qamats_codepoint_offset', 0),
            'duplicate': lambda l: l['entries'].append(l['entries'][0]),
            'witness-hash': lambda l: l['entries'][0]['witness'].__setitem__('mam_verse_sha256', '0' * 64),
        }
        for name, mutate in mutations.items():
            with self.subTest(mutation=name):
                bad = copy.deepcopy(LEDGER); mutate(bad)
                with self.assertRaises(ValueError): call(LEDGER['entries'][0], row(LEDGER['entries'][0]), ledger=bad)
        with self.assertRaises(ValueError):
            json.loads('{"1":{},"1":{}}', object_pairs_hook=unique_object)

    def test_witness_and_fixture_bindings(self):
        for e in LEDGER['entries']:
            f = LEDGER['fixtures'][e['fixture_id']]
            self.assertEqual(digest(f['record']), f['record_sha256'])
            self.assertEqual(f['record_sha256'], e['fixture_record_sha256'])
            self.assertEqual(f['record']['qgold'][str(e['letter_index'])], 'katan')
            self.assertEqual(f['record']['shevagold'][str(e['letter_index'] + 1)], 'nach')
            self.assertEqual(hashlib.sha256(e['witness']['mam_html'].encode()).hexdigest(),
                             e['witness']['mam_verse_sha256'])
            self.assertIn('\u05c7', e['witness']['mam_word'])
            self.assertEqual(e['provenance']['scope'], 'form-scoped, all occurrences')

    def test_book_atomicity_and_missing_reference(self):
        ch = {}
        for e in LEDGER['entries']:
            ch.setdefault(str(e['chapter']), {})[str(e['verse'])] = row(e)
        book = {'book': 'Psalms', 'slug': 'tanach-tehillim', 'ch': ch}
        before = copy.deepcopy(book)
        self.assertEqual(apply_book(apply_book(book), reverse=True), before)
        last = LEDGER['entries'][-1]
        del book['ch'][str(last['chapter'])][str(last['verse'])]
        snapshot = copy.deepcopy(book)
        with self.assertRaises(ValueError): apply_book(book)
        self.assertEqual(book, snapshot)
        for key in ['book', 'slug']:
            bad = copy.deepcopy(before); bad[key] = 'Genesis'
            with self.assertRaises(ValueError): apply_book(bad)

    def test_committed_corpus_exact_delta_and_byte_inverse(self):
        """Fails on the old qk-less assets; covers all 150 chapters, not a sample."""
        if (ROOT / 'app.json').exists():
            corpus = {}
            for c in range(1, 151):
                rel = f'assets/data/succos/psalms/{c}.json'
                before_bytes = baseline(rel)
                before = json.loads(before_bytes)
                current = json.loads((ROOT / rel).read_text())
                expected = copy.deepcopy(before)
                # Combined suite gates final bytes. Project exact final states
                # to qatan-only for these historical qatan-specific assertions.
                for e in ANNOTATIONS['entries']:
                    if e['chapter'] == c:
                        row = next(s['medooyuk'] for s in current['segments'] if s['index'] == e['verse'])
                        self.assertEqual(row['m'], e['states']['final']['m'])
                        row['m'] = copy.deepcopy(e['states']['qatan']['m'])
                for s in expected['segments']:
                    s['medooyuk'] = repair_verse('Psalms', c, s['index'], s['medooyuk'])
                self.assertEqual(current, expected, f'whole chapter {c}')
                inverse = copy.deepcopy(current)
                for s in inverse['segments']:
                    s['medooyuk'] = repair_verse('Psalms', c, s['index'], s['medooyuk'], reverse=True)
                self.assertEqual((json.dumps(inverse, ensure_ascii=False, indent=2) + '\n').encode(), before_bytes)
                corpus[str(c)] = {str(s['index']): s['medooyuk'] for s in current['segments']}
            manifest = json.loads((ROOT / 'assets/data/succos/manifest.json').read_text())
            old_manifest = json.loads(baseline('assets/data/succos/manifest.json'))
            for r in old_manifest['chapters']:
                if r['kind'] == 'psalms':
                    r['sha256'] = hashlib.sha256((ROOT / r['file']).read_bytes()).hexdigest()
            self.assertEqual(manifest, old_manifest)
        else:
            rel = 'public/reader/medooyuk/tanach-tehillim.json'
            before_bytes = baseline(rel)
            before = json.loads(before_bytes)
            current = json.loads((ROOT / rel).read_text())
            current = combined_book(current, target='qatan')
            self.assertEqual(current, apply_book(before))
            self.assertEqual(json.dumps(apply_book(current, reverse=True), ensure_ascii=False,
                                       separators=(',', ':')).encode(), before_bytes)
            corpus = current['ch']
        self.assertEqual(len(corpus), 150)
        self.assertEqual(sum(len(ch) for ch in corpus.values()), 2527)
        marks = [m for ch in corpus.values() for v in ch.values() for m in v['m']]
        self.assertEqual(len(marks), 10459)
        self.assertEqual(sum(m[2] == 'qk' for m in marks), 29)
        self.assertEqual(sum(m[2] == 'na' for m in marks), 5242)
        self.assertEqual(sum(m[2] == 'nach' for m in marks), 4762)
        self.assertEqual(sum(m[2] == 'uncertain' for m in marks), 426)
        self.assertEqual(sum(bool(m[3]) for m in marks), 414)
        self.assertEqual(sum(t.count('\u05c7') for ch in corpus.values() for v in ch.values() for t in v['t']), 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)
