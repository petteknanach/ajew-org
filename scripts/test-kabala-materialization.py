#!/usr/bin/env python3
"""Focused archive and routing regression tests for the Hebrew Kabala collection."""
import gzip
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

from reader_search_routes import route_for_source

spec = importlib.util.spec_from_file_location('materialize_kabala', Path(__file__).with_name('materialize-kabala.py'))
if spec is None or spec.loader is None:
    raise ImportError('Kabala materializer is unavailable')
materialize_kabala = importlib.util.module_from_spec(spec)
spec.loader.exec_module(materialize_kabala)
BOOK = 'kabala-123456abcdef'
TXT = f'public/kabala-files/{BOOK}.txt'
UNIT = f'public/reader/{BOOK}/volume-1/torah-1.json'
TEXT = 'פְּתִיחָה\n\nשני  רווחים, & סימן < מילולי.\n'


class KabalaTests(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR'))
        self.addCleanup(self.scratch.cleanup)
        self.root = Path(self.scratch.name)
        self.reviewed = self.root / 'reviewed'
        p = self.root / materialize_kabala.CATALOG
        p.parent.mkdir(parents=True)
        p.write_text(json.dumps({'entries': [{
            'id': BOOK, 'kind': 'txt', 'title': 'בדיקה', 'download': '/' + TXT.removeprefix('public/'),
            'sections': [{'number': 1, 'title': 'פתיחה'}],
        }]}), encoding='utf-8')
        self.body = {TXT: TEXT, UNIT: json.dumps({'bookId': BOOK, 'part': 1, 'torah': 1, 'title': 'פתיחה', 'hebrewTitle': 'פתיחה', 'segments': [{'index': 1, 'he': TEXT}]}, ensure_ascii=False)}
        for name, value in self.body.items():
            path = self.reviewed / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(value, encoding='utf-8')

    def write_rows(self, rows):
        with gzip.open(self.root / materialize_kabala.ARCHIVE, 'wt', encoding='utf-8') as stream:
            for record in rows:
                stream.write(json.dumps(record, ensure_ascii=False) + '\n')

    def test_pack_and_materialize_exact_bytes_twice(self):
        materialize_kabala.pack(self.root, self.reviewed)
        for _ in range(2):
            materialize_kabala.materialize(self.root)
            for name in self.body:
                self.assertEqual((self.root / name).read_bytes(), (self.reviewed / name).read_bytes())

    def test_reject_extra_and_missing_before_any_public_write(self):
        for rows in ([*self.body.items(), ('public/reader/elsewhere.json', 'unexpected')],
                     [(UNIT, self.body[UNIT])], [*self.body.items(), (UNIT, self.body[UNIT])]):
            with self.subTest(count=len(rows), final=rows[-1][0]):
                self.write_rows(rows)
                with self.assertRaises(ValueError):
                    materialize_kabala.materialize(self.root)
                self.assertFalse((self.root / 'public').exists())

    def test_bind_route_to_canonical_numeric_path_only(self):
        root = Path('public/reader')
        self.assertEqual(route_for_source(Path(UNIT), root), f'/reader/{BOOK}/1/1')
        for suffix in ('index.json', 'part-2/torah-1.json', 'volume-1/torah-01.json', 'volume-1/chapter-1.json'):
            self.assertIsNone(route_for_source(root / BOOK / suffix, root), suffix)
        self.assertEqual(route_for_source(root / 'existing' / 'part-2' / 'torah-5.json', root), '/reader/existing/2/5')


if __name__ == '__main__':
    unittest.main()
