#!/usr/bin/env python3
"""Publish canonical, indexable HTML search sitemaps after Astro builds.

Plain/raw export manifests remain accessible to AI tools and researchers, but are
not submitted as primary search children. No source text or access rules change.
"""
from __future__ import annotations

import json
import html
from datetime import date
from pathlib import Path
import re
from collections import Counter
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

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
    return decoded.startswith("/") and not any(p in {".", ".."} for p in decoded.split("/")) and "\x00" not in decoded


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
        prepared.append((child, tree))
    if not seen:
        raise RuntimeError("Canonical search sitemap would be empty")
    # Parse/admit every child before writing any, so malformed XML fails closed.
    for child, tree in prepared:
        tree.write(child, encoding="utf-8", xml_declaration=True)
    index = sitemap_index([f"{SITE}/{p.name}" for p in children])
    for name in ("sitemap-index.xml", "sitemap.xml"):
        (dist / name).write_text(index, encoding="utf-8")
    receipt = {"scanned": scanned, "retained": len(seen), "excluded": len(exclusions),
               "reasons": dict(Counter(r["reason"] for r in exclusions)), "exclusions": exclusions}
    (dist / "search-sitemap-admission.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
    return receipt

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
CATALOG = ROOT / "public" / "reader-plain" / "index.json"
SITE = "https://ajew.org"


def xml_urlset(urls: list[str], priority: str = "0.55") -> str:
    today = date.today().isoformat()
    rows = []
    for url in urls:
        rows.append(
            f"  <url><loc>{html.escape(url)}</loc><lastmod>{today}</lastmod>"
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
        raw_urls.append(f"{SITE}/reader/{book}/{part}/{torah}/raw.txt")
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

    receipt = prune_search_sitemaps(DIST)
    print(f"SEO sitemaps: preserved {len(raw_urls)} raw manifest URLs; "
          f"search retained {receipt['retained']}/{receipt['scanned']}, "
          f"excluded {receipt['excluded']} ({receipt['reasons']})")


if __name__ == "__main__":
    main()
