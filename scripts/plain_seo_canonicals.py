"""Quiescent-build-only metadata repair; never imports an export producer.

Only ordinary catalog identities with the generator's exact metadata contract
are eligible. Numeric-part Reader HTML routes use nginx's general file/.html/
index projection (the active raw/full aliases cannot match these URLs).
Qualified editions and unknown ownership are deliberately untouched.
"""
from __future__ import annotations

import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import stat
from urllib.parse import unquote, urlsplit

SITE = "https://ajew.org"
QUALIFIED_RAW = "/reader-plain/reviewed/wrapup-18-19-92-209/"


def iri_path(value: str) -> str:
    """Validate first; decode IRI/percent escapes only for disk projection."""
    u = urlsplit(value)
    if u.scheme or u.netloc:
        if u.scheme != "https" or u.netloc != "ajew.org":
            raise ValueError("Unknown origin")
    if not u.path.startswith("/") or u.path.startswith("//") or u.query or u.fragment:
        raise ValueError("Not a local path")
    if re.search(r"%(?![0-9a-fA-F]{2})", u.path):
        raise ValueError("Malformed escape")
    p = unquote(u.path, errors="strict")
    if "\\" in p or any(ord(c) < 32 or ord(c) == 127 for c in p):
        raise ValueError("Unsafe path")
    if any(x in {".", ".."} for x in p.split("/")):
        raise ValueError("Traversal")
    return p


def regular(root: Path, relative: str) -> Path | None:
    """Reject every symlink, including in-root symlinks and ancestors."""
    root = root.absolute()
    if root.is_symlink() or root.resolve() != root:
        raise ValueError("Symlink root")
    p = root
    for component in relative.split("/"):
        if not component:
            continue
        if component in {".", ".."}:
            raise ValueError("Traversal")
        p = p / component
        if p.is_symlink():
            raise ValueError("Symlink artifact")
    if not p.is_relative_to(root):
        raise ValueError("Outside root")
    try:
        mode = p.stat().st_mode
    except FileNotFoundError:
        return None
    return p if stat.S_ISREG(mode) else None


def reader_html(root: Path, url: str) -> Path | None:
    p = iri_path(url).lstrip("/")
    # No guessed aliases: eligible canonical paths are ordinary numeric-part
    # Reader HTML, disjoint from configured raw/full/legacy named aliases.
    for name in (p, p + ".html", p.rstrip("/") + "/index.html"):
        file = regular(root, name)
        if file is not None and file.suffix == ".html":
            return file
    return None


