"""URL-only plain-export repairs and a finite, catalog-backed navigation view.

Navigation pages are not teachings: never append them to the catalog or sitemap.
Human-route holds deliberately have no sourceUrl; physical JSON remains available.
"""
from __future__ import annotations

import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urljoin, urlsplit

ORIGIN = "https://ajew.org"
SEED = Path(__file__).with_name("reader-legacy-bookless-paths.json")
# Exact parent-authorized literal list, including its order; no suffix expansion.
SEED_SHA256 = "2e9fcb6d740bf5983da1a643f4e5e73f84ea56b98e9bae1eb6d9b645740f44a5"
LEGACY_RE = re.compile(r"/reader-plain/([1-9][0-9]*)/([1-9][0-9]*|topic-[1-9][0-9]*)\Z")
COMPONENT_RE = re.compile(r"[\w-]+\Z", re.UNICODE)
EXPORT_COMPONENT_RE = re.compile(r"[\w ,—-]+\Z", re.UNICODE)
NANACH_LIMITS = {"1": 24, "2": 11, "3": 18, "4": 40, "5": 8}


def human_source_url(path: Path, reader_dir: Path, fallback: str) -> str | None:
    """Mirror the *physical* input selection of the dedicated Nanach template.

    src/pages/reader/likutay-nanach/[part]/[torah].astro getStaticPaths
    admits only these five numeric ranges and reads volume-N/chapter-N.json.
    Its parseInt does NOT authorize chapter-251-topic-12.json as chapter 251.
    Other physical Nanach inputs have no proven human route: hold, don't guess
    from their metadata (which can name a completely different book).
    """
    rel = path.relative_to(reader_dir)
    if not rel.parts or rel.parts[0] != "likutay-nanach":
        return fallback
    match = re.fullmatch(r"likutay-nanach/volume-([1-5])/chapter-([1-9][0-9]*)\.json", rel.as_posix())
    if match and int(match[2]) <= NANACH_LIMITS[match[1]]:
        return f"/reader/likutay-nanach/{match[1]}/{match[2]}/"
    return None


class _HrefRepair(HTMLParser):
    """Patch only href attribute bytes; leave body, scripts and markup intact."""
    def __init__(self, text: str, canonical_path: str):
        super().__init__(convert_charrefs=False)
        self.text = text
        self.base = ORIGIN + canonical_path
        self.offsets = [0]
        for match in re.finditer("\n", text):
            self.offsets.append(match.end())
        self.edits = []

    def handle_starttag(self, tag, attrs):
        raw = self.get_starttag_text()
        assert raw is not None
        line, column = self.getpos()
        start = self.offsets[line - 1] + column
        # Consume complete attributes, not href-looking text inside another value.
        attr_re = r'''([^\s=<>/]+)(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>]+))'''
        for match in re.finditer(attr_re, raw[len(tag) + 1:]):
            if match[1].lower() != "href":
                continue
            group = next(i for i in (3, 4, 5) if match[i] is not None)
            value = html.unescape(match[group])
            if not value or value.startswith(("#", "/")) or urlsplit(value).scheme:
                continue
            resolved = urlsplit(urljoin(self.base, value))
            if resolved.scheme != "https" or resolved.netloc != "ajew.org":
                raise ValueError(f"Unexpected internal href origin: {value!r}")
            absolute = resolved.path
            if resolved.query:
                absolute += "?" + resolved.query
            if resolved.fragment:
                absolute += "#" + resolved.fragment
            lo, hi = match.span(group)
            self.edits.append((start + len(tag) + 1 + lo, start + len(tag) + 1 + hi, html.escape(absolute, quote=True)))

    handle_startendtag = handle_starttag


def root_absolute_hrefs(text: str, canonical_path: str) -> str:
    if not canonical_path.startswith("/reader-plain/") or not canonical_path.endswith("/"):
        raise ValueError("Expected canonical plain directory path")
    parser = _HrefRepair(text, canonical_path)
    parser.feed(text)
    parser.close()
    for lo, hi, replacement in reversed(parser.edits):
        text = text[:lo] + replacement + text[hi:]
    return text


