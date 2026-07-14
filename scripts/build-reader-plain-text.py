#!/usr/bin/env python3
"""Build crawlable plain-text/markdown/html/raw JSON views for every reader teaching.

Outputs under public/reader-plain/ so static hosts can serve AI/research-friendly text
without relying on the JavaScript reader UI.
"""
from __future__ import annotations

import html
import json
import re
import shutil
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
READER_DIR = ROOT / "public" / "reader"
OUT_DIR = ROOT / "public" / "reader-plain"

SKIP_DIRS = {"blog-commentary", "parsha-packets", "suno-songs"}
HE_KEYS = ("he", "he_nikud", "commentary_he", "verse", "text")
EN_KEYS = ("en", "commentary_en", "translation", "english")


def strip_html(s: Any) -> str:
    if s is None:
        return ""
    s = str(s)
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"</p\s*>", "\n\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def first_text(obj: dict[str, Any], keys: tuple[str, ...]) -> str:
    for k in keys:
        v = obj.get(k)
        if v not in (None, ""):
            return strip_html(v)
    return ""


def slug_value(v: Any, default: str = "1") -> str:
    if v is None or v == "":
        return default
    return str(v).strip().strip("/") or default


def infer_ids(path: Path, data: dict[str, Any]) -> tuple[str, str, str]:
    rel = path.relative_to(READER_DIR)
    parts = rel.parts
    book = slug_value(data.get("bookId") or data.get("book") or parts[0])
    part = slug_value(data.get("part"), "1")
    torah = slug_value(data.get("torah") or data.get("section") or data.get("topic") or data.get("chapter"), "")

    # Infer from common filenames when top-level metadata is absent.
    stem = path.stem
    m = re.search(r"(?:section|topic|torah|halacha|chapter|letter|siman|mishna)-([\w\-]+)$", stem)
    if not torah and m:
        torah = m.group(1)
    if not torah and stem not in {"index", "catalog"}:
        torah = stem

    for p in parts[1:-1]:
        m = re.match(r"(?:part|volume)-(\d+)$", p)
        if m and data.get("part") in (None, ""):
            part = m.group(1)
            break

    return book, part, torah or "1"


def title_for(data: dict[str, Any], fallback: str) -> str:
    return strip_html(data.get("title") or data.get("hebrewTitle") or data.get("h") or data.get("t") or fallback)


def collect_segments(data: dict[str, Any]) -> list[dict[str, Any]]:
    segs = data.get("segments")
    if not isinstance(segs, list):
        return []
    out = []
    for i, seg in enumerate(segs, 1):
        if not isinstance(seg, dict):
            continue
        idx = seg.get("index") or seg.get("n") or i
        he = first_text(seg, HE_KEYS)
        en = first_text(seg, EN_KEYS)
        if he or en:
            out.append({"index": idx, "he": he, "en": en})
    return out


def html_page(title: str, hebrew_title: str, source_url: str, txt_url: str, md_url: str, raw_url: str, segments: list[dict[str, Any]]) -> str:
    rows = []
    for seg in segments:
        idx = html.escape(str(seg["index"]))
        he = html.escape(seg.get("he") or "")
        en = html.escape(seg.get("en") or "")
        rows.append(f"""
<section id="segment-{idx}" class="segment">
  <h2>Segment {idx}</h2>
  {f'<div class="he" dir="rtl" lang="he">{he}</div>' if he else ''}
  {f'<div class="en" dir="ltr" lang="en">{en}</div>' if en else ''}
</section>""")
    toc = "\n".join(f'<li><a href="#segment-{html.escape(str(s["index"]))}">Segment {html.escape(str(s["index"]))}</a></li>' for s in segments)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="robots" content="index,follow">
