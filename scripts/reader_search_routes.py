#!/usr/bin/env python3
"""Shared Reader source-to-public-route policy for search builders.

Storage names are not public URLs.  This module deliberately canonicalizes only
layouts represented by Reader routes and removes known root-level legacy shadows
before collision validation.
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

NUMERIC_LEAF_RE = re.compile(r"^(?:torah|halacha|prayer|topic|section|sicha|chapter)-(\d+)$")
PART_RE = re.compile(r"^part-(\d+)$")


@dataclass(frozen=True)
class RoutedSource:
    source: Path
    route: str
    priority: int


def _numbered_leaf(stem: str) -> str:
    match = NUMERIC_LEAF_RE.fullmatch(stem)
    return str(int(match.group(1))) if match else stem


def route_for_source(source: Path, reader_dir: Path) -> str | None:
    """Return the canonical public route for a Reader JSON source."""
    rel = source.relative_to(reader_dir)
    parts = rel.parts
    if not parts or source.name == "index.json":
        return None
    book = parts[0]
    stem = source.stem

    if book == "chayey-moharan":
        if len(parts) == 3 and parts[1] == "simanim":
            match = re.fullmatch(r"siman-(\d+)", stem)
            return f"/reader/{book}/siman/{int(match.group(1))}" if match else None
        chapter = re.fullmatch(r"chapter-(\d+)", stem)
        if chapter and int(chapter.group(1)) <= 7:
            return f"/reader/{book}/1/{int(chapter.group(1))}"
        if stem in {"intro", "hashmatos-toc", "hashmata-162", "maftechos"}:
            return f"/reader/{book}/1/{stem}"
        return None

    if book == "saba-tape-transcripts" and len(parts) == 3 and parts[1] == "tapes":
        match = re.fullmatch(r"tape-0*(\d+)-([ab])", stem)
        return f"/reader/{book}/1/{int(match.group(1))}-{match.group(2)}" if match else None

    # Likutay Nanach volumes have dedicated numeric Reader routes even though
    # their storage folders are named volume-N/chapter-N.
    if book == "likutay-nanach" and len(parts) == 3:
        volume = re.fullmatch(r"volume-(\d+)", parts[1])
        chapter = re.fullmatch(r"chapter-(\d+)", stem)
        if volume and chapter:
            return f"/reader/{book}/{int(volume.group(1))}/{int(chapter.group(1))}"

    if len(parts) == 3:
        part_match = PART_RE.fullmatch(parts[1])
        if part_match:
            return f"/reader/{book}/{int(part_match.group(1))}/{_numbered_leaf(stem)}"
        # Commentary and facsimile sources in storage-only subfolders still
        # contain searchable Reader text. Their public JSON asset is a truthful,
        # reachable fallback when no dedicated rendered route exists.
        return f"/reader/{'/'.join(parts)}"
    if len(parts) > 3:
        return f"/reader/{'/'.join(parts)}"
    if len(parts) == 2:
        return f"/reader/{book}/1/{_numbered_leaf(stem)}"
    return None


def source_priority(source: Path, reader_dir: Path) -> int:
    rel = source.relative_to(reader_dir)
    book = rel.parts[0]
    # These dedicated Reader routes read the named canonical files.  Obsolete
    # torah-N siblings are allowed shadows, never peers that can win by order.
    if book == 'likutay-halachos' and source.stem.startswith('halacha-'):
        return 120
    if book == 'likutay-tefilos' and source.stem.startswith('prayer-'):
        return 120
    # The live Siach Sarfei Kodesh Reader route reads section-N.json; torah-N
    # siblings are legacy copies with generic metadata and must never win.
    if book == 'siach-sarfei-kodesh' and source.stem.startswith('section-'):
        return 120
    if len(rel.parts) == 3 and PART_RE.fullmatch(rel.parts[1]):
        # A live /part/entry route reads this exact layout.
        return 100
    if rel.parts[0] == "chayey-moharan" and len(rel.parts) == 3:
        return 100
    if rel.parts[0] == "saba-tape-transcripts" and len(rel.parts) == 3:
        return 100
    return 50


def discover_routed_sources(files: Iterable[Path], reader_dir: Path) -> list[RoutedSource]:
    """Resolve sources, discard proven legacy shadows, and reject ambiguity.

    A root ``section-N.json``/``torah-N.json`` is a legacy shadow only when the
    exact public route has a real ``part-N/...`` source.  It is removed before
    collision validation, so its unrelated text can never overwrite that route.
    Every remaining non-identical collision is a build error.
    """
    candidates: list[RoutedSource] = []
    for source in sorted(files):
        route = route_for_source(source, reader_dir)
        if route:
            candidates.append(RoutedSource(source, route, source_priority(source, reader_dir)))

    grouped: dict[str, list[RoutedSource]] = {}
    for item in candidates:
        grouped.setdefault(item.route, []).append(item)

    selected: list[RoutedSource] = []
    errors: list[str] = []
    for route, group in sorted(grouped.items()):
        top_priority = max(item.priority for item in group)
        top = [item for item in group if item.priority == top_priority]
        if len(top) == 1:
            # Lower-priority root copies are explicitly classified legacy and
            # cannot participate in or overwrite the live route.
            selected.append(top[0])
            continue
        signatures: dict[str, list[Path]] = {}
        for item in top:
            try:
                data = json.loads(item.source.read_text(encoding="utf-8"))
                canonical = json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            except (OSError, json.JSONDecodeError) as exc:
                errors.append(f"{route}: cannot validate {item.source}: {exc}")
                continue
            digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
            signatures.setdefault(digest, []).append(item.source)
        if len(signatures) > 1:
            errors.append(f"{route}: nonidentical canonical sources: " + ", ".join(str(item.source) for item in top))
        elif top:
            selected.append(sorted(top, key=lambda item: str(item.source))[0])
    if errors:
        raise RuntimeError("Reader route collision validation failed:\n - " + "\n - ".join(errors))
    return selected