def reconcile_catalog_sources(out_dir: Path, entries: list[dict]) -> list[dict]:
    """Withhold a proven Nanach owner if a later physical input won its export.

    Preserve every row, destination and body. Never assign the winning owner's
    URL to an earlier row: a different teaching is not a substitute export.
    """
    held = []
    for ordinal, entry in enumerate(entries):
        source = entry.get("sourceUrl")
        if not isinstance(source, str) or not re.fullmatch(r"/reader/likutay-nanach/[1-5]/[1-9][0-9]*/", source):
            continue
        directory = plain_target_directory(out_dir, entry["url"], legacy_export_names=True)
        selected = json.loads((directory / "index.json").read_bytes())
        if not isinstance(selected, dict) or "sourceUrl" not in selected:
            raise ValueError("Selected ordinary export lacks its sourceUrl contract")
        if selected["sourceUrl"] != source:
            held.append({"ordinal": ordinal, "url": entry["url"], "sourceUrl": source,
                         "selectedSourceUrl": selected["sourceUrl"]})
    # Do not partially mutate the catalog when a later prerequisite fails.
    for item in held:
        entries[item["ordinal"]]["sourceUrl"] = None
    return held


def harden_section_links(out_dir: Path, entries: list[dict]) -> None:
    """Include unchanged qualified exporters without modifying their bodies/logic."""
    for url in dict.fromkeys(entry["url"] for entry in entries):
        directory = plain_target_directory(out_dir, url, legacy_export_names=True)
        target = directory / "index.html"
        before = target.read_bytes().decode("utf-8")
        after = root_absolute_hrefs(before, url)
        if after != before:
            target.write_bytes(after.encode("utf-8"))


def load_legacy_paths(seed: Path = SEED) -> list[str]:
    raw = seed.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SEED_SHA256:
        raise ValueError("Legacy navigation seed differs from the authorized literal list")
    paths = json.loads(raw)
    if not isinstance(paths, list) or len(paths) != 117 or len(set(paths)) != 117:
        raise ValueError("Expected exactly 117 distinct legacy paths")
    if any(not isinstance(p, str) or not LEGACY_RE.fullmatch(p) for p in paths):
        raise ValueError("Unsafe legacy navigation path")
    return paths


def plain_target_directory(out_dir: Path, url: str, *, legacy_export_names: bool = False) -> Path:
    """Admit exact local catalog directories, never encoded/path/origin aliases."""
    if not isinstance(url, str):
        raise ValueError("Catalog target must be a path")
    parts = url.split("/")
    component_re = EXPORT_COMPONENT_RE if legacy_export_names else COMPONENT_RE
    if (len(parts) not in (5, 6) or parts[:2] != ["", "reader-plain"] or parts[-1] != ""
            or any(not component_re.fullmatch(p) for p in parts[2:-1])
            or parts[2].isdigit()):
        raise ValueError(f"Unsafe plain catalog target: {url!r}")
    # Ordinary sections have three components; qualified wrapups may have two.
    directory = out_dir.joinpath(*parts[2:-1])
    if not directory.resolve().is_relative_to(out_dir.resolve()):
        raise ValueError("Plain target escapes output directory")
    return directory


def _legacy_suffix(path: str) -> tuple[str, str]:
    match = LEGACY_RE.fullmatch(path)
    if match is None:
        raise ValueError("Unsafe legacy navigation path")
    return match[1], match[2]


