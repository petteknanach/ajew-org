#!/usr/bin/env python3
"""Regression tests for canonical-only search admission; no corpus needed."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
import os

spec = importlib.util.spec_from_file_location('sitemaps', Path(__file__).with_name('postbuild-seo-sitemaps.py'))
assert spec is not None and spec.loader is not None
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class SitemapTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR'))
        self.addCleanup(self.tmp.cleanup)
        self.dist = Path(self.tmp.name) / 'dist'
        self.dist.mkdir()

    def page(self, path, canonical=None, meta='', body='unchanged Torah'):
        dest = self.dist / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        link = '' if canonical is None else f'<link rel="CANONICAL" href="{canonical}">'
        dest.write_text(f'<!doctype html><html><head>{link}{meta}</head><body>{body}</body></html>')
        return dest

    def child(self, urls, name='sitemap-0.xml'):
        dest = self.dist / name
        dest.write_text(m.xml_urlset(urls))
        return dest

    def test_self_canonical(self):
        self.page('good/index.html', m.SITE+'/good/')
        self.assertIsNone(m.search_admission(self.dist, m.SITE+'/good/'))

    def test_unicode_decoding(self):
        url=m.SITE+'/%D7%90/'
        self.page('א/index.html',url)
        self.assertIsNone(m.search_admission(self.dist,url))

    def test_noindex_self_and_alternate(self):
        for canonical in (m.SITE+'/held/', m.SITE+'/other/'):
            self.page('held/index.html',canonical,'<meta name="robots" content="INDEX, NOINDEX">')
            self.assertEqual(m.search_admission(self.dist,m.SITE+'/held/'),'noindex')

    def test_googlebot_none(self):
        self.page('held/index.html',m.SITE+'/held/','<meta name="GOOGLEBOT" content="none">')
        self.assertEqual(m.search_admission(self.dist,m.SITE+'/held/'),'noindex')

    def test_missing_canonical(self):
        self.page('page/index.html',meta='<link disabled>')
        self.assertEqual(m.search_admission(self.dist,m.SITE+'/page/'),'missing_canonical')

    def test_multiple_canonicals(self):
        self.page('page/index.html',m.SITE+'/page/', '<link rel="canonical" href="https://ajew.org/page/">')
        self.assertEqual(m.search_admission(self.dist,m.SITE+'/page/'),'noncanonical')

    def test_external_runtime(self):
        self.page('blog/index.html',m.SITE+'/blog/')
        self.assertEqual(m.search_admission(self.dist,m.SITE+'/blog/'),'external_runtime')
        self.assertEqual(m.search_admission(self.dist,m.SITE+'/blog/archive/'),'external_runtime')

    def test_missing_artifact(self):
        self.assertEqual(m.search_admission(self.dist,m.SITE+'/missing/'),'missing_html')

    def test_invalid_urls(self):
        for url in ('http://ajew.org/a/','https://evil.org/a/',m.SITE+'/a/?x=1',m.SITE+'/a/#x',m.SITE+'/a b/',m.SITE+'/א/',m.SITE+'/%x/',m.SITE+'/%2e%2e/a/',m.SITE+'/%00/a/'):
            with self.subTest(url=url): self.assertFalse(m.valid_search_location(url))

    def test_containment(self):
        outside=self.dist.parent/'outside-sitemap-control.html'
        outside.write_text('<head><link rel="canonical" href="https://ajew.org/escape/"></head>')
        self.addCleanup(outside.unlink)
        (self.dist/'escape.html').symlink_to(outside)
        self.assertEqual(m.search_admission(self.dist,m.SITE+'/escape/'),'missing_html')

    def test_body_meta_not_head(self):
        self.page('good/index.html',m.SITE+'/good/',body='<meta name="robots" content="noindex">')
        self.assertIsNone(m.search_admission(self.dist,m.SITE+'/good/'))

    def test_metadata_and_exports_preserved(self):
        url=m.SITE+'/good/'
        p=self.page('good/index.html',url); before=p.read_bytes()
        child=self.child([url,m.SITE+'/missing/']); root=ET.parse(child).getroot(); original=ET.tostring(root[0])
        raw=self.dist/'sitemap-reader-raw.xml';raw.write_text('untouched AI manifest')
        receipt=m.prune_search_sitemaps(self.dist)
        self.assertEqual((receipt['scanned'],receipt['retained'],receipt['excluded']),(2,1,1))
        self.assertEqual(ET.tostring(ET.parse(child).getroot()[0]),original)
        self.assertEqual(p.read_bytes(),before)
        self.assertEqual(raw.read_text(),'untouched AI manifest')
        self.assertEqual((self.dist/'sitemap.xml').read_bytes(),(self.dist/'sitemap-index.xml').read_bytes())
        index=ET.parse(self.dist/'sitemap.xml');self.assertEqual([n.text for n in index.findall('.//{'+m.NS+'}loc')],[m.SITE+'/sitemap-0.xml'])

    def test_duplicate_across_children(self):
        url=m.SITE+'/good/';self.page('good/index.html',url)
        self.child([url]);self.child([url],'sitemap-1.xml')
        result=m.prune_search_sitemaps(self.dist)
        self.assertEqual(result['reasons'],{'duplicate':1})

    def test_missing_children(self):
        self.child([m.SITE+'/good/'],'sitemap-1.xml')
        with self.assertRaisesRegex(RuntimeError,'Missing numbered'):m.prune_search_sitemaps(self.dist)

    def test_empty_fails_without_writing(self):
        p=self.child([m.SITE+'/missing/']);before=p.read_bytes()
        with self.assertRaisesRegex(RuntimeError,'empty'):m.prune_search_sitemaps(self.dist)
        self.assertEqual(p.read_bytes(),before)

    def test_malformed_xml_fails_without_writing(self):
        url=m.SITE+'/good/';self.page('good/index.html',url)
        p=self.child([url]);before=p.read_bytes()
        (self.dist/'sitemap-1.xml').write_text('<broken>')
        with self.assertRaises(ET.ParseError):m.prune_search_sitemaps(self.dist)
        self.assertEqual(p.read_bytes(),before)

if __name__ == '__main__':unittest.main(verbosity=2)
