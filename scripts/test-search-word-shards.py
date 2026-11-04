#!/usr/bin/env python3
"""Portable builder integration: additive word buckets preserve every posting."""
import contextlib
import gzip
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('search_builder', Path(__file__).with_name('build-reader-search-shards.py'))
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


class WordShardsTest(unittest.TestCase):
    def test_full_builder_preserves_postings_and_advertises_only_complete_buckets(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            data = root / 'public' / 'data'
            data.mkdir(parents=True)
            fixtures = {
                'he': [{'l': '/reader/fixture/1/1', 't': 'אמת', 'b': 'fixture', 'x': 'אין שום יאוש בעולם'},
                       {'l': '/reader/fixture/1/2', 't': 'תפילה', 'b': 'fixture', 'x': 'שלום אמת'}],
                'en': [{'l': '/reader/fixture/1/1', 't': 'Truth', 'b': 'fixture', 'x': 'alpha beta echo'},
                       {'l': '/reader/fixture/1/2', 't': 'Prayer', 'b': 'fixture', 'x': 'beta alpha end'}],
            }
            for language, rows in fixtures.items():
                with gzip.open(data / f'light-search-index-{language}.json.gz', 'wt', encoding='utf-8') as f:
                    json.dump(rows, f, ensure_ascii=False)
            names = ['ROOT', 'DATA', 'OUT', 'SHARDS', 'DOCS', 'PHRASES', 'LETTERS', 'WORDS']
            original = {name: getattr(builder, name) for name in names}
            try:
                builder.ROOT, builder.DATA = root, data
                builder.OUT = root / 'public' / 'reader-search'
                for name in names[3:]:
                    setattr(builder, name, builder.OUT / name.lower())
                with contextlib.redirect_stdout(io.StringIO()):
                    builder.main()
                meta = json.loads((builder.OUT / 'meta.json').read_text())
                self.assertEqual(meta['wordShards'], 'fnv1a32-high8-v1')
                self.assertEqual(meta['total'], 2)
                self.assertEqual([item['p'] for item in meta['items']], ['/reader/fixture/1/1', '/reader/fixture/1/2'])
                legacy = {}
                for path in builder.SHARDS.glob('*.json'):
                    legacy.update(json.loads(path.read_text()))
                words = {}
                files = sorted(builder.WORDS.glob('*.json'))
                self.assertEqual([p.stem for p in files], [f'{i:02x}' for i in range(256)])
                for path in files:
                    entries = json.loads(path.read_text())
                    self.assertEqual(list(entries), sorted(entries))
                    for term, ids in entries.items():
                        self.assertNotIn(term, words)
                        self.assertEqual(path.stem, f'{builder.phrase_hash(term) >> 24:02x}')
                        words[term] = ids
                self.assertEqual(words, {term: ids for term, ids in legacy.items() if not term.startswith('e:')})
                for term in words:
                    self.assertEqual(legacy['e:' + term[::-1]], words[term])
                self.assertEqual(words['אין'], [0])
                self.assertEqual(words['beta'], [0, 1])
                self.assertEqual(len(list(builder.DOCS.glob('*.json'))), 2)
                self.assertTrue((builder.PHRASES / 'meta.json').exists())
                self.assertTrue((builder.LETTERS / 'meta.json').exists())
            finally:
                for name, value in original.items():
                    setattr(builder, name, value)

    def test_hash_matches_browser_utf8_values(self):
        self.assertEqual([f'{builder.phrase_hash(term) >> 24:02x}' for term in ['אין', 'שום', 'יאוש']], ['35', 'cb', '9c'])


if __name__ == '__main__':
    unittest.main()
