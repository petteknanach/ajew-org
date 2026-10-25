#!/usr/bin/env python3
"""Bounded unit + real imported producer fixture; never a full-corpus build.

Run: python -m unittest discover -s scripts -p test_reader_plain_navigation.py -v
All temporary outputs use TMPDIR (the Hermes scratch directory when delegated).
"""
from __future__ import annotations

import ast
import copy
import hashlib
from html.parser import HTMLParser
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import types
import unittest
from unittest.mock import patch
from urllib.parse import urljoin

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
BASE = "3bf112e23adc6b11ca6d13ddd9059f59e987000a"


def load_producer():
    spec = importlib.util.spec_from_file_location("plain_producer_under_test", HERE / "build-reader-plain-text.py")
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


P = load_producer()
N = P._navigation


def baseline_bytes(path):
    return subprocess.check_output(["git", "-c", "core.packedGitWindowSize=16m", "-c", "core.packedGitLimit=32m", "show", f"{BASE}:{path}"], cwd=ROOT)


# Only these reviewed presentation edits may precede the immutable full-template check.
# Route limits, physical loader, reading fields, IDs and scripts are not normalized.
_NANACH_H1_PRESENTATION_EDITS = (('{semanticH1 ? <h1 class="torah-number" style="font: inherit; margin: 0; color: inherit;">{torahData.title}</h1> : <div class="torah-number">{torahData.title}</div>}', '<div class="torah-number">{torahData.title}</div>'), ('const { part, torah } = Astro.params;\nconst semanticH1 = ["1/1","1/2","1/3","1/4","1/5","1/6","1/7","1/8","1/9","1/10","1/11","1/12","1/14","1/15","1/17","1/18","1/19","1/20","1/21","1/22","1/23","2/1","2/3","2/4","2/5","2/6","2/7","2/8","2/9","2/10","2/11","3/1","3/2","3/3","3/4","3/5","3/6","3/7","3/8","3/9","3/10","3/11","3/12","3/13","3/14","3/15","3/16","3/17","3/18","4/1","4/2","4/3","4/4","4/5","4/6","4/7","4/8","4/9","4/10","4/11","4/12","4/13","4/14","4/15","4/16","4/17","4/18","4/19","4/20","4/21","4/22","4/23","4/24","4/25","4/26","4/27","4/28","4/29","4/30","4/31","4/32","4/33","4/35","4/36","4/37","4/38","4/39","4/40","5/4","5/5","5/6","5/7","5/8","1/13","1/16","1/24","2/2","4/34","5/1","5/2","5/3"].includes(`${part}/${torah}`);', 'const { part, torah } = Astro.params;'))


def nanach_heading_preimage(template):
    for current, predecessor in _NANACH_H1_PRESENTATION_EDITS:
        if template.count(current) != 1:
            raise ValueError("Nanach semantic heading edit changed or duplicated")
        template = template.replace(current, predecessor, 1)
    return template


def baseline_producer():
    module = types.ModuleType("plain_baseline")
    module.__file__ = str(HERE / "build-reader-plain-text.py")
    exec(compile(baseline_bytes("scripts/build-reader-plain-text.py"), module.__file__, "exec"), module.__dict__)
    return module


