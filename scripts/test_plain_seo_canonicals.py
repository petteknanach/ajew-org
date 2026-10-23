"""Focused safety/regression tests; stdlib only, no producers/network."""
import html
import json
from pathlib import Path
import tempfile
import unittest

from plain_seo_canonicals import (SITE, QUALIFIED_RAW, iri_path, regular,
                                  repair_plain_canonicals, raw_section_url, metadata)


class CanonicalRepairTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.row = dict(bookId="book", part="1", torah="1",
                        url="/reader-plain/book/1/1/", sourceUrl="/reader/book/1/1")
        self.path = self.root / "reader-plain/book/1/1/index.html"
        self.path.parent.mkdir(parents=True)
        self.before = self.document()
        self.path.write_text(self.before)

    def document(self):
        old = SITE + self.row['sourceUrl']
        own = SITE + self.row['url']
        schema = json.dumps({'@type': 'DigitalDocument', 'url': own, 'mainEntityOfPage': old}, ensure_ascii=False)
        return ('<html><head><meta name="robots" content="index,follow">'
                '<link rel="canonical" href="' + html.escape(old) + '">'
                '<script type="application/ld+json">' + schema + '</script></head>'
                '<body><header><p>Index · <a href="' + html.escape(self.row['sourceUrl']) + '">Human reader page</a></p></header>'
                '<main><section>Exact תורה &amp; reading\r\n</section></main></body></html>')

    def repair(self):
        return repair_plain_canonicals(self.root, [self.row])

    def target(self, content, suffix="/index.html"):
        path = self.root / ('reader/book/1/1' + suffix)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        return path

    def test_dead_canonical_and_only_known_header_link(self):
        result = self.repair()
        self.assertEqual(result['changed'], 1)
        self.assertTrue(result['bindings'][0]['human_link_withheld'])
        text = self.path.read_text()
        self.assertIn('Exact תורה &amp; reading', text)
        self.assertIn(b'&amp; reading\r\n</section>', self.path.read_bytes())
        self.assertNotIn('Human reader page', text)
        self.assertEqual(metadata(text).canonicals, [SITE + self.row['url']])
        self.assertEqual(self.repair()['changed'], 0)

    def test_noindex_target_never_promoted(self):
        self.target('<head><meta name="robots" content="noindex"></head><body>Hold</body>')
        result = self.repair()
        self.assertEqual(result['bindings'][0]['reason'], 'target_noindex')
        self.assertTrue(metadata(self.path.read_text()).noindex)
        self.assertIn('Human reader page', self.path.read_text())

    def test_preexisting_plain_hold_is_not_promoted(self):
        self.path.write_bytes(self.before.replace('content="index,follow"', 'content="noindex,follow"').encode())
        self.assertEqual(self.repair()["changed"], 1)
        self.assertTrue(metadata(self.path.read_text()).noindex)

    def test_legacy_redirect_implicit_head(self):
        self.target('<!doctype html><title>Redirect</title><meta name="robots" content="noindex"><body>Redirecting</body>')
        self.assertEqual(self.repair()['changed'], 1)
        self.assertTrue(metadata(self.path.read_text()).noindex)

    def test_existing_html_and_false_error_wrapper_not_reclassified(self):
        for suffix in ['/index.html', '.html']:
            with self.subTest(suffix=suffix):
                p = self.target('<head><title>Reader Not Found</title></head><body>Real content</body>', suffix)
                self.assertEqual(self.repair()['changed'], 0)
                p.unlink()

    def test_false_plain_wrapper_missing_generator_contract(self):
        self.path.write_text('<head><link rel="canonical" href="https://ajew.org/reader/book/1/1"></head><main>Not generator</main>')
        before = self.path.read_bytes()
        self.assertEqual(self.repair()['changed'], 0)
        self.assertEqual(self.path.read_bytes(), before)

    def test_qualified_and_unproven_owner_untouched(self):
        for updates in [{'part': 'reviewed'}, {'sourceUrl': None}, {'sourceUrl': 'https://elsewhere.test/reader/book/1/1'}, {'url': '/reader-plain/book/reviewed/1/'}]:
            row = dict(self.row, **updates)
            self.assertEqual(repair_plain_canonicals(self.root, [row])['changed'], 0)
        self.assertEqual(self.path.read_bytes(), self.before.encode())

    def test_symlink_source_target_and_ancestor_rejected(self):
        original = self.path.read_bytes()
        real = self.root / 'real.html'; real.write_bytes(original)
        self.path.unlink(); self.path.symlink_to(real)
        with self.assertRaises(ValueError): self.repair()
        self.path.unlink(); self.path.write_bytes(original)
        target = self.target('safe'); target.unlink(); target.symlink_to(real)
        with self.assertRaises(ValueError): self.repair()
        alias = self.root / 'alias'; alias.symlink_to(self.path.parent, target_is_directory=True)
        with self.assertRaises(ValueError): regular(self.root, 'alias/index.html')

    def test_traversal_unknown_host_and_bad_escape(self):
        for bad in ['/x/../y', '/x/%2e%2e/y', 'https://evil.test/x', '//evil.test/x', '/x/%ZZ', '/x/%00', '/x?query', '/x#fragment']:
            with self.subTest(bad=bad), self.assertRaises(ValueError): iri_path(bad)

    def test_iri_projection_preserves_literal(self):
        self.assertEqual(iri_path('/reader/עברית/1/Hello World'), '/reader/עברית/1/Hello World')
        self.assertEqual(iri_path('/reader/%D7%90/1/1'), '/reader/א/1/1')

    def test_qualified_raw_exact_row_and_physical_guard(self):
        row = dict(bookId='reviewed', part='reviewed', torah='wrapup-18-19-92-209', url=QUALIFIED_RAW)
        with self.assertRaises(ValueError): raw_section_url(self.root, row)
        p = self.root / (QUALIFIED_RAW.lstrip('/') + 'index.txt'); p.parent.mkdir(parents=True); p.write_text('Qualified source')
        self.assertEqual(raw_section_url(self.root, row), SITE + QUALIFIED_RAW + 'index.txt')
        with self.assertRaises(ValueError): raw_section_url(self.root, dict(row, url='/guessed/'))
        p.unlink(); p.symlink_to(self.path)
        with self.assertRaises(ValueError): raw_section_url(self.root, row)


if __name__ == '__main__':
    unittest.main()
