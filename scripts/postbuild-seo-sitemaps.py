#!/usr/bin/env python3
"""Publish canonical, indexable HTML search sitemaps after Astro builds.

Plain/raw export manifests remain accessible to AI tools and researchers, but are
not submitted as primary search children. No source text or access rules change.
"""
from __future__ import annotations

import json
import html
import hashlib
import os
import tempfile
from contextlib import ExitStack
from datetime import date
from pathlib import Path
import re
from collections import Counter
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

from reader_soft404_artifacts import prune_reader_errors
from plain_seo_canonicals import repair_plain_canonicals, raw_section_url

NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
ET.register_namespace("", NS)
# These Astro artifacts are shadowed by the independently served blog runtime.
RUNTIME_PATHS = {"/blog/", "/blog/archive/"}


def valid_search_location(url: str) -> bool:
    if not url or any(c.isspace() or ord(c) > 127 for c in url):
        return False
    if re.search(r"%(?![0-9A-Fa-f]{2})", url) or "\\" in url:
        return False
    try:
        parsed = urlsplit(url)
    except ValueError:
        return False
    if parsed.scheme != "https" or parsed.netloc != "ajew.org" or parsed.query or parsed.fragment:
        return False
    decoded = unquote(parsed.path)
    return (decoded.startswith("/") and "\\" not in decoded
            and not any(p in {".", ".."} for p in decoded.split("/"))
            and not any(ord(c) < 32 or ord(c) == 127 for c in decoded))


def html_artifact(dist: Path, url: str) -> Path | None:
    root = dist.resolve()
    candidate = root / unquote(urlsplit(url).path).lstrip("/")
    # Same order as nginx's general try_files: exact, .html, directory index.
    for path in (candidate, Path(str(candidate) + ".html"), candidate / "index.html"):
        path = path.resolve()
        if path.is_relative_to(root) and path.is_file() and path.suffix.lower() == ".html":
            return path
    return None