def navigation_candidates(entries: list[dict], out_dir: Path, paths: list[str]) -> dict:
    """Deduplicate exact URL only; retain original row ordinals privately.

    Validate the complete plan before writing any resolver. The returned report is
    for the caller/test's private receipts, not public JSON or search admission.
    """
    authorized = load_legacy_paths()
    if paths != authorized:
        raise ValueError("Only the exact authorized legacy path list may be generated")
    by_suffix = {_legacy_suffix(p): {} for p in paths}
    for ordinal, row in enumerate(entries):
        suffix = (str(row.get("part")), str(row.get("torah")))
        if suffix not in by_suffix:
            continue
        url = row.get("url")
        if not isinstance(url, str):
            raise ValueError("Navigation target must be a catalog path")
        directory = plain_target_directory(out_dir, url)
        if url != f"/reader-plain/{row.get('bookId')}/{suffix[0]}/{suffix[1]}/":
            raise ValueError("Catalog identity and target disagree")
        if type(row.get("segments")) is not int or row["segments"] <= 0:
            raise ValueError("Navigation requires positive catalog segment counts")
        if not isinstance(row.get("title"), str) or not row["title"].strip():
            raise ValueError("Navigation requires actual section titles")
        for name in ("index.html", "index.json"):
            target = directory / name
            if not target.resolve().is_relative_to(out_dir.resolve()) or not target.is_file() or target.stat().st_size == 0:
                raise ValueError(f"Missing/unsafe navigation target: {url}{name}")
        choices = by_suffix[suffix]
        if url not in choices:
            current = json.loads((directory / "index.json").read_bytes())
            if (not isinstance(current, dict) or not isinstance(current.get("segments"), list)
                    or not current["segments"] or not isinstance(current.get("title"), str)
                    or not current["title"].strip()):
                raise ValueError(f"Invalid/empty current plain JSON target: {url}")
            choices[url] = {"row": row, "title": current["title"], "catalog_rows": []}
        choice = choices[url]
        choice["catalog_rows"].append(ordinal)
    report = {}
    for path in paths:
        choices = by_suffix[_legacy_suffix(path)]
        if not choices:
            raise ValueError(f"No current catalog destinations for {path}")
        report[path] = choices
    return report


def render_navigation(path: str, choices: dict, labels: dict[str, str]) -> str:
    match = LEGACY_RE.fullmatch(path)
    if not match or not choices:
        raise ValueError("Navigation requires a literal path and actual choices")
    section = f"Section {match[1]}/{match[2]}"
    items = []
    for url, choice in sorted(choices.items()):
        row = choice["row"]
        book = row["bookId"]
        # Keep exact catalog identity explicit even when a human title is supplied.
        label = labels.get(book) or book
        work = label
        items.append(f'<li><a href="{html.escape(ORIGIN + url, quote=True)}"><strong>{html.escape(work)}</strong> — {html.escape(choice["title"])}</a></li>')
    return ("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
            '<meta name="viewport" content="width=device-width, initial-scale=1">'
            f"<title>{html.escape(section)} — Available works | A Jew</title>"
            '<meta name="robots" content="noindex,follow">'
            '<style>body{max-width:72rem;margin:auto;padding:24px;background:#fffdf8;color:#1a1a1a;font:17px/1.65 system-ui,sans-serif}a{color:#1a365d;text-underline-offset:.2em}ul{padding:0;list-style:none}li{margin:10px 0}li a{display:block;padding:12px 16px;border:1px solid #d4c9b5;border-radius:8px;overflow-wrap:anywhere}strong{display:block}a:focus-visible{outline:3px solid #1a365d;outline-offset:4px}</style>'
            '</head><body><main><h1>Available works</h1>'
            f"<h2>{html.escape(section)}</h2>"
            '<p><a href="/reader-plain/">All works</a></p>'
            f"<ul>{''.join(items)}</ul></main></body></html>\n")


def book_labels(reader_dir: Path) -> dict[str, str]:
    catalog = reader_dir / "catalog.json"
    if not catalog.is_file():
        return {}  # Explicit catalog book IDs remain valid labels in small fixtures.
    books = json.loads(catalog.read_bytes())["books"]
    return {book["id"]: book["title"] for book in books
            if isinstance(book.get("id"), str) and isinstance(book.get("title"), str)
            and book["title"].strip()}


def write_legacy_navigation(out_dir: Path, entries: list[dict], labels: dict[str, str] | None = None) -> dict:
    paths = load_legacy_paths()
    plan = navigation_candidates(entries, out_dir, paths)
    targets = []
    for path in paths:
        # The pinned literal list is the only output namespace authority.
        directory = out_dir / path.removeprefix("/reader-plain/")
        target = directory / "index.html"
        if not target.resolve().is_relative_to(out_dir.resolve()) or target.exists():
            raise ValueError(f"Unsafe/existing navigation output: {path}")
        targets.append((target, render_navigation(path, plan[path], labels or {})))
    for target, text in targets:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")
    return {"pages": len(paths), "targets": {
        path: {url: choice["catalog_rows"] for url, choice in choices.items()}
        for path, choices in plan.items()
    }}