class Links(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.hrefs, self.robots, self.redirects = [], [], []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "href" in attrs:
            self.hrefs.append(attrs["href"])
        if tag == "meta" and attrs.get("name") == "robots":
            self.robots.append(attrs.get("content"))
        if tag == "meta" and (attrs.get("http-equiv") or "").lower() == "refresh":
            self.redirects.append(attrs)


def fixture_rows(out):
    """Explicit synthetic navigation data, not a claim about current catalog."""
    rows = []
    for i, path in enumerate(N.load_legacy_paths()):
        part, section = N.LEGACY_RE.fullmatch(path).groups()
        book = "sefer-hamidos" if section.startswith("topic-") else "unit-work"
        url = f"/reader-plain/{book}/{part}/{section}/"
        row = {"bookId": book, "part": part, "torah": section, "title": f"Current <title> & {section}", "url": url, "segments": 1}
        directory = out / book / part / section
        directory.mkdir(parents=True, exist_ok=True)
        (directory / "index.html").write_text("<!doctype html><p>unit target</p>")
        (directory / "index.json").write_text(json.dumps({"title": row["title"], "segments": [{"index": 1, "he": "unit"}]}))
        rows.append(row)
    return rows


class NavigationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="plain-navigation-unit-", dir=os.environ.get("TMPDIR"))
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.out = self.root / "out"
        self.out.mkdir()

    def test_original_encoded_alias_is_red_and_fixed_resolution_is_green(self):
        base = "https://ajew.org/reader-plain/likutay-moharan%2F"
        # A genuine standard-library resolution, not a string mock of URL behavior.
        self.assertEqual(urljoin(base, "1/64/"), "https://ajew.org/reader-plain/1/64/")
        self.assertNotEqual(urljoin(base, "1/64/"), "https://ajew.org/reader-plain/likutay-moharan/1/64/")
        for base in ("https://ajew.org/reader-plain/likutay-moharan/", base, base + "index.html", base + "index"):
            self.assertEqual(urljoin(base, "/reader-plain/likutay-moharan/1/64/"), "https://ajew.org/reader-plain/likutay-moharan/1/64/")
        base = "https://ajew.org/reader-plain/sefer-hamidos%2F"
        self.assertEqual(urljoin(base, "4/topic-12/"), "https://ajew.org/reader-plain/4/topic-12/")
        self.assertEqual(urljoin(base, "/reader-plain/sefer-hamidos/4/topic-12/"), "https://ajew.org/reader-plain/sefer-hamidos/4/topic-12/")

    def test_global_hardening_preserves_spaced_legacy_names_without_expanding_navigation(self):
        url = "/reader-plain/chayey-moharan/1/His Birthplace, Residence, Journeys and Wanderings/"
        directory = self.out / "chayey-moharan/1/His Birthplace, Residence, Journeys and Wanderings"
        directory.mkdir(parents=True)
        text = '<a href="index.txt">TXT</a><main><p>Unchanged complete body.</p></main>'
        (directory / "index.html").write_text(text)
        N.harden_section_links(self.out, [{"url": url}])
        self.assertEqual((directory / "index.html").read_text(), text.replace('href="index.txt"', 'href="' + url + 'index.txt"'))
        with self.assertRaises(ValueError):
            N.plain_target_directory(self.out, url)
        for bad in ["/reader-plain/work/1/../outside/", "/reader-plain/work/1/%2e%2e/", "/reader-plain/work/1/name?x/", "https://foreign.example/reader-plain/work/1/name/"]:
            with self.assertRaises(ValueError):
                N.plain_target_directory(self.out, bad, legacy_export_names=True)

    def test_href_repair_changes_only_relative_href_values(self):
        text = '''<!doctype html>\r\n<p data-note="href='not-a-link'">body &amp; Hebrew אב</p><a href='index.txt'>TXT</a><link href="index.md?x=1&amp;y=2"><a href=#segment-1>part</a><a href='/reader/'>root</a><a href="https://elsewhere.example/x">external</a><a href="mailto:a@example.org">email</a><script>var s="href='index.txt'";</script><!-- href='index.txt' -->'''
        expected = text.replace("href='index.txt'>TXT", "href='/reader-plain/work/1/2/index.txt'>TXT").replace('href="index.md?x=1&amp;y=2"', 'href="/reader-plain/work/1/2/index.md?x=1&amp;y=2"')
        self.assertEqual(N.root_absolute_hrefs(text, "/reader-plain/work/1/2/"), expected)
        self.assertEqual(N.root_absolute_hrefs(expected, "/reader-plain/work/1/2/"), expected)

    def test_all_117_noindex_pages_dedup_provenance_and_no_admission(self):
        rows = fixture_rows(self.out)
        before = copy.deepcopy(rows)
        rows.append(copy.deepcopy(rows[0]))
        receipt = N.write_legacy_navigation(self.out, rows, {"unit-work": 'Work <name> & "label"'})
        self.assertEqual(receipt["pages"], 117)
        self.assertEqual(rows[:-1], before)
        first = N.load_legacy_paths()[0]
        self.assertEqual(next(iter(receipt["targets"][first].values())), [0, 117])
        self.assertEqual(len(receipt["targets"][first]), 1)
        for path in N.load_legacy_paths():
            target = self.out / path.removeprefix("/reader-plain/") / "index.html"
            text = target.read_text()
            links = Links(text)
            self.assertEqual(links.robots, ["noindex,follow"])
            self.assertFalse(links.redirects)
            self.assertEqual(len(links.hrefs), 2)
            self.assertEqual(links.hrefs[1], N.ORIGIN + next(iter(receipt["targets"][path])))
            self.assertIn("Available works", text)
            self.assertNotIn("<script", text)
            self.assertNotIn("/reader/sefer-hamidos/", text)
            self.assertNotIn("<title> &", text)
            self.assertIn("Current &lt;title&gt; &amp;", text)
        self.assertFalse((self.out / "1" / "999" / "index.html").exists())
        self.assertFalse((self.out / "index.json").exists())
        self.assertFalse((self.out / "sitemap.xml").exists())
        self.assertIn("Work &lt;name&gt; &amp; &quot;label&quot;", (self.out / "1/64/index.html").read_text())

    def test_tampered_seed_unknown_path_and_zero_candidate_fail_closed(self):
        seed = self.root / "tampered.json"
        seed.write_text(json.dumps(N.load_legacy_paths()[:-1] + ["/reader-plain/1/999"]))
        with self.assertRaises(ValueError):
            N.load_legacy_paths(seed)
        rows = fixture_rows(self.out)
        with self.assertRaises(ValueError):
            N.navigation_candidates(rows, self.out, N.load_legacy_paths() + ["/reader-plain/1/999"])
        with self.assertRaises(ValueError):
            N.write_legacy_navigation(self.out, rows[:-1])
        self.assertFalse((self.out / "1").exists())
        self.assertFalse((self.out / "4").exists())

    def test_missing_html_json_and_nonpositive_counts_fail_before_writes(self):
        rows = fixture_rows(self.out)
        directory = self.out / "unit-work/1/64"
        for name in ("index.html", "index.json"):
            target = directory / name
            before = target.read_bytes()
            target.unlink()
            with self.assertRaises(ValueError):
                N.write_legacy_navigation(self.out, rows)
            target.write_bytes(before)
        for count in (0, -1, True, "1", None):
            bad = copy.deepcopy(rows)
            bad[0]["segments"] = count
            with self.assertRaises(ValueError):
                N.write_legacy_navigation(self.out, bad)
        self.assertFalse((self.out / "1").exists())

    def test_unsafe_paths_query_origin_and_symlink_rejected(self):
        unsafe = ["https://ajew.org/reader-plain/book/1/64/", "https://evil.example/reader-plain/book/1/64/", "//evil.example/book/1/64/", "/reader-plain/book/1/64/?q=1", "/reader-plain/book/1/64/#x", "/reader-plain/book/../64/", "/reader-plain/book/%2e%2e/64/", "/reader-plain/book/1%2fother/64/", "/reader-plain/book\\x/1/64/", "/reader-plain/book//1/64/", "/reader-plain/1/64/", "/reader-plain/book/1/64/\n"]
        for url in unsafe:
            with self.subTest(url=url), self.assertRaises(ValueError):
                N.plain_target_directory(self.out, url)
        outside = self.root / "outside"
        outside.mkdir()
        (self.out / "link").symlink_to(outside, target_is_directory=True)
        with self.assertRaises(ValueError):
            N.plain_target_directory(self.out, "/reader-plain/link/1/64/")
        rows = fixture_rows(self.out)
        target = self.out / "unit-work/1/64/index.html"
        target.unlink()
        target.symlink_to(outside / "index.html")
        (outside / "index.html").write_text("outside")
        with self.assertRaises(ValueError):
            N.write_legacy_navigation(self.out, rows)

    def test_multiple_actual_targets_and_current_json_title(self):
        rows = fixture_rows(self.out)
        row = copy.deepcopy(rows[0])
        row.update(bookId="second-work", url="/reader-plain/second-work/1/64/", title="Stale duplicate catalog label")
        directory = self.out / "second-work/1/64"
        directory.mkdir(parents=True)
        (directory / "index.html").write_text("<!doctype html><p>second unit target</p>")
        (directory / "index.json").write_text(json.dumps({"title": "Actual current section title", "segments": [{"index": 9, "he": "unit"}]}))
        rows.extend([row, copy.deepcopy(row)])
        receipt = N.write_legacy_navigation(self.out, rows)
        text = (self.out / "1/64/index.html").read_text()
        self.assertEqual(len(Links(text).hrefs), 3)
        self.assertIn("Actual current section title", text)
        self.assertNotIn("Stale duplicate catalog label", text)
        self.assertIn("second-work", text)
        self.assertEqual(receipt["targets"]["/reader-plain/1/64"][row["url"]], [117, 118])
        self.assertEqual(N.book_labels(ROOT / "public/reader")["likutay-moharan"], "Likutay Moharan")

    def test_invalid_or_empty_json_and_existing_output_fail_closed(self):
        rows = fixture_rows(self.out)
        target = self.out / "unit-work/1/64/index.json"
        before = target.read_bytes()
        for bad in ("not JSON", "[]", '{"title":"Empty", "segments":[]}', '{"title":null, "segments":[{}]}'):
            target.write_text(bad)
            with self.assertRaises(ValueError):
                N.write_legacy_navigation(self.out, rows)
            self.assertFalse((self.out / "1").exists())
        target.write_bytes(before)
        existing = self.out / "1/64/index.html"
        existing.parent.mkdir(parents=True)
        existing.write_text("Must not overwrite")
        with self.assertRaises(ValueError):
            N.write_legacy_navigation(self.out, rows)
        self.assertEqual(existing.read_text(), "Must not overwrite")
        self.assertFalse((self.out / "4").exists())

    def test_identity_mismatch_rejected(self):
        rows = fixture_rows(self.out)
        rows[0]["bookId"] = "other"
        with self.assertRaises(ValueError):
            N.write_legacy_navigation(self.out, rows)

    def test_semantic_heading_inverse_rejects_unapproved_source_mutations(self):
        path = "src/pages/reader/likutay-nanach/[part]/[torah].astro"
        template = (ROOT / path).read_text()
        baseline = baseline_bytes(path)
        self.assertEqual(nanach_heading_preimage(template).encode(), baseline)
        mutations = [('guard expansion', 'const semanticH1 = ["1/1"', 'const semanticH1 = ["1/999","1/1"'), ('guard coercion', '.includes(`${part}/${torah}`)', '.includes(`${parseInt(part)}/${parseInt(torah)}`)'), ('hidden heading', '<h1 class="torah-number"', '<h1 hidden class="torah-number"'), ('hidden ancestor', '<div class="reader-header">', '<div class="reader-header" aria-hidden="true">'), ('heading text', '{torahData.title}</h1>', "{'changed'}</h1>"), ('physical loader', 'volume-${part}/chapter-${torahNum}.json', 'volume-${part}/chapter-${torahNum + 1}.json'), ('route lower bound', 'for (let torah = 1; torah <=', 'for (let torah = 0; torah <='), ('English reading field', '{seg.en}</div>', "{'changed'}</div>"), ('pointing fallback', '>{seg.he_nikud || seg.he}</div>', '>{seg.he}</div>'), ('source segment ID', 'id={`seg-${seg.index}`}', 'id={`seg-${seg.index + 1}`}'), ('script version', 'parsha-author-20261018-r1', 'unapproved-script-version'), ('duplicate heading', '<div class="reader-header">', '<div class="reader-header"><h1>Unapproved</h1>'), ('removed inherited heading color', 'margin: 0; color: inherit;', 'margin: 0;'), ('changed inherited heading color', 'color: inherit;', 'color: #000;')]
        for label, old, new in mutations:
            with self.subTest(mutation=label):
                self.assertIn(old, template)
                mutated = template.replace(old, new, 1)
                with self.assertRaises((ValueError, AssertionError)):
                    self.assertEqual(nanach_heading_preimage(mutated).encode(), baseline)
                self.assertEqual(nanach_heading_preimage(template).encode(), baseline)

    def test_template_physical_route_ranges_and_holds(self):
        reader = ROOT / "public/reader"
        for volume, count in N.NANACH_LIMITS.items():
            for section in (1, count):
                path = reader / f"likutay-nanach/volume-{volume}/chapter-{section}.json"
                self.assertEqual(N.human_source_url(path, reader, "/wrong"), f"/reader/likutay-nanach/{volume}/{section}/")
            self.assertIsNone(N.human_source_url(reader / f"likutay-nanach/volume-{volume}/chapter-{count+1}.json", reader, "/wrong"))
        for relative in ("volume-4/chapter-251-topic-12.json", "volume-4/chapter-01.json", "volume-6/chapter-1.json", "tanach/tanach-shmuel.json", "oral-torah/shas.json", "sefer-hamidos/topic-1.json"):
            self.assertIsNone(N.human_source_url(reader / "likutay-nanach" / relative, reader, "/wrong"))
        self.assertEqual(N.human_source_url(reader / "other/chapter-1.json", reader, "/reader/other/1/1"), "/reader/other/1/1")
        # Authenticate the route limits and physical loader against the full template.
        template = (ROOT / "src/pages/reader/likutay-nanach/[part]/[torah].astro").read_text()
        self.assertEqual(nanach_heading_preimage(template).encode(), baseline_bytes("src/pages/reader/likutay-nanach/[part]/[torah].astro"))
        ranges = re.findall(r'for \(let torah = 1; torah <= (\d+); torah\+\+\) \{\s*paths.push\(\{ params: \{ part: "(\d+)"', template)
        self.assertEqual({v: int(n) for n, v in ranges}, N.NANACH_LIMITS)
        self.assertIn("volume-${part}/chapter-${torahNum}.json", template)

    def test_complete_real_source_exports_conserved_except_url_metadata(self):
        old = baseline_producer()
        reader = ROOT / "public/reader"
        paths = [reader / f"likutay-nanach/volume-4/chapter-{n}.json" for n in (16, 26, 5, 7, 25)]
        paths += [reader / "likutay-nanach/volume-4/chapter-251-topic-12.json", reader / "likutay-nanach/volume-1/chapter-1.json", reader / "likutay-nanach/tanach/tanach-shmuel.json"]
        for path in paths:
            with self.subTest(path=path):
                source = path.read_bytes()
                self.assertEqual(source, baseline_bytes(path.relative_to(ROOT).as_posix()))
                data = json.loads(source)
                frozen = copy.deepcopy(data)
                ids = old.infer_ids(path, data)
                self.assertEqual(ids, P.infer_ids(path, data))
                self.assertEqual(old.collect_segments(data), P.collect_segments(data))
                with patch.object(old, "OUT_DIR", self.root / "before"), patch.object(P, "OUT_DIR", self.root / "after"):
                    before_entry = old.write_teaching(path, data, *ids)
                    after_entry = P.write_teaching(path, data, *ids)
                self.assertEqual(data, frozen)
                self.assertEqual(path.read_bytes(), source)
                self.assertIsNotNone(after_entry)
                self.assertEqual({k: v for k, v in before_entry.items() if k != "sourceUrl"}, {k: v for k, v in after_entry.items() if k != "sourceUrl"})
                relative = before_entry["url"].removeprefix("/reader-plain/")
                b, a = self.root / "before" / relative, self.root / "after" / relative
                bj, aj = json.loads((b / "index.json").read_bytes()), json.loads((a / "index.json").read_bytes())
                self.assertEqual({k: v for k, v in bj.items() if k != "sourceUrl"}, {k: v for k, v in aj.items() if k != "sourceUrl"})
                for name in ("index.txt", "index.md"):
                    strip_source = lambda s: re.sub(r"^Source: https://ajew.org[^\n]*$", "SOURCE URL", s, flags=re.M)
                    self.assertEqual(strip_source((b / name).read_text()), strip_source((a / name).read_text()))
                bh, ah = (b / "index.html").read_text(), (a / "index.html").read_text()
                self.assertEqual(bh.split("<main>", 1)[1], ah.split("<main>", 1)[1])
                self.assertEqual(re.findall(r'<nav aria-label="Table of contents">.*?</nav>', bh), re.findall(r'<nav aria-label="Table of contents">.*?</nav>', ah))
                links = Links(ah)
                self.assertTrue(all(h.startswith(("/", "https://", "#")) for h in links.hrefs))
                self.assertIn("https://ajew.org" + after_entry["url"], ah)
                if "chapter-251-topic" in str(path) or "/tanach/" in str(path):
                    self.assertIsNone(aj["sourceUrl"])
                    self.assertNotIn("Human reader page", ah)
                    self.assertIn(f'<link rel="canonical" href="https://ajew.org{after_entry["url"]}">', ah)
                else:
                    self.assertRegex(aj["sourceUrl"], r"^/reader/likutay-nanach/[1-5]/[0-9]+/$")

    def test_unchanged_complete_helpers_and_qualified_hold_logic(self):
        for name in ("reviewed_chayay_exports.py", "reviewed_alim_exports.py", "reviewed_wrapup_exports.py", "qualified_aitzoas362_exports.py"):
            self.assertEqual((HERE / name).read_bytes(), baseline_bytes("scripts/" + name))
        before = ast.parse(baseline_bytes("scripts/build-reader-plain-text.py"))
        after = ast.parse((HERE / "build-reader-plain-text.py").read_text())
        changed = {"html_page", "write_teaching", "write_known_quoted_passages", "main"}
        b = {f.name: ast.dump(f, include_attributes=False) for f in before.body if isinstance(f, ast.FunctionDef) and f.name not in changed}
        a = {f.name: ast.dump(f, include_attributes=False) for f in after.body if isinstance(f, ast.FunctionDef) and f.name not in changed}
        self.assertEqual(b, a)
        # Verify the full qualified dispatch/hold block, not just function names.
        old_s = baseline_bytes("scripts/build-reader-plain-text.py").decode()
        new_s = (HERE / "build-reader-plain-text.py").read_text()
        begin, end = '    aitzoas_edition = None\n', '    entries.sort('
        self.assertEqual(old_s.split(begin)[1].split(end)[0], new_s.split(begin)[1].split(end)[0])

    def test_actual_imported_main_fixture_all_117_and_search_exclusion(self):
        reader = self.root / "reader"
        reader.mkdir()
        for i, path in enumerate(N.load_legacy_paths()):
            part, section = N.LEGACY_RE.fullmatch(path).groups()
            data = {"bookId": "unit-work", "part": part, "section": section, "title": f"Unit section {section}", "segments": [{"index": 7, "he": "אב <br> ג", "en": "unit English"}]}
            (reader / f"section-{i}.json").write_text(json.dumps(data))
        # Registered helper integration: wrap the actual functions, don't replace them.
        with patch.object(P, "READER_DIR", reader), patch.object(P, "OUT_DIR", self.out), patch.object(P._navigation, "write_legacy_navigation", wraps=N.write_legacy_navigation) as writer, patch.object(P._navigation, "harden_section_links", wraps=N.harden_section_links) as harden:
            P.main()
            self.assertEqual(writer.call_count, 1)
            self.assertEqual(harden.call_count, 1)
        catalog = json.loads((self.out / "index.json").read_bytes())
        self.assertEqual(catalog["total"], 117)
        self.assertEqual(len(catalog["entries"]), 117)
        self.assertFalse(any(re.match(r"/reader-plain/\d+/", row["url"]) for row in catalog["entries"]))
        sitemap = (self.out / "sitemap.txt").read_text()
        for literal in N.load_legacy_paths():
            self.assertNotIn("https://ajew.org" + literal + "/", sitemap)
            self.assertEqual(Links((self.out / literal.removeprefix("/reader-plain/") / "index.html").read_text()).robots, ["noindex,follow"])
        for target in [self.out / "index.html", self.out / "unit-work/index.html"] + [self.out / row["url"].removeprefix("/reader-plain/") / "index.html" for row in catalog["entries"]]:
            for href in Links(target.read_text()).hrefs:
                self.assertTrue(href.startswith(("/", "https://", "#")), (target, href))
        book_html = (self.out / "unit-work/index.html").read_text()
        self.assertIn('/reader-plain/unit-work/1/64/', book_html)
        self.assertIn('/reader-plain/unit-work/full.txt', book_html)
        self.assertFalse((self.out / "1/999/index.html").exists())


    def test_catalog_proven_owner_matches_selected_artifact_or_is_withheld(self):
        source = "/reader/likutay-nanach/4/1/"
        url = "/reader-plain/likutay-nanach/volume-4/1/"
        directory = self.out / "likutay-nanach/volume-4/1"
        directory.mkdir(parents=True)
        target = directory / "index.json"
        raw = json.dumps({"sourceUrl": None, "title": "Other actual selected teaching", "segments": [{"he": "EXACT"}]}).encode()
        target.write_bytes(raw)
        rows = [{"sourceUrl": source, "url": url, "title": "Original claimant", "segments": 211},
                {"sourceUrl": None, "url": url},
                {"sourceUrl": "/reader/other/1/2", "url": "/reader-plain/other/1/2/"}]
        frozen = copy.deepcopy(rows)
        held = N.reconcile_catalog_sources(self.out, rows)
        self.assertEqual([item["ordinal"] for item in held], [0])
        self.assertIsNone(rows[0]["sourceUrl"])
        self.assertEqual({k: v for k, v in rows[0].items() if k != "sourceUrl"}, {k: v for k, v in frozen[0].items() if k != "sourceUrl"})
        self.assertEqual(rows[1:], frozen[1:])
        self.assertEqual(target.read_bytes(), raw)
        target.write_text(json.dumps({"sourceUrl": source, "segments": []}))
        fresh = copy.deepcopy(frozen)
        self.assertEqual(N.reconcile_catalog_sources(self.out, fresh), [])
        self.assertEqual(fresh, frozen)
        target.write_text(json.dumps({"sourceUrl": "/reader/likutay-nanach/4/2/", "segments": []}))
        mismatch = copy.deepcopy(frozen)
        N.reconcile_catalog_sources(self.out, mismatch)
        self.assertIsNone(mismatch[0]["sourceUrl"], "never borrow the winning different owner's URL")

    def test_catalog_owner_prerequisites_fail_before_any_row_mutation(self):
        url = "/reader-plain/likutay-nanach/volume-4/1/"
        directory = self.out / "likutay-nanach/volume-4/1"
        directory.mkdir(parents=True)
        target = directory / "index.json"
        rows = [{"sourceUrl": "/reader/likutay-nanach/4/1/", "url": url},
                {"sourceUrl": "/reader/likutay-nanach/4/2/", "url": "/reader-plain/likutay-nanach/volume-4/2/"}]
        frozen = copy.deepcopy(rows)
        target.write_text(json.dumps({"sourceUrl": None}))
        with self.assertRaises(FileNotFoundError):
            N.reconcile_catalog_sources(self.out, rows)
        self.assertEqual(rows, frozen)
        for bad in ["{broken", "[]", "{}"]:
            target.write_text(bad)
            with self.assertRaises((ValueError, json.JSONDecodeError)):
                N.reconcile_catalog_sources(self.out, rows[:1])
            self.assertEqual(rows, frozen)
        target.write_text(json.dumps({"sourceUrl": rows[0]["sourceUrl"]}))
        positive = rows[:1]
        self.assertEqual(N.reconcile_catalog_sources(self.out, positive), [])
        self.assertEqual(positive, frozen[:1])


if __name__ == "__main__":
    unittest.main(verbosity=2)