class SearchMetadata(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.canonicals: list[str] = []
        self.noindex = False
        self.head_ended = False

    def handle_starttag(self, tag, attrs):
        if self.head_ended:
            return
        attrs = {k.lower(): v or "" for k, v in attrs}
        if tag == "link" and "canonical" in attrs.get("rel", "").lower().split():
            self.canonicals.append(attrs.get("href", ""))
        if tag == "meta" and attrs.get("name", "").lower() in {"robots", "googlebot"}:
            tokens = re.split(r"[\s,]+", attrs.get("content", "").lower())
            self.noindex |= "noindex" in tokens or "none" in tokens

    def handle_endtag(self, tag):
        if tag == "head":
            self.head_ended = True


def search_admission(dist: Path, url: str) -> str | None:
    if not valid_search_location(url):
        return "invalid_location"
    if urlsplit(url).path in RUNTIME_PATHS:
        return "external_runtime"
    path = html_artifact(dist, url)
    if path is None:
        return "missing_html"
    metadata = SearchMetadata()
    # Inspect the head only, not the Torah body. Bound malformed/missing heads.
    with path.open(encoding="utf-8") as f:
        for _ in range(64):
            chunk = f.read(16384)
            if not chunk:
                break
            metadata.feed(chunk)
            if metadata.head_ended:
                break
    if not metadata.head_ended:
        return "missing_head"
    if metadata.noindex:
        return "noindex"
    if not metadata.canonicals:
        return "missing_canonical"
    if metadata.canonicals != [url]:
        return "noncanonical"
    return None


ADMISSION_RECEIPT = "search-sitemap-admission.json"


def sync_directory(dist: Path) -> None:
    fd = os.open(dist, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def invalidate_search_admission(dist: Path) -> None:
    # Absence is the durable invalid-generation signal, never a success receipt.
    (dist / ADMISSION_RECEIPT).unlink(missing_ok=True)
    sync_directory(dist)


def commit_search_generation(dist: Path, outputs: dict[str, bytes], receipt: dict) -> None:
    """Commit a single-writer, non-served build; NOT a live multi-file rename.

    Stage and fsync ALL bytes before mutating targets. Invalidate the previous
    receipt durably before the first promotion, then atomically replace each
    file. Commit the hash-bound receipt LAST, after the graph is durable. A
    staging failure leaves the old search set untouched; a promotion/cleanup
    failure leaves NO admission receipt and propagates to the build caller.
    Interrupted promotion likewise has no receipt. Never consume/publish a
    failed build or a graph without this receipt and its exact file hashes.
    Existing atomic release publication remains the live-reader boundary.
    """
    receipt['generation'] = {
        'protocol': 'sha256-files-receipt-last-v1',
        'files': {name: hashlib.sha256(body).hexdigest() for name, body in outputs.items()},
    }
    payloads = dict(outputs)
    payloads[ADMISSION_RECEIPT] = json.dumps(receipt, ensure_ascii=False, indent=2).encode('utf-8')
    promoting = False
    try:
        with ExitStack() as cleanup:
            staged = {}
            for name, body in payloads.items():
                # mkstemp's exact owned path is the only cleanup authority;
                # never glob/remove other runs' or foreign temporary files.
                fd, tmp = tempfile.mkstemp(prefix=f'.{name}.search-sitemaps-', dir=dist)
                path = Path(tmp)
                cleanup.callback(path.unlink, missing_ok=True)
                with os.fdopen(fd, 'wb') as stream:
                    os.fchmod(stream.fileno(), 0o644)
                    stream.write(body)
                    stream.flush()
                    os.fsync(stream.fileno())
                staged[name] = path
            promoting = True
            invalidate_search_admission(dist)
            for name in outputs:
                os.replace(staged[name], dist / name)
            sync_directory(dist)
            os.replace(staged[ADMISSION_RECEIPT], dist / ADMISSION_RECEIPT)
            sync_directory(dist)
    except BaseException:
        if promoting:
            # Includes a failed receipt rename, fsync, or owned-temp cleanup.
            # Never roll back by copying partially written destinations.
            invalidate_search_admission(dist)
        raise


def prune_search_sitemaps(dist: Path) -> dict:
    children = sorted(p for p in dist.iterdir() if p.is_file() and re.fullmatch(r"sitemap-\d+\.xml", p.name))
    if not children:
        raise RuntimeError("No numbered Astro search sitemap children")
    if [int(p.stem.split("-")[1]) for p in children] != list(range(len(children))):
        # Numeric ordering matters once Astro emits ten or more children.
        children.sort(key=lambda p: int(p.stem.split("-")[1]))
        if [int(p.stem.split("-")[1]) for p in children] != list(range(len(children))):
            raise RuntimeError("Missing numbered Astro search sitemap child")
    prepared = []
    exclusions = []
    seen = set()
    admitted_urls = []
    scanned = 0
    for child in children:
        tree = ET.parse(child)
        root = tree.getroot()
        if root.tag != f"{{{NS}}}urlset":
            raise RuntimeError(f"Not a sitemap URL set: {child.name}")
        for row in list(root):
            if row.tag != f"{{{NS}}}url":
                raise RuntimeError(f"Unexpected sitemap row: {child.name}")
            locs = row.findall(f"{{{NS}}}loc")
            if len(locs) != 1 or not locs[0].text:
                raise RuntimeError(f"Missing/ambiguous sitemap location: {child.name}")
            url = locs[0].text
            scanned += 1
            reason = search_admission(dist, url)
            if reason is None and url in seen:
                reason = "duplicate"
            if reason:
                root.remove(row)
                exclusions.append({"url": url, "child": child.name, "reason": reason})
            else:
                seen.add(url)
                admitted_urls.append(url)
        prepared.append((child, tree))
    if not seen:
        raise RuntimeError("Canonical search sitemap would be empty")
    # Text is a representation of the same admitted canonical HTML graph, not
    # an XML redirect, raw-export manifest, or independent source of URLs.
    text = text_sitemap(admitted_urls)
    # Serialize every child and representation before even staging output.
    outputs = {child.name: ET.tostring(tree.getroot(), encoding='utf-8', xml_declaration=True)
               for child, tree in prepared}
    index = sitemap_index([f"{SITE}/{p.name}" for p in children]).encode('utf-8')
    for name in ("sitemap-index.xml", "sitemap.xml"):
        outputs[name] = index
    outputs['sitemap.txt'] = text.encode('utf-8')
    receipt = {"scanned": scanned, "retained": len(seen), "excluded": len(exclusions),
               "reasons": dict(Counter(r["reason"] for r in exclusions)), "exclusions": exclusions}
    commit_search_generation(dist, outputs, receipt)
    return receipt

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
CATALOG = ROOT / "public" / "reader-plain" / "index.json"
SITE = "https://ajew.org"


def text_sitemap(urls: list[str]) -> str:
    if not urls or len(urls) > 50000 or len(set(urls)) != len(urls):
        raise RuntimeError("Text sitemap requires 1–50,000 unique canonical URLs")
    if not all(valid_search_location(url) for url in urls):
        raise RuntimeError("Invalid text sitemap location")
    text = "\n".join(urls) + "\n"
    if len(text.encode("utf-8")) > 50 * 1024 * 1024:
        raise RuntimeError("Text sitemap exceeds 50 MB")
    return text


def xml_urlset(urls: list[str], priority: str = "0.55") -> str:
    rows = []
    for url in urls:
        rows.append(
            f"  <url><loc>{html.escape(url)}</loc>"
            f"<changefreq>monthly</changefreq><priority>{priority}</priority></url>"
        )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(rows)
        + "\n</urlset>\n"
    )


def sitemap_index(urls: list[str]) -> str:
    today = date.today().isoformat()
    rows = [f"  <sitemap><loc>{html.escape(u)}</loc><lastmod>{today}</lastmod></sitemap>" for u in urls]
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(rows)
        + "\n</sitemapindex>\n"
    )