<link rel="canonical" href="{html.escape(source_url)}">
<link rel="alternate" type="text/plain" href="{html.escape(txt_url)}">
<link rel="alternate" type="text/markdown" href="{html.escape(md_url)}">
<link rel="alternate" type="application/json" href="{html.escape(raw_url)}">
<style>
body{{font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;line-height:1.65;max-width:980px;margin:0 auto;padding:24px;color:#171717;background:#fff}}
header{{border-bottom:1px solid #ddd;margin-bottom:24px;padding-bottom:16px}}
nav a{{margin-right:12px}} .he{{font-size:1.25rem;text-align:right;margin:12px 0;white-space:pre-wrap}} .en{{font-size:1.05rem;margin:12px 0;white-space:pre-wrap}}
.segment{{border-bottom:1px solid #eee;padding:18px 0}} h2{{font-size:1rem;color:#555}} .heb-title{{font-size:1.4rem;text-align:right}}
</style>
</head>
<body>
<header>
  <p><a href="/reader-plain/">Plain reader index</a> · <a href="{html.escape(source_url)}">Human reader page</a> · <a href="{html.escape(txt_url)}">TXT</a> · <a href="{html.escape(md_url)}">Markdown</a> · <a href="{html.escape(raw_url)}">Raw JSON</a></p>
  <h1>{html.escape(title)}</h1>
  {f'<div class="heb-title" dir="rtl" lang="he">{html.escape(hebrew_title)}</div>' if hebrew_title else ''}
</header>
<nav aria-label="Table of contents"><ol>{toc}</ol></nav>
<main>
{''.join(rows)}
</main>
</body>
</html>
"""


def write_teaching(path: Path, data: dict[str, Any], book: str, part: str, torah: str) -> dict[str, Any] | None:
    segments = collect_segments(data)
    if not segments:
        return None
    title = title_for(data, f"{book} {part}/{torah}")
    hebrew_title = strip_html(data.get("hebrewTitle") or data.get("h") or "")
    source_url = f"/reader/{book}/{part}/{torah}"
    out = OUT_DIR / book / part / torah
    out.mkdir(parents=True, exist_ok=True)

    txt_lines = [title]
    if hebrew_title:
        txt_lines.append(hebrew_title)
    txt_lines += [f"Source: https://ajew.org{source_url}", ""]
    md_lines = [f"# {title}"]
    if hebrew_title:
        md_lines.append(f"\n<div dir=\"rtl\">{hebrew_title}</div>")
    md_lines.append(f"\nSource: https://ajew.org{source_url}\n")
    for seg in segments:
        idx = seg["index"]
        txt_lines.append(f"Segment {idx}")
        md_lines.append(f"\n## Segment {idx}\n")
        if seg.get("he"):
            txt_lines += ["HE:", seg["he"], ""]
            md_lines.append(f"<div dir=\"rtl\" lang=\"he\">\n\n{seg['he']}\n\n</div>\n")
        if seg.get("en"):
            txt_lines += ["EN:", seg["en"], ""]
            md_lines.append(f"{seg['en']}\n")

    (out / "index.txt").write_text("\n".join(txt_lines).strip() + "\n", encoding="utf-8")
    (out / "index.md").write_text("\n".join(md_lines).strip() + "\n", encoding="utf-8")
    raw = {
        "bookId": book,
        "part": part,
        "torah": torah,
        "title": title,
        "hebrewTitle": hebrew_title,
        "sourceUrl": source_url,
        "plainUrl": f"/reader-plain/{book}/{part}/{torah}/",
        "segments": segments,
    }
    (out / "index.json").write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "index.html").write_text(html_page(title, hebrew_title, source_url, "index.txt", "index.md", "index.json", segments), encoding="utf-8")
    return {"bookId": book, "part": part, "torah": torah, "title": title, "hebrewTitle": hebrew_title, "url": f"/reader-plain/{book}/{part}/{torah}/", "sourceUrl": source_url, "segments": len(segments)}


def main() -> None:
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)

    entries: list[dict[str, Any]] = []
    for path in sorted(READER_DIR.rglob("*.json")):
        rel = path.relative_to(READER_DIR)
        if rel.parts and rel.parts[0] in SKIP_DIRS:
            continue
        if path.name in {"index.json", "catalog.json"}:
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(data, dict) or not isinstance(data.get("segments"), list):
            continue
        book, part, torah = infer_ids(path, data)
        entry = write_teaching(path, data, book, part, torah)
        if entry:
            entries.append(entry)

    entries.sort(key=lambda e: (e["bookId"], str(e["part"]), str(e["torah"])))
    (OUT_DIR / "index.json").write_text(json.dumps({"generatedFor": "ajew.org", "total": len(entries), "entries": entries}, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT_DIR / "sitemap.txt").write_text("\n".join(f"https://ajew.org{e['url']}" for e in entries) + "\n", encoding="utf-8")

    by_book: dict[str, list[dict[str, Any]]] = {}
    for e in entries:
        by_book.setdefault(e["bookId"], []).append(e)
    book_links = []
    for book, rows in sorted(by_book.items()):
        bdir = OUT_DIR / book
        bdir.mkdir(exist_ok=True)
        items = "\n".join(f'<li><a href="{html.escape(r["url"].split(f"/reader-plain/{book}/",1)[1])}">{html.escape(r["title"])}</a> <small>({r["segments"]} segments)</small></li>' for r in rows)
        (bdir / "index.html").write_text(f"<!doctype html><meta charset=utf-8><title>{html.escape(book)} plain text</title><h1>{html.escape(book)}</h1><p><a href='/reader-plain/'>All books</a></p><ol>{items}</ol>", encoding="utf-8")
        book_links.append(f'<li><a href="{html.escape(book)}/">{html.escape(book)}</a> <small>{len(rows)}</small></li>')
    (OUT_DIR / "index.html").write_text(f"<!doctype html><meta charset=utf-8><title>ajew.org plain-text reader</title><h1>ajew.org plain-text reader</h1><p>Clean crawlable Hebrew/English text for AI tools, researchers, and students. Also available: <a href='index.json'>JSON catalog</a>, <a href='sitemap.txt'>plain sitemap</a>.</p><ol>{''.join(book_links)}</ol>", encoding="utf-8")
    print(f"Built {len(entries)} plain reader teachings at {OUT_DIR}")


if __name__ == "__main__":
    main()
