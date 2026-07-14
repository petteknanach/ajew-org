#!/usr/bin/env python3
"""Post-build SEO sitemap wiring for static reader raw/plain exports.

Astro's sitemap integration generates dist/sitemap-index.xml only for Astro routes.
The reader-plain generator also creates crawlable TXT/MD/JSON/static HTML exports,
and nginx exposes raw aliases under /reader/<book>/<part>/<section>/raw.txt.
This script runs after astro build so Google/Bing can discover those static exports
from first-class sitemap files, not only robots.txt comments or JS panels.
"""
from __future__ import annotations

import json
import html
from datetime import date
from pathlib import Path
import re

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

    idx_path = DIST / "sitemap-index.xml"
    existing: list[str] = []
    if idx_path.exists():
        text = idx_path.read_text(encoding="utf-8", errors="replace")
        existing = re.findall(r"<loc>(.*?)</loc>", text)
    needed = [
        f"{SITE}/reader-plain/sitemap.xml",
        f"{SITE}/sitemap-reader-raw.xml",
    ]
    merged = list(dict.fromkeys(existing + needed))
    idx_path.write_text(sitemap_index(merged), encoding="utf-8")
    print(f"SEO sitemaps: wrote {len(raw_urls)} raw URLs and {len(merged)} sitemap-index entries")


if __name__ == "__main__":
    main()
