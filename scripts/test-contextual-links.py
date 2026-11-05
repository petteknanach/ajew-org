#!/usr/bin/env python3
"""Synthetic fixtures only: these are NOT production GSC observations."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("suggest", Path(__file__).with_name("suggest-contextual-links.py"))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
HEADER = "Page,Query,Clicks,Impressions,Position\n"
ROW = "https://ajew.org/library/,library,2,30,8\n"
HTML = "<main><p>Explore our library today.</p></main>"


class SyntheticOnly(unittest.TestCase):
    def fixture(self, html=HTML, csv=HEADER + ROW, route="about"):
        # Actual byte streams in anonymous RAM descriptors; no fixture/site writes.
        files = {"gsc.csv": csv.encode(), route + "/index.html": html.encode()}
        descriptors = []
        opened = []
        def opening(path, flags, mode=0o777, *, dir_fd=None):
            path = str(path)
            self.assertFalse(flags & (os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_TRUNC))
            opened.append(path)
            if path == "site" or path in [r[1:] for r in m.ROUTES]:
                if path != "site" and path != route:
                    raise FileNotFoundError(path)
                return 900 if path == "site" else 901
            key = route + "/index.html" if path == "index.html" and dir_fd == 901 else path
            if key not in files:
                raise AssertionError("unexpected file/corpus access: " + path)
            fd = os.memfd_create("synthetic-contextual-link-test")
            os.write(fd, files[key])
            os.lseek(fd, 0, os.SEEK_SET)
            descriptors.append(fd)
            return fd
        real_close = os.close
        def closing(fd):
            if fd not in (900, 901):
                real_close(fd)
        return patch.object(m.os, "open", side_effect=opening), patch.object(m.os, "close", side_effect=closing), opened

    def run_suggest(self, html=HTML, csv=HEADER + ROW, **kwargs):
        a, b, _ = self.fixture(html, csv)
        with a, b:
            return m.suggest("gsc.csv", "site", **kwargs)

    def test_01_literal_natural_anchor_and_metrics(self):
        result = self.run_suggest("<p>Our LIBRARY welcomes you.</p>")
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["naturalanchor"], "LIBRARY")
        self.assertEqual((result[0]["impressions"], result[0]["clicks"], result[0]["position"]), (30, 2, 8))
        self.assertIn("Manual", result[0]["requiredReview"])

    def test_02_no_variants_or_partial_words(self):
        for text in ("libraries", "libraryish", "sublibrary", "Library catalogue"):
            query = "library catalog" if text == "Library catalogue" else "library"
            with self.subTest(text=text):
                self.assertEqual(self.run_suggest("<p>" + text + "</p>", HEADER + ROW.replace(",library,", "," + query + ",")), [])

    def test_03_excluded_elements(self):
        for tag in ("a", "h2", "nav", "script", "style", "blockquote", "q", "pre"):
            with self.subTest(tag=tag):
                self.assertEqual(self.run_suggest(f"<p><{tag}>library</{tag}></p>"), [])

    def test_04_protected_ancestors_and_attributes(self):
        for attr in ('class="source-text"', 'class="translation-body"', 'class="prayer"', 'data-teaching="true"', 'data-translation="true"', 'lang="he"', 'id="reader-content"'):
            with self.subTest(attr=attr):
                self.assertEqual(self.run_suggest(f"<section {attr}><p>library</p></section>"), [])

    def test_05_sacred_formula_whole_paragraph(self):
        for formula in ("Na Nach Nachma Nachman MayUman", "Na Nach Nachma Nachman Meuman", "Na Nach Nachma Nachman Me'uman", "נ נח נחמ נחמן מאומן", "נַ נַחְ נַחְמָ נַחְמָן מֵאוּמָן"):
            with self.subTest(formula=formula):
                self.assertEqual(self.run_suggest(f"<p>library {formula}</p>"), [])

    def test_06_excluded_text_cannot_bridge_anchor(self):
        self.assertEqual(self.run_suggest("<p>lib<a>other</a>rary</p>"), [])

    def test_07_existing_absolute_and_relative_links(self):
        for href in ("https://ajew.org/library/", "/library", "../library/", "/library/#section", "/library/?view=all"):
            with self.subTest(href=href):
                self.assertEqual(self.run_suggest(f'<a href="{href}">elsewhere</a>' + HTML), [])

    def test_08_self_target(self):
        self.assertEqual(self.run_suggest(csv=HEADER + ROW.replace("/library/", "/about/")), [])

    def test_09_target_once_and_one_per_paragraph(self):
        data = HEADER + ROW + "https://ajew.org/books,books,1,20,9\n"
        result = self.run_suggest("<p>library books</p><p>library books</p><p>library</p>", data)
        self.assertEqual([r["targetURL"] for r in result], ["https://ajew.org/library/", "https://ajew.org/books"])

    def test_10_duplicate_rows(self):
        self.assertEqual(len(self.run_suggest(csv=HEADER + ROW + ROW)), 1)
        with self.assertRaisesRegex(ValueError, "conflicting duplicate"):
            self.run_suggest(csv=HEADER + ROW + ROW.replace(",30,", ",31,"))

    def test_11_invalid_urls_refused(self):
        for url in ("http://ajew.org/x", "https://other.org/x", "https://ajew.org.evil/x", "https://ajew.org:443/x", "https://u@ajew.org/x", "https://ajew.org/x?q=1", "https://ajew.org/x#y", "https://ajew.org/a b", "https://ajew.org/%zz", "https://ajew.org/%2e%2e/x", "https://ajew.org/\\evil"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                self.run_suggest(csv=HEADER + ROW.replace("https://ajew.org/library/", url))

    def test_12_invalid_metrics_refused(self):
        for metric in ("2.5,30,8", "-1,30,8", "31,30,8", "2,30,nan", "2,30,inf", "2,30,0", "2,xx,8"):
            with self.subTest(metric=metric), self.assertRaises(ValueError):
                self.run_suggest(csv=HEADER + "https://ajew.org/library,library," + metric + "\n")

    def test_13_malformed_csv_and_empty_query(self):
        for csv in ("Pages,Query,Clicks,Impressions,Position\n", HEADER + "https://ajew.org/library,,2,30,8\n", HEADER + ROW.rstrip() + ",extra\n", HEADER + "https://ajew.org/library,library,2\n"):
            with self.subTest(csv=csv), self.assertRaises(ValueError):
                self.run_suggest(csv=csv)

    def test_14_escaping_and_inline_smallcaps(self):
        data = HEADER + 'https://ajew.org/library,books & music,2,30,8\n'
        result = self.run_suggest('<p>Read <span class="smallcaps">Books &amp; Music</span> &lt;today&gt;.</p>', data)
        self.assertEqual(result[0]["naturalanchor"], "Books & Music")
        self.assertIn("<today>", result[0]["paragraphcontext"])
        self.assertEqual(json.loads(json.dumps(result)), result)

    def test_15_empty_and_below_threshold(self):
        for csv in (HEADER, HEADER + ROW.replace(",30,", ",9,"), HEADER + ROW.replace(",8\n", ",21\n")):
            self.assertEqual(self.run_suggest(csv=csv), [])

    def test_16_small_caps_on_counts(self):
        csv = HEADER + "".join(f"https://ajew.org/t{i},term{i},1,30,8\n" for i in range(5))
        html = "".join(f"<p>term{i}</p>" for i in range(5))
        self.assertEqual(len(self.run_suggest(html, csv)), 3)
        self.assertEqual(len(self.run_suggest(html, csv, maximum=1)), 1)

    def test_17_no_writes_or_corpus_access(self):
        a, b, opened = self.fixture()
        with a, b, patch("builtins.open", side_effect=AssertionError("unexpected open")), patch.object(m.os, "listdir", side_effect=AssertionError("corpus scan")), patch.object(m.os, "walk", side_effect=AssertionError("corpus walk")):
            self.assertEqual(len(m.suggest("gsc.csv", "site")), 1)
        self.assertEqual(set(opened), {"gsc.csv", "site", "index.html", *[r[1:] for r in m.ROUTES]})

    def test_18_real_byte_bounds(self):
        for name, limit in (("CSV_LIMIT", len((HEADER + ROW).encode()) - 1), ("HTML_LIMIT", len(HTML.encode()) - 1)):
            with self.subTest(name=name), patch.object(m, name, limit), self.assertRaisesRegex(ValueError, "byte limit"):
                self.run_suggest()

    def test_19_cli_positive_json_stdout(self):
        a, b, _ = self.fixture()
        out, err = io.StringIO(), io.StringIO()
        with a, b, contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = m.main(["--gsc", "gsc.csv", "--site-root", "site"])
        self.assertEqual(code, 0)
        self.assertEqual(len(json.loads(out.getvalue())), 1)
        self.assertEqual(err.getvalue(), "")

    def test_20_cli_refusal_no_partial_json(self):
        for args, csv in (([], HEADER + ROW.replace(",8\n", ",nan\n")), (["--max-links", "0"], HEADER + ROW), (["--max-links", "4"], HEADER + ROW)):
            a, b, _ = self.fixture(csv=csv)
            out, err = io.StringIO(), io.StringIO()
            with a, b, contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
                code = m.main(["--gsc", "gsc.csv", "--site-root", "site"] + args)
            self.assertEqual(code, 2)
            self.assertEqual(out.getvalue(), "")
            self.assertTrue(err.getvalue())


    def test_21_operator_queries_excluded(self):
        for query in ("site:ajew.org", "inurl:library", "intitle:library", "filetype:pdf"):
            with self.subTest(query=query):
                data = HEADER + "https://ajew.org/library/," + query + ",0,30,8\n"
                self.assertEqual(self.run_suggest("<p>" + query + "</p>", data), [])

    def test_22_literal_target_url_preserved(self):
        result = self.run_suggest()
        self.assertEqual(result[0]["targetURL"], "https://ajew.org/library/")
        self.assertEqual(result[0]["sourceURL"], "https://ajew.org/about/")

    def test_23_aliases_still_target_once(self):
        data = HEADER + ROW + "https://ajew.org/library,archive,2,30,8\n"
        result = self.run_suggest("<p>library</p><p>archive</p>", data)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["targetURL"], "https://ajew.org/library/")


if __name__ == "__main__":
    print("SYNTHETIC FIXTURES ONLY — NOT PRODUCTION GSC DATA", flush=True)
    unittest.main(verbosity=2)
