"""QA-only, source-bound metadata inverse for two approved catalog order groups.

No producer imports/oracles, filesystem substitutes, output writes or text edits.
Only the PNC and Likutay Nanach rows may be permuted, in their original slots.
"""
from __future__ import annotations
import hashlib
import itertools
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APPROVED = frozenset(('pettek-nanach-commentary', 'likutay-nanach'))
SOURCE_PINS = {
    'scripts/build-reader-plain-text.py': '53706de26a3627c5258835dfb363864cf217d47a26a4297e8adc1f1016703d81',
    'scripts/reader_export_repairs.py': 'da4dcb39af22834ed6aa716c7acedc4c4ca3fef4d372eb56422f45580d72d652',
}
NANACH_INDEX_SHA256 = '3d17deea5df823cb2fed5fe928f3ece5e59f63bbca2bc81723c489ec06ada04c'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digit_tokens(value):
    """Independent maximal digit-run scanner, not the producer's regex key."""
    require(isinstance(value, str) and bool(value), 'invalid order token')
    chunks = []
    for numeric, chars in itertools.groupby(value, key=str.isdecimal):
        text = ''.join(chars)
        chunks.append((0, int(text)) if numeric else (1, text))
    return tuple(chunks)


def source_part_rank(raw):
    if raw is None:
        return None  # Genuine bounded fixture has no top-level source index.
    index = json.loads(raw)
    require(isinstance(index, dict) and index.get('book') == 'likutay-nanach', 'invalid source index owner')
    parts = index.get('parts')
    if not isinstance(parts, list) or not parts:
        raise ValueError('invalid source index parts')
    names = []
    for part in parts:
        require(isinstance(part, dict), 'invalid source index part')
        name = part.get('name')
        require(isinstance(name, str) and bool(name) and '/' not in name, 'invalid source index name')
        require(part.get('path') == f'/reader/likutay-nanach/{name}/', 'invalid source index path')
        require(name not in names, 'duplicate source index name')
        names.append(name)
    require(hashlib.sha256(raw).hexdigest() == NANACH_INDEX_SHA256, 'unrecognized source index bytes')
    return {name: rank for rank, name in enumerate(names)}


def historical_catalog_view(catalog, current_bytes, source_index_bytes):
    """Validate actual new order before exposing a legacy-only assertion view.

    current_bytes is the actual emitted index.json, not a normalized snapshot.
    Every field is checked against that body before a shallow metadata projection.
    The original catalog and every original row object remain unchanged.
    """
    for relative, pin in SOURCE_PINS.items():
        require(hashlib.sha256((ROOT / relative).read_bytes()).hexdigest() == pin, 'unrecognized order source: ' + relative)
    rank = source_part_rank(source_index_bytes)
    emitted = json.loads(current_bytes)
    require(isinstance(catalog, dict) and catalog == emitted, 'catalog differs from actual output body')
    rows = catalog.get('entries')
    if not isinstance(rows, list) or type(catalog.get('total')) is not int or catalog['total'] != len(rows):
        raise ValueError('catalog cardinality')
    seen = set()
    for row in rows:
        require(isinstance(row, dict), 'invalid catalog row')
        identity = tuple(row.get(field) for field in ('bookId', 'part', 'torah'))
        require(all(isinstance(token, str) and token for token in identity), 'invalid catalog identity')
        require(identity not in seen, 'duplicate catalog identity')
        seen.add(identity)
    books = [r['bookId'] for r in rows]
    require(all(a <= b for a, b in zip(books, books[1:])), 'book moved outside original global slots')
    unaffected = [r for r in rows if r['bookId'] not in APPROVED]
    lexical = lambda r: (r['bookId'], str(r['part']), str(r['torah']))
    require(all(lexical(a) < lexical(b) for a, b in zip(unaffected, unaffected[1:])), 'unapproved order change')
    legacy_rows = list(rows)
    for book in sorted(APPROVED):
        slots = [i for i, row in enumerate(rows) if row['bookId'] == book]
        group = [rows[i] for i in slots]
        def natural(row):
            key = (digit_tokens(row['part']), digit_tokens(row['torah']))
            if book == 'likutay-nanach' and rank is not None:
                return (rank.get(row['part'], len(rank)), key)
            return key
        keys = [natural(row) for row in group]
        require(all(a < b for a, b in zip(keys, keys[1:])), 'approved group is not in actual natural/source-index order: ' + book)
        for slot, row in zip(slots, sorted(group, key=lexical), strict=True):
            legacy_rows[slot] = row
        require([i for i, row in enumerate(legacy_rows) if row['bookId'] == book] == slots, 'changed book slots')
    require(len(legacy_rows) == len(rows) and {id(r) for r in legacy_rows} == {id(r) for r in rows}, 'changed row objects')
    legacy = dict(catalog, entries=legacy_rows)
    require(catalog == json.loads(current_bytes), 'inverse mutated actual catalog')
    return legacy
