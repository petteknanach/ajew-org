"""Exercise the real postbuild entry against explicit synthetic artifacts."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock
import xml.etree.ElementTree as ET

from reader_soft404_artifacts import UnsafeArtifactError

spec = importlib.util.spec_from_file_location('postbuild_seo', Path(__file__).with_name('postbuild-seo-sitemaps.py'))
assert spec is not None and spec.loader is not None
subject = importlib.util.module_from_spec(spec)
spec.loader.exec_module(subject)


def page(url, title, main):
    return ('<!DOCTYPE html><html><head><title>' + title + '</title>'
            '<link rel="canonical" href="' + url + '"></head><body>'
            '<main id="main-content">' + main + '</main></body></html>').encode('utf-8')


class PostbuildTests(unittest.TestCase):
    def setUp(self):
        scratch = os.environ.get('READER_SOFT404_TEST_SCRATCH')
        self.assertTrue(scratch, 'Set owned READER_SOFT404_TEST_SCRATCH')
        self.temp = tempfile.TemporaryDirectory(dir=scratch)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.dist = self.root / 'dist'
        self.dist.mkdir()
        self.catalog = self.root / 'catalog.json'
        self.catalog.write_text(json.dumps({'entries': [
            {'bookId': 'book', 'part': '1', 'torah': '7'},
            {'bookId': 'book', 'part': '1', 'torah': '8'}]}))
        self.bad_url = 'https://ajew.org/reader/book/1/7/'
        self.good_url = 'https://ajew.org/reader/book/1/8/'
        self.bad = self.put('reader/book/1/7/index.html', page(self.bad_url, 'Torah Not Found | ajew.org',
            '<div><h1>Torah 7 not found</h1><p><a href="/reader">Back to Reader</a></p></div>'))
        self.good = self.put('reader/book/1/8/index.html', page(self.good_url, 'Real reading | ajew.org',
            '<div class="reader-content"><p lang="he">תורה ושלום</p><p>Translation not yet available</p></div>'))
        self.put('reader-plain/book/1/7/index.txt', b'Unchanged raw source\n')
        self.put('reader-plain/book/1/7/index.md', b'# Unchanged raw source\n')
        self.put('reader-plain/book/1/7/index.json', b'{"he":"source"}\n')
        self.put('reader/book/part-1/torah-7.json', b'{"source":"preserve"}\n')
        self.child = self.dist / 'sitemap-0.xml'
        self.child.write_text(subject.xml_urlset([self.bad_url, self.good_url], '0.7'))
        self.old_child = self.child.read_bytes()
        self.protected = {p: (p.read_bytes(), p.stat().st_mtime_ns) for p in self.dist.rglob('*')
                          if p.is_file() and p not in (self.child, self.bad)}

    def put(self, relative, data):
        p = self.dist / relative
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
        return p

    def run_main(self):
        with mock.patch.object(subject, 'DIST', self.dist), mock.patch.object(subject, 'CATALOG', self.catalog):
            with contextlib.redirect_stdout(io.StringIO()) as output:
                subject.main()
        return output.getvalue()

    def test_real_main_removes_error_before_admission_and_conserves_raw(self):
        output = self.run_main()
        self.assertIn('removed 1 empty fallbacks', output)
        self.assertFalse(self.bad.exists())
        self.assertTrue(self.bad.parent.is_dir())
        for p, value in self.protected.items():
            self.assertEqual((p.read_bytes(), p.stat().st_mtime_ns), value)
        ns = {'s': subject.NS}
        rows = ET.parse(self.child).findall('.//s:url', ns)
        locations = [r.find('s:loc', ns) for r in rows]
        assert all(loc is not None for loc in locations)
        self.assertEqual([loc.text for loc in locations if loc is not None], [self.good_url])
        priority = rows[0].find('s:priority', ns)
        assert priority is not None
        self.assertEqual(priority.text, '0.7')
        self.assertEqual((self.dist / 'sitemap.xml').read_bytes(), (self.dist / 'sitemap-index.xml').read_bytes())
        raw = ET.parse(self.dist / 'sitemap-reader-raw.xml')
        raw_urls = {r.text for r in raw.findall('.//s:loc', ns)}
        # Raw discovery is preserved independently; this does not certify each export.
        self.assertIn(self.bad_url + 'raw.txt', raw_urls)
        removal = json.loads((self.dist / 'reader-soft404-removals.json').read_text())
        self.assertEqual(removal['removed_count'], 1)
        self.assertNotIn('root', removal)
        admission = json.loads((self.dist / 'search-sitemap-admission.json').read_text())
        self.assertEqual(admission['retained'], 1)
        self.assertEqual(admission['reasons'], {'missing_html': 1})

    def test_pruner_failure_aborts_sitemap_admission(self):
        with mock.patch.object(subject, 'prune_reader_errors', side_effect=UnsafeArtifactError('test drift')):
            with self.assertRaises(UnsafeArtifactError):
                self.run_main()
        self.assertEqual(self.child.read_bytes(), self.old_child)
        self.assertTrue(self.bad.exists())
        self.assertFalse((self.dist / 'reader-soft404-removals.json').exists())
        self.assertFalse((self.dist / 'sitemap-index.xml').exists())

    def test_different_main_shape_and_qualified_source_hold_survive(self):
        self.bad.write_bytes(page(self.bad_url, 'Torah Not Found | ajew.org',
            '<div><h1>Torah 7 not found</h1><p>Qualified source selection pending.</p>'
            '<p><a href="/reader">Back to Reader</a></p></div>'))
        before = self.bad.read_bytes()
        self.run_main()
        self.assertEqual(self.bad.read_bytes(), before)
        self.assertEqual(json.loads((self.dist / 'reader-soft404-removals.json').read_text())['removed_count'], 0)


if __name__ == '__main__':
    unittest.main(verbosity=2)
