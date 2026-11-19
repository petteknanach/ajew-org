#!/usr/bin/env python3
"""Materialize only the reviewed Kabala Reader paths and plain downloads.

The tracked corpus is deterministic gzip NDJSON (one [path, UTF-8 string]
record per file). The catalog, not the archive, grants destination membership.
Use --pack against a reviewed import; production only uses the default read.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = Path('src/data/kabala-corpus.jsonl.gz')
CATALOG = Path('src/data/kabala-catalog.json')
BOOK_ID = re.compile(r'kabala-[0-9a-f]{12}\Z')
MAX_ROW = 9_000_000
MAX_PAYLOAD = 155_000_000


def expected_files(root: Path) -> dict[str, tuple[str, int, str]]:
    entries = json.loads((root / CATALOG).read_bytes())['entries']
    seen = set()
    files = {}
    for entry in entries:
        key = entry['id']
        if not BOOK_ID.fullmatch(key) or key in seen:
            raise ValueError(f'invalid or duplicate Kabala id: {key!r}')
        seen.add(key)
        kind = entry['kind']
        sections = entry['sections']
        if entry.get('aliasOf'):
            continue
        if kind == 'pdf':
            if sections or entry['download'] != f'/kabala-files/{key}.pdf':
                raise ValueError(f'invalid PDF catalog entry: {key}')
            if not (root / 'public' / entry['download'].lstrip('/')).is_file():
                raise ValueError(f'missing PDF: {key}')
            continue
        if kind not in ('doc', 'txt') or not sections or entry['download'] != f'/kabala-files/{key}.txt':
            raise ValueError(f'invalid text catalog entry: {key}')
        files[f'public/kabala-files/{key}.txt'] = (key, 0, '')
        for i, section in enumerate(sections, 1):
            if type(section['number']) is not int or section['number'] != i:
                raise ValueError(f'nonsequential section: {key}/{section!r}')
            files[f'public/reader/{key}/volume-1/torah-{i}.json'] = (key, i, section['title'])
    if not files:
        raise ValueError('Kabala contains no texts')
    return files


def valid_text(name: str, contents: str, owner: tuple[str, int, str]) -> None:
    if not isinstance(contents, str) or not contents.strip() or '\x00' in contents:
        raise ValueError(f'blank/invalid body: {name}')
    book, n, title = owner
    if not n:
        return
    unit = json.loads(contents)
    if (unit['bookId'], str(unit['part']), str(unit['torah'])) != (book, '1', str(n)):
        raise ValueError(f'section binding drift: {name}')
    if unit['title'] != title or not unit['segments']:
        raise ValueError(f'section title/body drift: {name}')
    indices = set()
    for seg in unit['segments']:
        index, text = seg['index'], seg['he']
        if set(seg) - {'index', 'he', 'kind'} or type(index) is not int or index < 1 or index in indices or not isinstance(text, str) or not text.strip():
            raise ValueError(f'bad paragraph or unexpected field: {name}')
        indices.add(index)


def read_pack(root: Path, expected: dict):
    with gzip.open(root / ARCHIVE, 'rb') as stream:
        remaining = set(expected)
        payload = 0
        while raw := stream.readline(MAX_ROW + 1):
            payload += len(raw)
            if len(raw) > MAX_ROW or payload > MAX_PAYLOAD or not raw.endswith(b'\n'):
                raise ValueError('Kabala archive exceeds its admitted text envelope')
            name, contents = json.loads(raw)
            if not isinstance(name, str) or name not in remaining:
                raise ValueError(f'foreign or duplicate archive path: {name!r}')
            remaining.remove(name)
            valid_text(name, contents, expected[name])
            yield name, contents.encode('utf-8')
        if remaining:
            raise ValueError(f'Kabala archive missing {len(remaining)} files')


def materialize(root: Path) -> None:
    expected = expected_files(root)
    # Read CRC/EOF and verify complete membership before touching public paths.
    pins = {name: hashlib.sha256(body).digest() for name, body in read_pack(root, expected)}
    # Obsolete spellings must not silently become search/plain-reader entries.
    reader = root / 'public/reader'
    present = {p.relative_to(root).as_posix() for d in reader.glob('kabala-*')
               if BOOK_ID.fullmatch(d.name) for p in d.rglob('*.json')}
    if extras := present - set(expected):
        raise ValueError(f'Obsolete Kabala Reader files must be reconciled before build: {sorted(extras)[:5]}')
    for name, body in read_pack(root, expected):
        if pins[name] != hashlib.sha256(body).digest():
            raise ValueError(f'archive changed between validation and materialization: {name}')
        target = root / name
        for parent in (target, *target.parents):
            if parent == root:
                break
            if parent.is_symlink():
                raise ValueError(f'symlink at Kabala target: {parent}')
        if target.is_file() and target.read_bytes() == body:
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        pending = target.with_suffix(target.suffix + '.kabala-new')
        with pending.open('xb') as stream:
            stream.write(body)
        pending.replace(target)
    print(f'Kabala: {len(expected)} validated Hebrew Reader and download files')


def pack(root: Path, reviewed: Path) -> None:
    expected = expected_files(root)
    with (root / ARCHIVE).open('xb') as file:
        with gzip.GzipFile(filename='', mode='wb', fileobj=file, mtime=0, compresslevel=6) as stream:
            for name, owner in sorted(expected.items()):
                data = (reviewed / name).read_bytes().decode('utf-8')
                valid_text(name, data, owner)
                stream.write(json.dumps([name, data], ensure_ascii=False, separators=(',', ':')).encode('utf-8') + b'\n')
    for name, body in read_pack(root, expected):
        if body != (reviewed / name).read_bytes():
            raise ValueError(f'non-identical archive inverse: {name}')
    print(f'Kabala pack: {len(expected)} files round-tripped byte-for-byte')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--pack', type=Path, metavar='REVIEWED_IMPORT', help='write a fresh corpus archive from the reviewed input tree')
    args = parser.parse_args()
    root = args.root.resolve()
    if args.pack:
        pack(root, args.pack.resolve())
    else:
        materialize(root)
