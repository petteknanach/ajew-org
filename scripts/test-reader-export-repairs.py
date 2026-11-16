#!/usr/bin/env python3
"""Standalone exporter regression tests; no package manifest or shared setup.

AJEW_EXPORT_PRODUCER can select the unchanged predecessor for RED evidence.
"""
import contextlib
import copy
import importlib.util
import io
import json
import os
import sys
from typing import Any
from pathlib import Path
import tempfile
import unittest

PRODUCER = Path(os.environ.get('AJEW_EXPORT_PRODUCER', Path(__file__).with_name('build-reader-plain-text.py')))
spec = importlib.util.spec_from_file_location('exporter_under_test', PRODUCER)
assert spec is not None and spec.loader is not None
m: Any = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class ExportRepairs(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='reader-export-repairs-')
        self.addCleanup(self.temp.cleanup)
        self.old = m.ROOT, m.READER_DIR, m.OUT_DIR
        self.addCleanup(self.restore)
        m.ROOT = Path(self.temp.name)
        m.READER_DIR = m.ROOT / 'public/reader'
        m.OUT_DIR = m.ROOT / 'public/reader-plain'
        m.READER_DIR.mkdir(parents=True)

    def restore(self):
        m.ROOT, m.READER_DIR, m.OUT_DIR = self.old

    def source(self, relative, data):
        p = m.READER_DIR / relative
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(data, ensure_ascii=False))
        return p

    def pnc(self):
        return {'book': 'pettek-nanach-commentary', 'part': 1, 'torah': 107,
                'title': 'Existing source title', 'license': 'Existing source license',
                'segments': [{'index': 8, 'relatedSegment': 12, 'ref': 'Existing reference',
                              'notes': ['Existing note'], 'layers': {
                                  'beginner': {'en': 'English beginner', 'he': ''},
                                  'intermediate': {'he': 'עברית ביניים', 'en': 'English intermediate'},
                                  'scholarly': {'he': 'מקור עיוני', 'en': ''}}}]}

    def emit(self, path, data):
        with contextlib.redirect_stderr(io.StringIO()):
            row = m.write_teaching(path, data, *m.infer_ids(path, data))
        self.assertIsNotNone(row, 'Populated physical source must emit')
        folder = m.OUT_DIR / row['url'].removeprefix('/reader-plain/')
        return row, folder, json.loads((folder / 'index.json').read_bytes())

    def test_defect_layered_source_is_not_empty(self):
        d = self.pnc(); p = self.source('pettek-nanach-commentary/torah-107.json', d)
        row, folder, raw = self.emit(p, d)
        self.assertEqual(len(raw['segments']), 1)
        self.assertIn('English beginner', raw['segments'][0]['en'])

    def test_defect_physical_chapters_are_disjoint(self):
        d = {'book': 'likutay-nanach', 'part': 'volume-4', 'torah': 1,
             'title': 'Existing title', 'segments': [{'he': 'מקור', 'en': ''}]}
        a = self.source('likutay-nanach/volume-4/chapter-1.json', d)
        b = self.source('likutay-nanach/volume-4/chapter-174.json', d)
        self.assertNotEqual(m.infer_ids(a, d), m.infer_ids(b, d))
        self.assertEqual(m.infer_ids(b, d), ('likutay-nanach', 'volume-4', '174'))

    def test_defect_preface_is_not_torah_two(self):
        d = {'title': 'Existing preface', 'segments': [{'he': 'מקור'}]}
        p = self.source('likutay-moharan/part-1/preface-section-2.json', d)
        self.assertEqual(m.infer_ids(p, d), ('likutay-moharan', '1', 'preface-section-2'))

    def test_all_layers_references_notes_and_exact_fields(self):
        d = self.pnc(); original = copy.deepcopy(d)
        p = self.source('pettek-nanach-commentary/torah-107.json', d)
        row, folder, raw = self.emit(p, d)
        self.assertEqual(d, original)
        self.assertEqual(raw['sourceMetadata'], {k:v for k,v in d.items() if k != 'segments'})
        self.assertEqual(raw['segments'][0]['sourceSegment'], d['segments'][0])
        self.assertEqual(raw['segments'][0]['sourceIndex'], 8)
        self.assertEqual(raw['segments'][0]['index'], 8)
        for ext in ('txt', 'md', 'html'):
            body = (folder / ('index.' + ext)).read_text()
            self.assertIn('Segment 8', body)
            for text in ('Beginner', 'Intermediate', 'Scholarly', 'English beginner',
                         'English intermediate', 'עברית ביניים', 'מקור עיוני',
                         'Existing reference', 'Existing note'):
                self.assertIn(text, body)
        self.assertNotEqual(raw, d, 'Plain JSON is not original JSON under the wrong schema')
        self.assertEqual(raw['sourceUrl'], '/reader/pettek-nanach-commentary/1/107')

    def test_legacy_strings_and_missing_languages_no_translation(self):
        d = self.pnc()
        d['segments'] = [{'beginner':'Existing English', 'intermediate':'עברית', 'scholarly':'מקור'}]
        p = self.source('pettek-nanach-commentary/tinyana-107.json', d)
        row, folder, raw = self.emit(p, d)
        self.assertEqual(raw['part'], '2')  # physical loader, not stale metadata
        s = raw['segments'][0]
        self.assertEqual(s['en'], 'Existing English')
        self.assertEqual(s['he'], 'עברית\n\nמקור')
        self.assertEqual([b[0] for b in s['blocks']], ['Beginner', 'Intermediate', 'Scholarly'])
        self.assertNotIn('Existing English', s['he'])

    def test_no_text_normalization_or_pointed_hebrew_loss(self):
        d = {'title': 'Existing', 'segments': [{'index': 17, 'he': 'מקור  עברית\r\n',
             'he_nikud': 'מָקוֹר  עִבְרִית\r\n', 'en': 'Existing  English\r\n', 'notes': {'he': 'הערה'}}]}
        p = self.source('likutay-nanach/volume-4/chapter-18.json', d)
        _, folder, raw = self.emit(p, d)
        self.assertEqual(raw['segments'][0]['sourceSegment'], d['segments'][0])
        self.assertEqual(raw['segments'][0]['he'], d['segments'][0]['he_nikud'])
        self.assertIn(d['segments'][0]['he_nikud'].encode(), (folder/'index.txt').read_bytes())

    def test_negative_empty_and_malformed_layers(self):
        for d in ({'title':'Existing', 'segments':[]},
                  {'title':'Existing', 'segments':[{'layers': {'beginner': 7}}]},
                  {'title':'Existing', 'segments':[{'notes':'No teaching body'}]}):
            with self.assertRaises(ValueError):
                m._repairs.project(d, layered=True)

    def test_negative_duplicate_physical_owner(self):
        d = self.pnc(); a = self.source('pettek-nanach-commentary/torah-107.json', d)
        b = self.source('pettek-nanach-commentary/tinyana-107.json', d)
        owners = {}; ids = m.infer_ids(a, d)
        m.register_output_owner(a, *ids, owners)
        with self.assertRaises(ValueError):
            m.register_output_owner(b, *ids, owners)

    def test_negative_missing_catalog_owner(self):
        d=self.pnc();p=self.source('pettek-nanach-commentary/torah-107.json',d)
        bindings=m._repairs.preflight(m.READER_DIR,m.infer_ids)
        with self.assertRaises(ValueError):
            m._repairs.validate_entries([],{},bindings)
        row, _, _=self.emit(p,d)
        with self.assertRaises(ValueError):
            m._repairs.validate_entries([row],{id(row):'foreign.json'},bindings)

    def test_negative_symlink_source(self):
        d = self.pnc(); a = self.source('pettek-nanach-commentary/torah-107.json', d)
        b = a.with_name('torah-108.json'); b.symlink_to(a)
        with self.assertRaises(ValueError):
            m._repairs.preflight(m.READER_DIR, m.infer_ids)

    def test_numeric_order_preserves_literal_subject_namespace(self):
        rows = [{'part':'volume-4','torah':s} for s in ['18','174','1','10','2']]
        self.assertEqual([r['torah'] for r in sorted(rows,key=m._repairs.reading_key)], ['1','2','10','18','174'])
        d={'book':'sefer-hamidos','section':'topic-1','title':'Existing','segments':[{'he':'מקור'}]}
        p=self.source('likutay-nanach/volume-4/chapter-251-topic-1.json',d)
        self.assertEqual(m.infer_ids(p,d),('sefer-hamidos','4','topic-1'))

    def test_source_index_full_book_order_and_negative_ambiguity(self):
        index = {'parts': [{'name':'volume-2', 'path':'/reader/likutay-nanach/volume-2/'},
                           {'name':'volume-4', 'path':'/reader/likutay-nanach/volume-4/'}]}
        self.source('likutay-nanach/index.json',index)
        rows = [{'bookId':'likutay-nanach','part':p,'torah':n}
                for p,n in [('tanach','tanach-shmuel'),('volume-4','10'),('volume-4','2'),('volume-2','1')]]
        self.assertEqual([(r['part'],r['torah']) for r in m._repairs.reading_order(rows,m.READER_DIR)],
                         [('volume-2','1'),('volume-4','2'),('volume-4','10'),('tanach','tanach-shmuel')])
        index['parts'].append(index['parts'][0])
        self.source('likutay-nanach/index.json',index)
        with self.assertRaises(ValueError):
            m._repairs.reading_order(rows,m.READER_DIR)

    def test_negative_missing_indexed_chapter_no_partial_assembly(self):
        d={'title':'Existing chapter','segments':[{'he':'מקור'}]}
        self.source('likutay-nanach/volume-4/chapter-1.json',d)
        self.source('catalog.json',{'books':[{'id':'likutay-nanach','parts':[{
            'part':4,'totalTorahs':2,'indexUrl':'/reader/likutay-nanach/volume-4/index.json'}]}]})
        self.source('likutay-nanach/volume-4/index.json',{'torahs':[
            {'number':1,'title':'Existing chapter'},{'number':2,'title':'Missing chapter'}]})
        with self.assertRaises(FileNotFoundError):
            m._repairs.preflight(m.READER_DIR,m.infer_ids)

    def test_blank_physical_records_stay_in_populated_reader_positions(self):
        d=self.pnc();d['segments'].insert(0,{'layers':{
            key:{'he':'','en':''} for key in ('beginner','intermediate','scholarly')}})
        p=self.source('pettek-nanach-commentary/tinyana-34.json',d)
        _,_,raw=self.emit(p,d)
        self.assertEqual([s['sourceSegment'] for s in raw['segments']],d['segments'])
        self.assertEqual([s['sourcePosition'] for s in raw['segments']],[1,2])
        self.assertEqual(raw['segments'][0]['he'],'')
        self.assertEqual(raw['segments'][0]['en'],'')

    def test_nested_patch_is_not_a_template_member(self):
        p=self.source('pettek-nanach-commentary/private-source/t10_patch.json',{'notes':'Not a teaching'})
        self.assertFalse(m._repairs.selected(p,m.READER_DIR))


if __name__ == '__main__':
    if '--defects-only' in sys.argv:
        names = [name for name in unittest.defaultTestLoader.getTestCaseNames(ExportRepairs) if name.startswith('test_defect_')]
        result = unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(ExportRepairs(n) for n in names))
        raise SystemExit(not result.wasSuccessful())
    unittest.main(verbosity=2)