class Head(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.closed = False
        self.canonicals = []
        self.noindex = False

    def handle_starttag(self, tag, attrs):
        if tag in {"body", "main"}:
            self.closed = True
        if self.closed:
            return
        a = {k: v or "" for k, v in attrs}
        if tag == "link" and "canonical" in a.get("rel", "").lower().split():
            self.canonicals.append(a.get("href"))
        if tag == "meta" and a.get("name", "").lower() in {"robots", "googlebot"}:
            self.noindex |= bool({"noindex", "none"} & set(re.split(r"[\s,]+", a.get("content", "").lower())))

    def handle_endtag(self, tag):
        if tag == "head":
            self.closed = True


def metadata(text: str) -> Head:
    h = Head()
    h.feed(text.split("</head>", 1)[0] + ("</head>" if "</head>" in text else ""))
    return h


def repair_plain_canonicals(dist: Path, entries: list[dict]) -> dict:
    """Mutate eligible HTML only; emit exact finite before/after bindings."""
    bindings = []
    seen = set()
    for row in entries:
        book, part, section = (str(row.get(k, "")) for k in ("bookId", "part", "torah"))
        if not part.isascii() or not part.isdigit() or not book or not section:
            continue
        if any("/" in x or "\\" in x for x in (book, part, section)):
            continue
        plain = f"/reader-plain/{book}/{part}/{section}/"
        human = f"/reader/{book}/{part}/{section}"
        if row.get("url") != plain or row.get("sourceUrl") != human or plain in seen:
            continue
        seen.add(plain)
        # Validate both original IRIs before accessing anything.
        try:
            plain_disk, _ = iri_path(plain), iri_path(human)
        except ValueError:
            continue
        source = regular(dist, plain_disk.lstrip("/") + "index.html")
        if source is None:
            continue
        original = source.read_bytes().decode("utf-8")
        meta = metadata(original)
        before, after = SITE + human, SITE + plain
        if not meta.closed or meta.canonicals != [before]:
            continue
        target = reader_html(dist, before)
        target_noindex = False
        if target is not None:
            target_meta = metadata(target.read_text(encoding="utf-8"))
            if not target_meta.closed or not target_meta.noindex:
                continue
            target_noindex = True
        # Require the exact ordinary producer contract, not a false wrapper or
        # qualified page which happens to have a similar URL.
        main = re.findall(r"<main\b[^>]*>.*?</main>", original, re.S)
        canonical = '<link rel="canonical" href="' + html.escape(before) + '">'
        schema = re.findall(r'<script type="application/ld\+json">(.*?)</script>', original, re.S)
        if len(main) != 1 or original.count(canonical) != 1 or len(schema) != 1:
            continue
        try:
            doc = json.loads(schema[0])
        except ValueError:
            continue
        if not isinstance(doc, dict) or doc.get("@type") != "DigitalDocument" or doc.get("url") != after or doc.get("mainEntityOfPage") != before:
            continue
        # Byte-local substitutions; do not serialize JSON or HTML.
        key = '"mainEntityOfPage": ' + json.dumps(before, ensure_ascii=False)
        if schema[0].count(key) != 1:
            continue
        head, body = original.split("</head>", 1)
        head = head.replace(canonical, '<link rel="canonical" href="' + html.escape(after) + '">', 1)
        head = head.replace(key, '"mainEntityOfPage": ' + json.dumps(after, ensure_ascii=False), 1)
        if target_noindex and not meta.noindex:
            robots = re.compile(r'<meta name="robots" content="[^"]*">')
            if len(robots.findall(head)) != 1:
                continue
            head = robots.sub('<meta name="robots" content="noindex,follow">', head, count=1)
        withheld = False
        # Known dead link only, outside main; never substitute an inferred owner.
        if not target_noindex:
            link = ' · <a href="' + html.escape(human) + '">Human reader page</a>'
            header = re.search(r"<header>.*?</header>", body, re.S)
            if header and header.end() <= body.index(main[0]) and header[0].count(link) == 1:
                replacement = header[0].replace(link, "", 1)
                body = body[:header.start()] + replacement + body[header.end():]
                withheld = True
        revised = head + "</head>" + body
        if re.findall(r"<main\b[^>]*>.*?</main>", revised, re.S) != main:
            raise ValueError("Reading body drift")
        source.write_bytes(revised.encode("utf-8"))
        bindings.append({"url": after, "before": before, "after": after,
                         "reason": "target_noindex" if target_noindex else "target_missing",
                         "human_link_withheld": withheld, "noindex": target_noindex or meta.noindex})
    return {"changed": len(bindings), "bindings": bindings}


def raw_section_url(dist: Path, row: dict) -> str:
    """One proven qualified exception; never interpolate its composite owner."""
    if (row.get("bookId"), row.get("part"), row.get("torah")) == ("reviewed", "reviewed", "wrapup-18-19-92-209"):
        if row.get("url") != QUALIFIED_RAW:
            raise ValueError("Qualified raw identity drift")
        p = iri_path(row["url"] + "index.txt")
        if regular(dist, p.lstrip("/")) is None:
            raise ValueError("Missing qualified TXT export")
        return SITE + row["url"] + "index.txt"
    return f"{SITE}/reader/{str(row['bookId']).strip()}/{str(row['part']).strip()}/{str(row['torah']).strip()}/raw.txt"
