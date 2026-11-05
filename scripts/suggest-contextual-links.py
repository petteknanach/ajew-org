#!/usr/bin/env python3
"""Private, read-only editorial link suggestions; Python standard library only."""
import argparse
import csv
import io
import json
import math
import os
import re
import stat
import sys
import unicodedata
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote, urljoin

ORIGIN = "https://ajew.org"
ROUTES = ("/about", "/start", "/help", "/reference", "/one-library-many-doorways")
CSV_LIMIT, HTML_LIMIT = 8 * 1024 * 1024, 1024 * 1024
OPERATORS = re.compile(r"\b(?:site|inurl|allinurl|intitle|allintitle|filetype|cache):", re.I)
BLOCKED = set("a h1 h2 h3 h4 h5 h6 nav script style blockquote q header footer aside template code pre".split())
PROTECTED = re.compile(r"source|teaching|translation|prayer|hebrew|torah|sacred|quote|reader|pasuk|verse", re.I)
FORMULA = re.compile(r"na\W*nach\W*nachma\W*nachman\W*(?:m[aeiyuo’' -]*man)|נ\W*נח\W*נחמ\W*נחמן\W*מאומן", re.I)
VOID = set("area base br col embed hr img input link meta param source track wbr".split())


def target_url(value):
    if not isinstance(value, str) or not re.fullmatch(r"https://ajew\.org(?:/[^\s?#\\]*)?", value):
        raise ValueError("Page must be a literal HTTPS ajew.org URL without query/fragment")
    if re.search(r"%(?![0-9a-fA-F]{2})", value):
        raise ValueError("malformed URL escape")
    parsed = urlsplit(value)
    decoded = unquote(parsed.path)
    if any(ord(c) < 33 or ord(c) == 127 or c in "\\?#" for c in decoded) or any(x in (".", "..") for x in decoded.split("/")):
        raise ValueError("unsafe URL path")
    return value


def identity_url(value):
    parsed = urlsplit(target_url(value))
    return ORIGIN + (parsed.path.rstrip("/") or "/")


def bounded(path, limit, dir_fd=None):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=dir_fd)
    with os.fdopen(fd, "rb") as stream:
        if not stat.S_ISREG(os.fstat(stream.fileno()).st_mode):
            raise ValueError("input must be a regular file")
        data = stream.read(limit + 1)
    if len(data) > limit:
        raise ValueError("input exceeds byte limit")
    return data.decode("utf-8-sig")


def rows(path):
    reader = csv.DictReader(io.StringIO(bounded(path, CSV_LIMIT)))
    if reader.fieldnames != ["Page", "Query", "Clicks", "Impressions", "Position"]:
        raise ValueError("CSV requires exactly Page,Query,Clicks,Impressions,Position in that order")
    found = {}
    for row in reader:
        if None in row or any(v is None for v in row.values()):
            raise ValueError("invalid CSV row width")
        page = target_url(row["Page"])
        query = row["Query"]
        if not query.strip() or query != query.strip() or any(ord(c) < 32 for c in query):
            raise ValueError("invalid Query")
        if not re.fullmatch(r"[0-9]+", row["Clicks"]) or not re.fullmatch(r"[0-9]+", row["Impressions"]):
            raise ValueError("Clicks and Impressions must be nonnegative integers")
        clicks, impressions = int(row["Clicks"]), int(row["Impressions"])
        position = float(row["Position"])
        if clicks > impressions or not math.isfinite(position) or position < 1:
            raise ValueError("invalid metric range")
        key, metrics = (page, query), (clicks, impressions, position)
        if key in found and found[key] != metrics:
            raise ValueError("conflicting duplicate Page/Query")
        found[key] = metrics
    return [(p, q, *m) for (p, q), m in found.items()]


class Paragraphs(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.paragraphs, self.links = [], [], set()
        self.parts = None
        self.formula_parts = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        blocked = tag in BLOCKED or bool(PROTECTED.search(attrs.get("class", "") + " " + attrs.get("id", ""))) or any(k.startswith(("data-source", "data-teaching", "data-translation", "data-prayer")) for k in attrs) or attrs.get("lang", "").startswith("he")
        if tag == "a" and "href" in attrs:
            self.links.add(attrs["href"])
        if tag == "p":
            self.parts, self.formula_parts = [], []
        if blocked and self.parts is not None:
            self.parts.append("\x00")
        if tag == "br" and self.parts is not None:
            self.parts.append(" ")
            self.formula_parts.append(" ")
        if tag not in VOID:
            self.stack.append((tag, blocked))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag == "p" and self.parts is not None:
            if not FORMULA.search("".join(c for c in unicodedata.normalize("NFD", "".join(self.formula_parts)) if not unicodedata.combining(c))):
                self.paragraphs.append(re.sub(r"\s+", " ", "".join(self.parts)).strip())
            self.parts = self.formula_parts = None
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if self.parts is not None:
            self.formula_parts.append(data)
            if not any(blocked for _, blocked in self.stack):
                self.parts.append(data)


def suggest(gsc, site_root, minimum=10, low=4, high=20, maximum=3):
    eligible = sorted((r for r in rows(gsc) if r[3] >= minimum and low <= r[4] <= high and not OPERATORS.search(r[1])), key=lambda r: (-r[3], r[4], r[0], r[1]))
    output = []
    if not eligible:
        return output
    root = os.open(site_root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for route in ROUTES:
            try:
                directory = os.open(route[1:], os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=root)
            except FileNotFoundError:
                continue
            try:
                try:
                    html = bounded("index.html", HTML_LIMIT, directory)
                except FileNotFoundError:
                    continue
            finally:
                os.close(directory)
            parser = Paragraphs()
            parser.feed(html)
            source = ORIGIN + route + "/"
            existing = set()
            for href in parser.links:
                try:
                    linked = urlsplit(urljoin(source, href))
                    existing.add(identity_url(linked._replace(query="", fragment="").geturl()))
                except ValueError:
                    pass
            used, count = set(), 0
            for paragraph in parser.paragraphs:
                if count >= maximum:
                    break
                for page, query, clicks, impressions, position in eligible:
                    identity = identity_url(page)
                    if identity == ORIGIN + route or identity in existing or identity in used:
                        continue
                    match = re.search(r"(?<!\w)" + re.escape(query) + r"(?!\w)", paragraph, re.I)
                    if match:
                        output.append(dict(sourceURL=source, naturalanchor=match.group(), targetURL=page, targetquery=query, impressions=impressions, clicks=clicks, position=position, paragraphcontext=paragraph.replace("\x00", " […] "), requiredReview="Manual semantic and destination review required; no edits made."))
                        used.add(identity)
                        count += 1
                        break
    finally:
        os.close(root)
    return output


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gsc", required=True)
    parser.add_argument("--site-root", required=True)
    parser.add_argument("--min-impressions", type=int, default=10)
    parser.add_argument("--min-position", type=float, default=4)
    parser.add_argument("--max-position", type=float, default=20)
    parser.add_argument("--max-links", type=int, default=3)
    args = parser.parse_args(argv)
    try:
        if args.min_impressions < 0 or not 1 <= args.max_links <= 3 or not (1 <= args.min_position <= args.max_position < math.inf):
            raise ValueError("invalid heuristic bounds (max-links must be 1..3)")
        result = suggest(args.gsc, args.site_root, args.min_impressions, args.min_position, args.max_position, args.max_links)
    except (OSError, ValueError, csv.Error, UnicodeError) as exc:
        print(str(exc), file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, allow_nan=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