def main() -> None:
    DIST.mkdir(exist_ok=True)
    # Astro or an earlier postbuild step may already have changed dist. A prior
    # admission is not authority for this build, even if failure precedes prune.
    invalidate_search_admission(DIST)
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    entries = data.get("entries", [])

    raw_urls: list[str] = []
    books: set[str] = set()
    for e in entries:
        book = str(e.get("bookId", "")).strip()
        part = str(e.get("part", "")).strip()
        torah = str(e.get("torah", "")).strip()
        if not (book and part and torah):
            continue
        books.add(book)
        raw_urls.append(raw_section_url(DIST, e))
    raw_urls.extend(f"{SITE}/reader/{book}/full.txt" for book in sorted(books))
    raw_urls.extend(f"{SITE}/reader/{book}/full.md" for book in sorted(books))
    raw_urls.extend([
        f"{SITE}/reader-plain/quoted-passages/adir-beracha/",
        f"{SITE}/reader-plain/quoted-passages/adir-beracha/index.txt",
        f"{SITE}/reader-plain/quoted-passages/adir-beracha/index.md",
        f"{SITE}/plain-text/",
        f"{SITE}/ai.txt",
    ])
    raw_urls = list(dict.fromkeys(raw_urls))
    (DIST / "sitemap-reader-raw.xml").write_text(xml_urlset(raw_urls, "0.60"), encoding="utf-8")

    # Never publish empty Reader error wrappers as successful HTML pages.
    # This runs only in the completed, non-served build, before XML admission.
    # Any unsafe-path/drift exception aborts the build and must not be swallowed.
    errors = prune_reader_errors(DIST)
    public_errors = {key: value for key, value in errors.items() if key != "root"}
    (DIST / "reader-soft404-removals.json").write_text(
        json.dumps(public_errors, ensure_ascii=False, indent=2), encoding="utf-8")
    plain_repairs = repair_plain_canonicals(DIST, entries)
    (DIST / "plain-canonical-repairs.json").write_text(
        json.dumps(plain_repairs, ensure_ascii=False, indent=2), encoding="utf-8")
    receipt = prune_search_sitemaps(DIST)
    print(f"Reader error HTML: removed {errors['removed_count']} empty fallbacks; "
          f"all other source and export artifacts retained")
    print(f"SEO sitemaps: preserved {len(raw_urls)} raw manifest URLs; "
          f"search retained {receipt['retained']}/{receipt['scanned']}, "
          f"excluded {receipt['excluded']} ({receipt['reasons']})")


if __name__ == "__main__":
    main()
