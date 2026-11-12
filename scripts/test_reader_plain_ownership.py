#!/usr/bin/env python3
"""Real bounded plain producer regression; no generated/static book substitutes.

Reads exact tracked inputs, including their source indexes. TMPDIR owns disposable
fixtures. A retained artifact run uses PLAIN_OWNERSHIP_OUTPUT (must not exist).
"""
from __future__ import annotations
import contextlib
import copy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('ownership_producer', ROOT / 'scripts/build-reader-plain-text.py')
assert SPEC is not None and SPEC.loader is not None
P = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(P)
PRIMARY = ('tanach-malachi', 'tanach-bereishit', 'tanach-chaggai', 'tanach-ovadya')
COMMENTARY = ('tanach-malachi', 'tanach-bereishit', 'tanach-chagai', 'tanach-ovadia', 'tanach-shmuel')
CONTROLS = ('likutay-nanach/volume-1/chapter-1.json', 'likutay-nanach/volume-4/chapter-16.json', 'likutay-moharan/part-1/torah-1.json')


def input_paths():
    paths = {'catalog.json', 'likutay-nanach/tanach/index.json'}
    for book in PRIMARY:
        paths.update(p.relative_to(ROOT / 'public/reader').as_posix() for p in (ROOT / 'public/reader' / book).rglob('*.json'))
    index = json.loads((ROOT / 'public/reader/likutay-nanach/tanach/index.json').read_bytes())
    for book in COMMENTARY:
        paths.update(row['file'].removeprefix('/reader/') for row in index['books'][book])
    paths.update(CONTROLS)
    # Real seed witnesses, not synthetic replacement teachings or a disabled
    # navigation writer. This permits the entire unchanged main caller to run.
    for alias in P._navigation.load_legacy_paths():
        part, section = alias.split('/')[-2:]
        paths.add(f'likutay-nanach/volume-{part}/chapter-251-{section}.json' if section.startswith('topic-') else f'likutay-moharan/part-{part}/torah-{section}.json')
    return sorted(paths)


def copy_inputs(reader):
    for relative in input_paths():
        target = reader / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / 'public/reader' / relative, target)


def run_producer(reader, out):
    # Only path roots are rebound; all producer helpers and all 117 navigation
    # seeds run unchanged, with genuine exact source files in the private root.
    with patch.object(P, 'ROOT', reader.parent), patch.object(P, 'READER_DIR', reader), patch.object(P, 'OUT_DIR', out):
        P.main()
    return json.loads((out / 'index.json').read_bytes())


class OwnershipTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='plain-ownership-', dir=os.environ.get('TMPDIR'))
        self.addCleanup(self.temp.cleanup)
        self.reader = Path(self.temp.name) / 'reader'
        self.out = Path(self.temp.name) / 'reader-plain'
        copy_inputs(self.reader)

    def test_real_main_complete_primary_commentary_and_controls(self):
        before = {p: p.read_bytes() for p in self.reader.rglob('*.json')}
        catalog = run_producer(self.reader, self.out)
        rows = catalog['entries']
        self.assertEqual(catalog['total'], len(rows))
        self.assertEqual(len({r['url'] for r in rows}), len(rows), 'one catalog row per physical owner; never overwrite')
        for alias in P._navigation.load_legacy_paths():
            text = (self.out / alias.removeprefix('/reader-plain/') / 'index.html').read_text()
            self.assertIn('noindex,follow', text)
        malachi = [r for r in rows if r['bookId'] == 'tanach-malachi']
        self.assertEqual([(r['part'], r['torah']) for r in malachi], [('1', str(n)) for n in range(1, 4)])
        full = (self.out / 'tanach-malachi/full.txt').read_text()
        expected_bodies = []
        for n, count in [(1, 14), (2, 17), (3, 24)]:
            source = json.loads((self.reader / f'tanach-malachi/part-1/torah-{n}.json').read_bytes())
            target = self.out / f'tanach-malachi/1/{n}'
            raw = json.loads((target / 'index.json').read_bytes())
            self.assertEqual(raw['title'], source['title'])
            self.assertEqual(raw['hebrewTitle'], source['hebrewTitle'])
            self.assertEqual(raw['segments'], P.collect_segments(source))
            self.assertEqual(len(raw['segments']), count)
            self.assertEqual(full.count(f'\n# {source["title"]}\n'), 1)
            body = (target / 'index.txt').read_text()
            self.assertEqual(full.count(body), 1)
            expected_bodies.append(body)
            html = (target / 'index.html').read_text()
            self.assertIn(f'<h1>{source["title"]}</h1>', html)
            self.assertTrue(all(s['he'] in body for s in raw['segments']))
        self.assertNotIn('Likutay Nanach', full)
        self.assertEqual(full.count('Segment '), 55)
        lnindex = json.loads((self.reader / 'likutay-nanach/tanach/index.json').read_bytes())
        for subject in COMMENTARY:
            for member in lnindex['books'][subject]:
                source_path = self.reader / member['file'].removeprefix('/reader/')
                source = json.loads(source_path.read_bytes())
                target = self.out / 'likutay-nanach/tanach' / source_path.stem
                raw = json.loads((target / 'index.json').read_bytes())
                self.assertEqual((raw['bookId'], raw['part'], raw['torah']), ('likutay-nanach', 'tanach', source_path.stem))
                self.assertEqual(raw['segments'], P.collect_segments(source, include_verse=True))
                # Independent full-field oracle: the old first_text fallback
                # silently lost verse text in segments with commentary_he.
                import html
                for original, exported in zip(source['segments'], raw['segments'], strict=True):
                    verse = P.strip_html(original.get('verse'))
                    commentary = P.strip_html(original.get('commentary_he'))
                    expected = '\n\n'.join(s for s in (verse, commentary) if s)
                    self.assertEqual(exported['he'], expected)
                    for name in ('index.txt', 'index.md'):
                        self.assertIn(expected, (target / name).read_text())
                    self.assertIn(html.escape(expected), (target / 'index.html').read_text())
                    if subject == 'tanach-malachi':
                        self.assertNotIn(expected, full, 'no commentary body in primary aggregate')
                self.assertEqual(raw['title'], source['title'])
                self.assertIsNone(raw['sourceUrl'], 'unproven human commentary route stays held')
                self.assertEqual(sum(r['url'] == raw['plainUrl'] for r in rows), 1)
                self.assertIn((target / 'index.txt').read_text(), (self.out / 'likutay-nanach/full.txt').read_text())
                self.assertNotIn('Human reader page', (target / 'index.html').read_text())
        # Disjoint non-Tanach exports are byte-identical to genuine pinned base.
        import subprocess, types
        old = types.ModuleType('old'); old.__file__ = str(ROOT / 'scripts/build-reader-plain-text.py')
        exec(compile(subprocess.check_output(['git','show','6a25210908f78164e4b570a9a80db46d49fd1d69:scripts/build-reader-plain-text.py'], cwd=ROOT), old.__file__, 'exec'), old.__dict__)
        for relative in CONTROLS:
            path = self.reader / relative
            data = json.loads(path.read_bytes())
            with patch.object(old, 'READER_DIR', self.reader), patch.object(old, 'OUT_DIR', Path(self.temp.name) / 'baseline'):
                ids = old.infer_ids(path, data)
                entry = old.write_teaching(path, data, *ids)
                for name in ('index.txt','index.md','index.json','index.html'):
                    suffix = entry['url'].removeprefix('/reader-plain/')
                    self.assertEqual((old.OUT_DIR / suffix / name).read_bytes(), (self.out / suffix / name).read_bytes())
        self.assertEqual({p: p.read_bytes() for p in self.reader.rglob('*.json')}, before)
        retained = os.environ.get('PLAIN_OWNERSHIP_OUTPUT')
        if retained:
            shutil.copytree(self.out, retained)
            pins = [{'path':str(p.relative_to(self.reader)), 'bytes':len(b), 'sha256':hashlib.sha256(b).hexdigest()} for p,b in before.items()]
            Path(retained).with_suffix('.inputs.json').write_text(json.dumps(pins, indent=2)+'\n')

    def test_all_primary_complete_exports_follow_physical_chapter_order(self):
        import re
        source_reader = ROOT / 'public/reader'
        bindings = P._ownership.preflight(source_reader, P.collect_segments)
        primary = {owner[0] for owner in bindings.values() if owner[0] != 'likutay-nanach'}
        self.assertEqual(len(primary), 39)
        self.assertEqual(sum(owner[0] in primary for owner in bindings.values()), 929)
        # Complete genuine source/index memberships, including all commentary;
        # retain the existing nonprimary controls and real navigation witnesses.
        paths = set(bindings)
        paths.update(f'{book}/part-{part}/index.json' for book, part, _ in bindings.values() if book in primary)
        for relative in paths:
            target = self.reader / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source_reader / relative, target)
        before = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in self.reader.rglob('*.json')}
        catalog = run_producer(self.reader, self.out)
        self.assertEqual(catalog['entries'], sorted(catalog['entries'], key=lambda r: (r['bookId'], str(r['part']), str(r['torah']))))
        books = json.loads((self.reader / 'catalog.json').read_bytes())['books']
        chapter_counts = {}
        for book in sorted(primary):
            with self.subTest(book=book):
                declared = next(b for b in books if b['id'] == book)
                rows = []
                for part in sorted(declared['parts'], key=lambda p: int(p['part'])):
                    index = json.loads((self.reader / part['indexUrl'].removeprefix('/reader/')).read_bytes())
                    for item in index['items']:
                        ids = (book, str(part['part']), str(item['number']))
                        self.assertIn(ids, bindings.values())
                        row = next(r for r in catalog['entries'] if (r['bookId'], r['part'], r['torah']) == ids)
                        rows.append(row)
                        source = json.loads((self.reader / f'{book}/part-{ids[1]}/torah-{ids[2]}.json').read_bytes())
                        exported = json.loads((self.out / row['url'].removeprefix('/reader-plain/') / 'index.json').read_bytes())
                        self.assertEqual(exported['segments'], P.collect_segments(source))
                        self.assertEqual(len(exported['segments']), len(source['segments']))
                chapter_counts[book] = len(rows)
                txt = [f'{book} — complete plain text', f'Source index: https://ajew.org/reader/{book}/', '', 'Sections:']
                md = [f'# {book} — complete plain text', f'\nSource index: https://ajew.org/reader/{book}/\n', '## Sections']
                txt += [f"- {r['title']} — https://ajew.org{r['url']}index.txt" for r in rows]
                md += [f"- [{r['title']}]({r['url']}) — [TXT]({r['url']}index.txt)" for r in rows]
                txt.append('\n\n====================\n')
                md.append('\n---\n')
                for r in rows:
                    section = self.out / r['url'].removeprefix('/reader-plain/')
                    txt += [f"\n\n# {r['title']}", f"URL: https://ajew.org{r['url']}\n", (section / 'index.txt').read_bytes().decode()]
                    md += [f"\n\n# {r['title']}", f"\nURL: https://ajew.org{r['url']}\n", (section / 'index.md').read_bytes().decode()]
                for name, chunks in [('full.txt', txt), ('full.md', md)]:
                    expected = ('\n'.join(chunks).strip() + '\n').encode()
                    self.assertTrue((self.out / book / name).read_bytes() == expected, f'{book}/{name}: exact numeric TOC and complete section chunks')
                directory = (self.out / book / 'index.html').read_text()
                self.assertEqual(re.findall(r'<li><a href="([^"]+)">', directory), [r['url'] for r in rows])
        self.assertEqual(chapter_counts['tanach-koheles'], 12)
        self.assertEqual(chapter_counts['tanach-tehillim'], 150)
        self.assertEqual(sum(chapter_counts.values()), 929)
        self.assertEqual(hashlib.sha256((self.out / 'tanach-malachi/full.txt').read_bytes()).hexdigest(), 'b388508af396360c1b4387aeb6de8413cbbd96383ad907333ba37997c06a36cb')
        self.assertEqual({p: hashlib.sha256(p.read_bytes()).hexdigest() for p in self.reader.rglob('*.json')}, before)

    def test_malformed_missing_ambiguous_sources_fail_closed(self):
        mutations = {
            'missing primary': lambda r: (r / 'tanach-malachi/part-1/torah-2.json').unlink(),
            'malformed primary': lambda r: (r / 'tanach-malachi/part-1/torah-2.json').write_text('{broken'),
            'missing commentary': lambda r: (r / 'likutay-nanach/tanach/tanach-malachi-2.json').unlink(),
            'malformed commentary': lambda r: (r / 'likutay-nanach/tanach/tanach-malachi-2.json').write_text('{broken'),
            'empty primary': lambda r: self.edit(r / 'tanach-malachi/part-1/torah-2.json', lambda d: d.update(segments=[])),
            'wrong commentary subject': lambda r: self.edit(r / 'likutay-nanach/tanach/tanach-malachi-2.json', lambda d: d.update(book='tanach-bereishit')),
            'duplicate commentary membership': lambda r: self.edit(r / 'likutay-nanach/tanach/index.json', lambda d: d['books']['tanach-malachi'].append(copy.deepcopy(d['books']['tanach-malachi'][0]))),
            'missing catalog member': lambda r: self.edit(r / 'likutay-nanach/tanach/index.json', lambda d: d['books']['tanach-malachi'].pop()),
            'duplicate primary membership': lambda r: self.edit(r / 'tanach-malachi/part-1/index.json', lambda d: d['items'].append(copy.deepcopy(d['items'][0]))),
            'wrong header': lambda r: self.edit(r / 'tanach-malachi/part-1/torah-2.json', lambda d: d.update(title='Likutay Nanach')),
            'unsafe identity': lambda r: self.edit(r / 'tanach-malachi/part-1/torah-2.json', lambda d: d.update(bookId='../outside')),
            'duplicate primary book': lambda r: self.edit(r / 'catalog.json', lambda d: d['books'].append(copy.deepcopy(next(b for b in d['books'] if b['id'] == 'tanach-malachi')))),
            'missing primary index': lambda r: (r / 'tanach-malachi/part-1/index.json').unlink(),
            'missing commentary index': lambda r: (r / 'likutay-nanach/tanach/index.json').unlink(),
            'stale commentary count': lambda r: self.edit(r / 'likutay-nanach/tanach/index.json', lambda d: d['books']['tanach-malachi'][0].update(segments=999)),
            'wrong commentary chapter': lambda r: self.edit(r / 'likutay-nanach/tanach/tanach-malachi-2.json', lambda d: d.update(chapter='3')),
            'malformed primary shape': lambda r: (r / 'tanach-malachi/part-1/torah-2.json').write_text('[]'),
            'undeclared commentary': lambda r: shutil.copyfile(r / 'likutay-nanach/tanach/tanach-malachi-2.json', r / 'likutay-nanach/tanach/tanach-malachi-02.json'),
        }
        for name, mutate in mutations.items():
            with self.subTest(name=name):
                private = Path(self.temp.name) / name
                reader, out = private / 'reader', private / 'out'
                copy_inputs(reader)
                out.mkdir(parents=True)
                (out / 'sentinel').write_bytes(b'unchanged previous output')
                mutate(reader)
                with self.assertRaises((ValueError, FileNotFoundError, json.JSONDecodeError)):
                    run_producer(reader, out)
                self.assertEqual((out / 'sentinel').read_bytes(), b'unchanged previous output', 'preflight must fail before destructive output reset')
                self.assertEqual(list(out.iterdir()), [out / 'sentinel'])

    def test_catalog_and_overwrite_guards_reject_foreign_or_repeated_owner(self):
        with patch.object(P, 'READER_DIR', self.reader), patch.object(P, 'OUT_DIR', self.out):
            bindings = P._ownership.preflight(self.reader, P.collect_segments)
            path = self.reader / 'tanach-malachi/part-1/torah-1.json'
            owners = {}
            P.register_output_owner(path, 'tanach-malachi', '1', '1', owners)
            with self.assertRaises(ValueError):
                P.register_output_owner(self.reader / 'foreign/section-1.json', 'tanach-malachi', '1', '1', owners)
            data = json.loads(path.read_bytes())
            entry = P.write_teaching(path, data, 'tanach-malachi', '1', '1')
            source = path.relative_to(self.reader).as_posix()
            for rows, provenance in [([entry, entry], {id(entry):source}), ([entry], {}), ([dict(entry, bookId='foreign')], {})]:
                with self.assertRaises(ValueError):
                    P._ownership.validate_entries(rows, provenance, bindings)

    def test_symlink_selected_source_fails_before_output_reset(self):
        target = self.reader / 'tanach-malachi/part-1/torah-2.json'
        original = target.read_bytes()
        witness = Path(self.temp.name) / 'outside.json'; witness.write_bytes(original)
        target.unlink(); target.symlink_to(witness)
        with self.assertRaises(ValueError):
            run_producer(self.reader, self.out)
        self.assertFalse(self.out.exists())
        self.assertEqual(witness.read_bytes(), original)

    def assert_rejected_without_writes(self, reader, out, witnesses):
        out.mkdir(parents=True, exist_ok=True)
        sentinel = b'unchanged previous output'
        (out / 'sentinel').write_bytes(sentinel)
        before = {p: p.read_bytes() for p in witnesses}
        with self.assertRaises(ValueError):
            run_producer(reader, out)
        self.assertEqual(list(out.iterdir()), [out / 'sentinel'])
        self.assertEqual((out / 'sentinel').read_bytes(), sentinel)
        self.assertEqual({p: p.read_bytes() for p in witnesses}, before)

    def test_nonemitting_selected_segments_fail_before_output_reset(self):
        # Keep all eighteen older malformed/missing/ambiguous controls intact.
        # Every selected physical row must survive the actual projection, not
        # merely pass a dict/list shape or source-index cardinality check.
        blanks = {
            'blank dict': {},
            'blank text': {k: ' \n\t ' for k in (*P.HE_KEYS, *P.EN_KEYS)},
            'markup only': {k: '<p> &nbsp; </p>' for k in (*P.HE_KEYS, *P.EN_KEYS)},
            'nondict': None,
        }
        for namespace, relative in [
            ('primary', 'tanach-malachi/part-1/torah-2.json'),
            ('commentary', 'likutay-nanach/tanach/tanach-malachi-2.json'),
        ]:
            for shape, replacement in blanks.items():
                with self.subTest(namespace=namespace, shape=shape):
                    private = Path(self.temp.name) / (namespace + '-' + shape)
                    reader, out = private / 'reader', private / 'out'
                    copy_inputs(reader)
                    self.edit(reader / relative, lambda d: d['segments'].__setitem__(0, replacement))
                    self.assert_rejected_without_writes(reader, out, list(reader.rglob('*.json')))

    def test_selected_directory_ancestor_and_file_links_fail_before_output_reset(self):
        # Include links rglob would never descend, not just discovered JSON files.
        selected = (
            'tanach-malachi', 'tanach-malachi/part-1',
            'tanach-malachi/part-1/torah-2.json',
            'tanach-malachi/part-1/index.json', 'catalog.json',
            'likutay-nanach', 'likutay-nanach/tanach',
            'likutay-nanach/tanach/tanach-malachi-2.json',
            'likutay-nanach/tanach/index.json', 'reader', 'ancestor',
        )
        for number, relative in enumerate(selected):
            with self.subTest(link=relative):
                private = Path(self.temp.name) / f'link-{number}'
                reader, out = private / 'input/reader', private / 'out'
                copy_inputs(reader)
                target = reader if relative == 'reader' else reader.parent if relative == 'ancestor' else reader / relative
                outside = private / 'outside'
                target.rename(outside)
                target.symlink_to(outside, target_is_directory=outside.is_dir())
                witnesses = list(outside.rglob('*.json')) if outside.is_dir() else [outside]
                # Snapshot the rest too; symlink traversal is deliberately not
                # our witness enumerator for the relocated physical originals.
                witnesses += list(reader.rglob('*.json'))
                self.assert_rejected_without_writes(reader, out, witnesses)

    def test_projection_field_selection_and_bounded_absence_remain_valid(self):
        # First populated accepted fallback wins, except commentary prepends
        # a distinct verse. An English-only row also emits a real segment.
        for namespace, relative in [
            ('primary', 'tanach-malachi/part-1/torah-2.json'),
            ('commentary', 'likutay-nanach/tanach/tanach-malachi-2.json'),
        ]:
            for key in (*P.HE_KEYS, *P.EN_KEYS):
                with self.subTest(namespace=namespace, field=key):
                    reader = Path(self.temp.name) / f'fields-{namespace}-{key}/reader'
                    copy_inputs(reader)
                    self.edit(reader / relative, lambda d: d['segments'].__setitem__(0, {key: '<b>real text</b>'}))
                    # New guard must use the producer's actual selection mode.
                    with patch.object(P, 'READER_DIR', reader):
                        bindings = P._ownership.preflight(reader, P.collect_segments)
                    self.assertIn(relative, bindings)
        empty = Path(self.temp.name) / 'bounded/reader'
        empty.mkdir(parents=True)
        # A global index does not select absent commentary subjects or books.
        for relative in ('catalog.json', 'likutay-nanach/tanach/index.json'):
            target = empty / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / 'public/reader' / relative, target)
        self.assertEqual(P._ownership.preflight(empty, P.collect_segments), {})
        unrelated = empty / 'unselected'
        unrelated.symlink_to(Path(self.temp.name) / 'absent', target_is_directory=True)
        self.assertEqual(P._ownership.preflight(empty, P.collect_segments), {})

    @staticmethod
    def edit(path, fn):
        data = json.loads(path.read_bytes()); fn(data); path.write_text(json.dumps(data))


if __name__ == '__main__':
    unittest.main(verbosity=2)
