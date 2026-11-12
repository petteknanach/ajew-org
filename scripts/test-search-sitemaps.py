#!/usr/bin/env python3
"""Regression tests for canonical-only search admission; no corpus needed."""
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
import os
import errno
import hashlib
import json
import subprocess
import sys
from unittest.mock import patch

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
        self.assertEqual((self.dist/'sitemap.txt').read_bytes(), (url+'\n').encode('utf-8'))
        index=ET.parse(self.dist/'sitemap.xml');self.assertEqual([n.text for n in index.findall('.//{'+m.NS+'}loc')],[m.SITE+'/sitemap-0.xml'])

    def test_duplicate_across_children(self):
        url=m.SITE+'/good/';self.page('good/index.html',url)
        self.child([url]);self.child([url],'sitemap-1.xml')
        result=m.prune_search_sitemaps(self.dist)
        self.assertEqual(result['reasons'],{'duplicate':1})

    def test_missing_children(self):
        self.child([m.SITE+'/good/'],'sitemap-1.xml')
        with self.assertRaisesRegex(RuntimeError,'Missing numbered'):m.prune_search_sitemaps(self.dist)

    def test_text_matches_admitted_graph_and_preserves_holds(self):
        good = [m.SITE+'/good/', m.SITE+'/%D7%90/']
        self.page('good/index.html', good[0])
        self.page('א/index.html', good[1])
        held = m.SITE+'/held/'
        alternate = m.SITE+'/alternate/'
        hold = self.page('held/index.html', held, '<meta name="robots" content="noindex,follow">')
        alt = self.page('alternate/index.html', good[0])
        before = {p:p.read_bytes() for p in (hold,alt)}
        self.child([good[0], held, alternate, m.SITE+'/missing/', m.SITE+'/raw.txt'])
        self.child([good[0],good[1]], 'sitemap-1.xml')
        receipt = m.prune_search_sitemaps(self.dist)
        text = (self.dist/'sitemap.txt').read_text()
        self.assertEqual(text, '\n'.join(good)+'\n')
        xml = [node.text for child in sorted(self.dist.glob('sitemap-[0-9]*.xml')) for node in ET.parse(child).findall('.//{'+m.NS+'}loc')]
        self.assertEqual(text.splitlines(), xml)
        self.assertEqual(receipt['retained'],len(xml))
        for p,b in before.items(): self.assertEqual(p.read_bytes(),b)

    def test_text_format_limits_and_rejection(self):
        for urls in ([],[m.SITE+'/a/']*2,[m.SITE+'/a/?secret=1'],[m.SITE+'/%0Asecret/'],[m.SITE+'/%0Dsecret/'],[m.SITE+'/%7Fsecret/'],[m.SITE+'/%5Csecret/'],[m.SITE+f'/{n}/' for n in range(50001)]):
            with self.subTest(size=len(urls)), self.assertRaises(RuntimeError):m.text_sitemap(urls)
        self.assertEqual(m.text_sitemap([m.SITE+'/a%26b/']),m.SITE+'/a%26b/\n')

    def test_real_postbuild_main_emits_text_after_admission(self):
        # Execute the same entry point npm build calls, with isolated explicit
        # HTML/hold fixtures. No source text/export producer is imported.
        good = m.SITE+'/good/'
        self.page('good/index.html',good)
        held = self.page('held/index.html',m.SITE+'/held/','<meta name="robots" content="noindex">')
        held_before = held.read_bytes()
        self.child([good,m.SITE+'/held/',m.SITE+'/missing/'])
        catalog = self.dist.parent/'index.json'
        catalog.write_text('{"entries":[]}')
        old_dist, old_catalog = m.DIST, m.CATALOG
        try:
            setattr(m,'DIST',self.dist)
            setattr(m,'CATALOG',catalog)
            m.main()
        finally:
            setattr(m,'DIST',old_dist)
            setattr(m,'CATALOG',old_catalog)
        self.assertEqual((self.dist/'sitemap.txt').read_text(),good+'\n')
        self.assertEqual(held.read_bytes(),held_before)
        self.assertTrue((self.dist/'reader-soft404-removals.json').exists())
        loc = ET.parse(self.dist/'sitemap-0.xml').find('.//{'+m.NS+'}loc')
        self.assertIsNotNone(loc)
        assert loc is not None
        self.assertEqual(loc.text,good)

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

    def snapshot(self):
        return {p.name: p.read_bytes() for p in self.dist.iterdir() if p.is_file()}

    def assert_committed_graph(self, expected):
        receipt = json.loads((self.dist/m.ADMISSION_RECEIPT).read_bytes())
        files = receipt['generation']['files']
        children = sorted(self.dist.glob('sitemap-[0-9]*.xml'), key=lambda p: int(p.stem.split('-')[1]))
        names = [p.name for p in children] + ['sitemap-index.xml', 'sitemap.xml', 'sitemap.txt']
        self.assertEqual(list(files), names)
        self.assertEqual(receipt['generation']['protocol'], 'sha256-files-receipt-last-v1')
        for name in names:
            self.assertEqual(files[name], hashlib.sha256((self.dist/name).read_bytes()).hexdigest())
            self.assertEqual((self.dist/name).stat().st_mode & 0o777, 0o644)
        xml = [n.text for p in children for n in ET.parse(p).findall('.//{'+m.NS+'}loc')]
        self.assertEqual(xml, expected)
        self.assertEqual((self.dist/'sitemap.txt').read_bytes(), ('\n'.join(expected)+'\n').encode())
        self.assertEqual(receipt['retained'], len(expected))
        for index in ('sitemap.xml', 'sitemap-index.xml'):
            self.assertEqual([n.text for n in ET.parse(self.dist/index).findall('.//{'+m.NS+'}loc')],
                             [m.SITE+'/'+p.name for p in children])
        self.assertFalse(list(self.dist.glob('.*.search-sitemaps-*')))

    def stale_generation(self):
        # A genuinely completed previous generation, not a placeholder receipt.
        old, good = m.SITE+'/old/', m.SITE+'/good/'
        self.page('old/index.html', old)
        self.page('good/index.html', good)
        self.child([old, good])
        self.child([good], 'sitemap-1.xml')
        m.prune_search_sitemaps(self.dist)
        self.assert_committed_graph([old, good])
        held = self.page('old/index.html', old, '<meta name="robots" content="noindex">')
        self.held = held
        self.held_before = held.read_bytes()
        self.before = self.snapshot()
        # Cleanup must preserve foreign files even with a matching prefix.
        self.foreign = self.dist/'.foreign.search-sitemaps-do-not-remove'
        self.foreign.write_bytes(b'foreign temporary control')
        return good

    def assert_owned_cleanup(self):
        self.assertEqual(list(self.dist.glob('.*.search-sitemaps-*')), [self.foreign])
        self.assertEqual(self.foreign.read_bytes(), b'foreign temporary control')
        self.assertEqual(self.held.read_bytes(), self.held_before)

    def restore_positive(self, good):
        self.assert_owned_cleanup()
        self.foreign.unlink()
        m.prune_search_sitemaps(self.dist)
        self.assert_committed_graph([good])
        self.assertEqual(self.held.read_bytes(), self.held_before)

    def test_mid_staged_text_write_preserves_complete_old_generation(self):
        good = self.stale_generation()
        real_fdopen = os.fdopen
        partial_paths = []

        class PartialWriter:
            def __init__(self, stream): self.stream = stream
            def __enter__(self): return self
            def __exit__(self, *args): return self.stream.__exit__(*args)
            def __getattr__(self, name): return getattr(self.stream, name)
            def write(self, body):
                self.stream.write(body[:7])
                self.stream.flush()
                raise OSError(errno.ENOSPC, 'injected actual partial staged text write')

        def fdopen(fd, *args, **kwargs):
            name = Path(os.readlink('/proc/self/fd/'+str(fd)))
            stream = real_fdopen(fd, *args, **kwargs)
            if name.name.startswith('.sitemap.txt.search-sitemaps-'):
                partial_paths.append(name)
                return PartialWriter(stream)
            return stream

        with patch.object(m.os, 'fdopen', fdopen), self.assertRaisesRegex(OSError, 'partial staged text'):
            m.prune_search_sitemaps(self.dist)
        self.assertEqual(len(partial_paths), 1)
        self.assertFalse(partial_paths[0].exists())
        self.assertEqual({k:v for k,v in self.snapshot().items() if k != self.foreign.name}, self.before)
        self.restore_positive(good)

    def test_each_replace_failure_invalidates_receipt_and_cleans_owned_temps(self):
        names = ['sitemap-0.xml', 'sitemap-1.xml', 'sitemap-index.xml', 'sitemap.xml', 'sitemap.txt', m.ADMISSION_RECEIPT]
        for failed in names:
            with self.subTest(failed=failed):
                good = self.stale_generation()
                real_replace = os.replace
                promoted = []

                def replace(src, dst):
                    src, dst = Path(src), Path(dst)
                    self.assertEqual(src.parent, self.dist)
                    self.assertEqual(dst.parent, self.dist)
                    self.assertFalse((self.dist/m.ADMISSION_RECEIPT).exists())
                    if dst.name == failed:
                        raise OSError(errno.EIO, 'injected replace failure: '+failed)
                    real_replace(src, dst)
                    promoted.append(dst.name)

                with patch.object(m.os, 'replace', replace), self.assertRaisesRegex(OSError, 'replace failure'):
                    m.prune_search_sitemaps(self.dist)
                self.assertEqual(promoted, names[:names.index(failed)])
                self.assertFalse((self.dist/m.ADMISSION_RECEIPT).exists())
                # Every promoted file is complete; all not-yet-promoted files
                # are byte-identical to the old set, never truncated text/XML.
                for name in names[:-1]:
                    if name not in promoted:
                        self.assertEqual((self.dist/name).read_bytes(), self.before[name])
                if 'sitemap.txt' in promoted:
                    self.assertEqual((self.dist/'sitemap.txt').read_bytes(), (good+'\n').encode())
                self.restore_positive(good)

    def test_all_bytes_staged_before_any_promotion_receipt_last(self):
        good = self.stale_generation()
        self.foreign.unlink()
        real_replace = os.replace
        calls = []
        expected_names = ['sitemap-0.xml', 'sitemap-1.xml', 'sitemap-index.xml', 'sitemap.xml', 'sitemap.txt', m.ADMISSION_RECEIPT]

        def replace(src, dst):
            dst = Path(dst)
            self.assertFalse((self.dist/m.ADMISSION_RECEIPT).exists())
            if not calls:
                staged = list(self.dist.glob('.*.search-sitemaps-*'))
                self.assertEqual(len(staged), len(expected_names))
                staged_receipt = next(p for p in staged if p.name.startswith('.'+m.ADMISSION_RECEIPT+'.'))
                receipt = json.loads(staged_receipt.read_bytes())
                for name, digest in receipt['generation']['files'].items():
                    p = next(p for p in staged if p.name.startswith('.'+name+'.search-sitemaps-'))
                    self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(), digest)
            real_replace(src, dst)
            calls.append(dst.name)

        with patch.object(m.os, 'replace', replace): m.prune_search_sitemaps(self.dist)
        self.assertEqual(calls, expected_names)
        self.assert_committed_graph([good])
        self.assertEqual(self.held.read_bytes(), self.held_before)

    def test_fsync_failure_after_receipt_promotion_removes_success_receipt(self):
        good = self.stale_generation()
        real_sync = m.sync_directory
        failed = []

        def sync(dist):
            if (dist/m.ADMISSION_RECEIPT).exists() and not failed:
                failed.append(True)
                raise OSError(errno.EIO, 'injected post-receipt directory fsync failure')
            real_sync(dist)

        with patch.object(m, 'sync_directory', sync), self.assertRaisesRegex(OSError, 'post-receipt'):
            m.prune_search_sitemaps(self.dist)
        self.assertEqual(failed, [True])
        self.assertFalse((self.dist/m.ADMISSION_RECEIPT).exists())
        self.restore_positive(good)

    def test_twelve_children_fresh_exact_order_and_hashes(self):
        urls = [m.SITE+f'/good-{i}/' for i in range(12)]
        for i, url in enumerate(urls):
            self.page(f'good-{i}/index.html', url)
            self.child([url], f'sitemap-{i}.xml')
        before = {p: p.read_bytes() for p in self.dist.rglob('*.html')}
        expected_xml = {}
        for p in self.dist.glob('sitemap-[0-9]*.xml'):
            # Exact historical ElementTree.write serialization, not a second
            # call to the candidate's new serializer.
            stream = io.BytesIO()
            ET.parse(p).write(stream, encoding='utf-8', xml_declaration=True)
            expected_xml[p] = stream.getvalue()
        m.prune_search_sitemaps(self.dist)
        self.assert_committed_graph(urls)
        for p, body in expected_xml.items(): self.assertEqual(p.read_bytes(), body)
        for p, body in before.items(): self.assertEqual(p.read_bytes(), body)

    def test_actual_main_process_failures_are_nonzero_and_invalidate_stale_admission(self):
        # Import the genuine producer, inject only labelled filesystem faults,
        # then call the actual main() used by npm build. No substitute producer.
        runner = r'''
import errno, importlib.util, os, sys
from pathlib import Path
script, dist, catalog, fault = sys.argv[1:]
sys.path.insert(0, str(Path(script).parent))
spec = importlib.util.spec_from_file_location('actual_postbuild', script)
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.DIST = Path(dist); m.CATALOG = Path(catalog)
if fault == 'replace':
    real_replace = os.replace
    def replace(src, dst):
        if Path(dst).name == 'sitemap.txt':
            raise OSError(errno.EIO, 'injected actual-main text replace failure')
        return real_replace(src, dst)
    m.os.replace = replace
elif fault == 'midwrite':
    real_fdopen = os.fdopen
    class PartialWriter:
        def __init__(self, stream): self.stream = stream
        def __enter__(self): return self
        def __exit__(self, *args): return self.stream.__exit__(*args)
        def __getattr__(self, name): return getattr(self.stream, name)
        def write(self, body):
            self.stream.write(body[:7]); self.stream.flush()
            raise OSError(errno.ENOSPC, 'injected actual-main partial text stage write')
    def fdopen(fd, *args, **kwargs):
        path = Path(os.readlink('/proc/self/fd/'+str(fd)))
        stream = real_fdopen(fd, *args, **kwargs)
        return PartialWriter(stream) if path.name.startswith('.sitemap.txt.search-sitemaps-') else stream
    m.os.fdopen = fdopen
m.main()
'''
        catalog = self.dist.parent/'main-catalog.json'
        for fault, error in [('midwrite', 'partial text stage write'), ('replace', 'text replace failure'),
                             ('catalog', 'JSONDecodeError')]:
            with self.subTest(fault=fault):
                good = self.stale_generation()
                catalog.write_text('broken' if fault == 'catalog' else '{"entries":[]}')
                result = subprocess.run([sys.executable, '-B', '-c', runner, str(Path(__file__).with_name('postbuild-seo-sitemaps.py').resolve()),
                                         str(self.dist), str(catalog), fault], capture_output=True, text=True)
                print(json.dumps({'case': 'actual-main-'+fault, 'returncode': result.returncode,
                                  'stdout': result.stdout, 'stderr': result.stderr}))
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(error, result.stderr)
                self.assertNotIn('SEO sitemaps:', result.stdout)
                self.assertFalse((self.dist/m.ADMISSION_RECEIPT).exists())
                self.assert_owned_cleanup()
                # Restore the real main path after each negative, not only the
                # lower-level serializer, and require exact positive graph.
                catalog.write_text('{"entries":[]}')
                positive = subprocess.run([sys.executable, '-B', '-c', runner, str(Path(__file__).with_name('postbuild-seo-sitemaps.py').resolve()),
                                           str(self.dist), str(catalog), 'none'], capture_output=True, text=True)
                print(json.dumps({'case': 'actual-main-restored-'+fault, 'returncode': positive.returncode,
                                  'stdout': positive.stdout, 'stderr': positive.stderr}))
                self.assertEqual(positive.returncode, 0, positive.stderr)
                self.assertIn('SEO sitemaps:', positive.stdout)
                self.assert_owned_cleanup()
                self.foreign.unlink()
                self.assert_committed_graph([good])

if __name__ == '__main__':unittest.main(verbosity=2)
