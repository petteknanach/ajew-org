#!/usr/bin/env python3
"""Audit canonical Reader JSON against every generated search representation.

The audit is deliberately independent of the builders' extraction helper: it
reads semantic Hebrew/English fields from canonical routed Reader JSON, then
compares normalized full text, generated documents, and every term posting.
It writes a deterministic machine-readable report with per-book omissions.
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import sqlite3
import tempfile
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

from reader_search_routes import discover_routed_sources

ROOT = Path(__file__).resolve().parents[1]
READER = ROOT / "public" / "reader"
DATA = ROOT / "public" / "data"
SEARCH = ROOT / "public" / "reader-search"
NIKUD_RE = re.compile(r"[\u0591-\u05C7]")
COMBINING_RE = re.compile(r"[\u0300-\u036f]")
PUNCT_RE = re.compile(r"[^\w\s\u0590-\u05ff]+", re.UNICODE)
SPACE_RE = re.compile(r"\s+")
HE_KEYS = ("verse", "verseText", "commentary_he", "text_he", "hebrew", "hebrew_text")
EN_KEYS = ("commentary_en", "text_en", "english", "translation")
LAYER_KEYS = ("beginner", "intermediate", "scholarly")


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFD", str(value or "").lower())
    value = NIKUD_RE.sub("", value)
    value = COMBINING_RE.sub("", value)
    value = value.replace("״", "").replace("׳", "").replace('"', "").replace("'", "")
    return SPACE_RE.sub(" ", PUNCT_RE.sub(" ", value)).strip()


def add(parts: list[str], value, hebrew: bool = False) -> None:
    if isinstance(value, str) and value.strip():
        parts.append(NIKUD_RE.sub("", value.strip()) if hebrew else value.strip())


def extract_level(level: dict, he: list[str], en: list[str]) -> None:
    # he/he_nikud are alternate renderings, never two independent passages.
    add(he, level.get("he_nikud") or level.get("he"), True)
    for key in HE_KEYS:
        add(he, level.get(key), True)
    add(en, level.get("en"))
    for key in EN_KEYS:
        add(en, level.get(key))
    commentary = level.get("commentary")
    if isinstance(commentary, dict):
        add(he, commentary.get("he_nikud") or commentary.get("he"), True)
        add(en, commentary.get("en"))


def canonical_text(data: dict, source: Path) -> tuple[str, str]:
    if source.parent.name == "chayey-moharan" and source.stem == "hashmata-162":
        return str(data.get("hashmata_he") or "").strip(), "\n".join(
            value.strip() for value in (str(data.get("hashmata_en") or ""), str(data.get("note") or "")) if value.strip()
        )
    he: list[str] = []
    en: list[str] = []
    for segment in data.get("segments") or []:
        if not isinstance(segment, dict):
            continue
        extract_level(segment, he, en)
        layers = segment.get("layers")
        if isinstance(layers, dict):
            for key in LAYER_KEYS:
                if isinstance(layers.get(key), dict):
                    extract_level(layers[key], he, en)
        for key in LAYER_KEYS:
            layer = segment.get(key)
            if isinstance(layer, dict):
                extract_level(layer, he, en)
            elif isinstance(layer, str):
                add(en, layer)
    return "\n\n".join(he), "\n\n".join(en)


def canonical_sources() -> list:
    files = []
    for source in READER.rglob("*.json"):
        # Super Reader overlays are synchronized derivative panes, not books or
        # standalone Reader routes. Ordinary canonical books are depth <= 3.
        if "super" in source.relative_to(READER).parts[:1] or source.name == "index.json":
            continue
        try:
            data = json.loads(source.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(data, dict) and (isinstance(data.get("segments"), list) or source.name == "hashmata-162.json"):
            files.append(source)
    return discover_routed_sources(files, READER)


def mismatch_record(expected: str, actual: str) -> dict:
    expected_tokens = expected.split()
    actual_tokens = actual.split()
    missing = Counter(expected_tokens) - Counter(actual_tokens)
    extra = Counter(actual_tokens) - Counter(expected_tokens)
    return {
        "expectedChars": len(expected),
        "actualChars": len(actual),
        "missingTokenCount": sum(missing.values()),
        "extraTokenCount": sum(extra.values()),
        "missingTokenExamples": sorted(missing)[:20],
        "extraTokenExamples": sorted(extra)[:20],
    }


def load_gzip(name: str) -> list[dict]:
    with gzip.open(DATA / name, "rt", encoding="utf-8") as handle:
        return json.load(handle)


def audit(output: Path) -> dict:
    canonical = {}
    source_for_route = {}
    for routed in canonical_sources():
        data = json.loads(routed.source.read_text(encoding="utf-8"))
        he, en = canonical_text(data, routed.source)
        if not he and not en:
            continue
        canonical[routed.route] = {
            "book": routed.source.relative_to(READER).parts[0],
            "he": normalize(he),
            "en": normalize(en),
        }
        source_for_route[routed.route] = str(routed.source.relative_to(ROOT))

    light_he = {doc.get("l"): doc for doc in load_gzip("light-search-index-he.json.gz") if doc.get("l")}
    light_en = {doc.get("l"): doc for doc in load_gzip("light-search-index-en.json.gz") if doc.get("l")}
    meta = json.loads((SEARCH / "meta.json").read_text(encoding="utf-8"))
    shard_ids = {item.get("p"): item_id for item_id, item in enumerate(meta.get("items") or []) if item.get("p")}
    v2_data = json.loads((DATA / "search-index-v2.json").read_text(encoding="utf-8"))
    v2 = {doc.get("url"): doc for doc in v2_data.get("documents") or [] if doc.get("url")}

    per_book = defaultdict(lambda: {
        "canonicalDocuments": 0,
        "canonicalHebrewChars": 0,
        "canonicalEnglishChars": 0,
        "lightMissingRoutes": [],
        "lightHebrewMismatches": [],
        "lightEnglishMismatches": [],
        "shardMissingRoutes": [],
        "shardHebrewMismatches": [],
        "shardEnglishMismatches": [],
        "shardPostingMissingCount": 0,
        "shardPostingExtraCount": 0,
        "shardPostingExamples": [],
        "v2MissingRoutes": [],
        "v2IncompleteHebrewRoutes": [],
        "v2IncompleteEnglishRoutes": [],
    })
    details = {"lightTextMismatches": {}, "shardTextMismatches": {}}

    with tempfile.TemporaryDirectory(prefix="reader-search-audit-") as tmp:
        db = sqlite3.connect(Path(tmp) / "postings.sqlite")
        db.execute("PRAGMA journal_mode=OFF")
        db.execute("PRAGMA synchronous=OFF")
        db.execute("CREATE TABLE expected (prefix TEXT, term TEXT, id INTEGER, book TEXT, route TEXT, PRIMARY KEY(prefix,term,id)) WITHOUT ROWID")
        rows = []
        for route, expected in canonical.items():
            book = expected["book"]
            stats = per_book[book]
            stats["canonicalDocuments"] += 1
            stats["canonicalHebrewChars"] += len(expected["he"])
            stats["canonicalEnglishChars"] += len(expected["en"])
            hd, ed = light_he.get(route), light_en.get(route)
            if hd is None or ed is None:
                stats["lightMissingRoutes"].append(route)
            else:
                actual_he, actual_en = normalize(hd.get("x", "")), normalize(ed.get("x", ""))
                if actual_he != expected["he"]:
                    stats["lightHebrewMismatches"].append(route)
                    details["lightTextMismatches"][route + "#he"] = mismatch_record(expected["he"], actual_he)
                if actual_en != expected["en"]:
                    stats["lightEnglishMismatches"].append(route)
                    details["lightTextMismatches"][route + "#en"] = mismatch_record(expected["en"], actual_en)

            item_id = shard_ids.get(route)
            if item_id is None or not (SEARCH / "docs" / f"{item_id}.json").exists():
                stats["shardMissingRoutes"].append(route)
            else:
                doc = json.loads((SEARCH / "docs" / f"{item_id}.json").read_text(encoding="utf-8"))
                actual_he, actual_en = normalize(doc.get("he", "")), normalize(doc.get("en", ""))
                if actual_he != expected["he"]:
                    stats["shardHebrewMismatches"].append(route)
                    details["shardTextMismatches"][route + "#he"] = mismatch_record(expected["he"], actual_he)
                if actual_en != expected["en"]:
                    stats["shardEnglishMismatches"].append(route)
                    details["shardTextMismatches"][route + "#en"] = mismatch_record(expected["en"], actual_en)
                # The searchable document includes metadata plus both full bodies.
                normalized_doc = normalize(doc.get("n", ""))
                for term in set(normalized_doc.split()):
                    if len(term) > 1 or re.search(r"[\u05d0-\u05ea]", term):
                        rows.append((term[:1] or "_", term, item_id, book, route))
                if len(rows) >= 100_000:
                    db.executemany("INSERT OR IGNORE INTO expected VALUES (?,?,?,?,?)", rows)
                    rows.clear()

            vdoc = v2.get(route)
            if vdoc is None:
                stats["v2MissingRoutes"].append(route)
            else:
                if expected["he"] and normalize(vdoc.get("content", "")) != expected["he"]:
                    stats["v2IncompleteHebrewRoutes"].append(route)
                if expected["en"] and normalize(vdoc.get("enContent", "")) != expected["en"]:
                    stats["v2IncompleteEnglishRoutes"].append(route)
        if rows:
            db.executemany("INSERT OR IGNORE INTO expected VALUES (?,?,?,?,?)", rows)
        db.commit()

        db.execute("CREATE TABLE actual (prefix TEXT, term TEXT, id INTEGER, PRIMARY KEY(prefix,term,id)) WITHOUT ROWID")
        for shard_path in sorted((SEARCH / "shards").glob("*.json")):
            prefix = shard_path.stem
            shard = json.loads(shard_path.read_text(encoding="utf-8"))
            batch = [(prefix, term, item_id) for term, ids in shard.items() for item_id in ids]
            db.executemany("INSERT OR IGNORE INTO actual VALUES (?,?,?)", batch)
        db.commit()

        missing_rows = db.execute("SELECT e.book,e.route,e.term,e.id FROM expected e LEFT JOIN actual a USING(prefix,term,id) WHERE a.id IS NULL").fetchall()
        extra_rows = db.execute("SELECT a.term,a.id FROM actual a LEFT JOIN expected e USING(prefix,term,id) WHERE e.id IS NULL LIMIT 200").fetchall()
        extra_count = db.execute("SELECT count(*) FROM actual a LEFT JOIN expected e USING(prefix,term,id) WHERE e.id IS NULL").fetchone()[0]
        for book, route, term, item_id in missing_rows:
            stats = per_book[book]
            stats["shardPostingMissingCount"] += 1
            if len(stats["shardPostingExamples"]) < 20:
                stats["shardPostingExamples"].append({"route": route, "term": term, "id": item_id})
        # Extras can be metadata terms; they are still recorded but not failures.
        id_to_book = {item_id: item.get("c", "") for item_id, item in enumerate(meta.get("items") or [])}
        extra_counts = Counter(id_to_book.get(item_id, "") for _, item_id in extra_rows)
        for book, count in extra_counts.items():
            per_book[book]["shardPostingExtraCount"] += count

    for stats in per_book.values():
        for key, value in stats.items():
            if isinstance(value, list) and value and isinstance(value[0], str):
                value.sort()

    summary = {
        "canonicalDocuments": len(canonical),
        "canonicalBooks": len(per_book),
        "lightDocuments": len(light_he),
        "lightBooks": len({doc.get("b") for doc in light_he.values()}),
        "shardDocuments": len(shard_ids),
        "shardBooks": len({item.get("c") for item in meta.get("items") or []}),
        "v2Documents": len(v2),
        "v2Books": len({doc.get("book") for doc in v2.values()}),
        "lightMissingDocuments": sum(len(x["lightMissingRoutes"]) for x in per_book.values()),
        "lightHebrewMismatches": sum(len(x["lightHebrewMismatches"]) for x in per_book.values()),
        "lightEnglishMismatches": sum(len(x["lightEnglishMismatches"]) for x in per_book.values()),
        "shardMissingDocuments": sum(len(x["shardMissingRoutes"]) for x in per_book.values()),
        "shardHebrewMismatches": sum(len(x["shardHebrewMismatches"]) for x in per_book.values()),
        "shardEnglishMismatches": sum(len(x["shardEnglishMismatches"]) for x in per_book.values()),
        "shardMissingPostings": len(missing_rows),
        "shardExtraPostings": extra_count,
        "v2MissingDocuments": sum(len(x["v2MissingRoutes"]) for x in per_book.values()),
        "v2IncompleteHebrewDocuments": sum(len(x["v2IncompleteHebrewRoutes"]) for x in per_book.values()),
        "v2IncompleteEnglishDocuments": sum(len(x["v2IncompleteEnglishRoutes"]) for x in per_book.values()),
    }
    summary["fullReaderSearchPass"] = all(summary[key] == 0 for key in (
        "lightMissingDocuments", "lightHebrewMismatches", "lightEnglishMismatches",
        "shardMissingDocuments", "shardHebrewMismatches", "shardEnglishMismatches", "shardMissingPostings",
    ))
    report = {
        "schemaVersion": 1,
        "scope": "canonical routed public/reader JSON; Super Reader derivative overlays excluded",
        "normalization": "NFD lowercase; remove Hebrew/Latin combining marks, quote marks, punctuation; collapse whitespace",
        "summary": summary,
        "books": dict(sorted(per_book.items())),
        "details": details,
        "canonicalSourceByRoute": dict(sorted(source_for_route.items())),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "analysis" / "search-coverage-audit.json")
    args = parser.parse_args()
    report = audit(args.output)
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    print(f"Report: {args.output}")
    return 0 if report["summary"]["fullReaderSearchPass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
