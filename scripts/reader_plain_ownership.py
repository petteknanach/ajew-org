"""Catalog-bound physical Tanach owners, independent of a commentary's subject.

The `book` in likutay-nanach/tanach/*.json identifies the *commented-on* book.
It cannot own a primary chapter. Do not alias differently spelled subject slugs.
Preflight only materialized groups (complete groups required), allowing bounded
producer callers without silently accepting an incomplete selected book.
"""
from __future__ import annotations
import json
from pathlib import Path
import re

BOOK = r'tanach-[a-z][a-z0-9_-]*'
NUMBER = r'[1-9][0-9]*'
PRIMARY = re.compile(rf'({BOOK})/part-({NUMBER})/torah-({NUMBER})\.json\Z')
COMMENTARY = re.compile(rf'likutay-nanach/tanach/({BOOK})\.json\Z')


def protected_source(path: Path, reader: Path) -> bool:
    parts = path.relative_to(reader).parts
    return bool(parts and (parts[0].startswith('tanach-') or parts[:2] == ('likutay-nanach', 'tanach')))


def identity(path: Path, data: dict, reader: Path) -> tuple[str, str, str] | None:
    """Physical namespace, never a subject-derived destination or slug whitelist."""
    relative = path.relative_to(reader).as_posix()
    primary = PRIMARY.fullmatch(relative)
    commentary = COMMENTARY.fullmatch(relative)
    if primary:
        owner = (primary[1], primary[2], primary[3])
        for field in ('book', 'bookId'):
            if field in data and data[field] != owner[0]:
                raise ValueError(f'Primary source owner mismatch: {relative} {field}')
        for field, expected in [('part', owner[1]), ('torah', owner[2]), ('chapter', owner[2])]:
            if field in data and str(data[field]) != expected:
                raise ValueError(f'Primary source location mismatch: {relative} {field}')
        return owner
    if commentary:
        return 'likutay-nanach', 'tanach', path.stem
    if protected_source(path, reader) and path.name != 'index.json':
        raise ValueError(f'Unrecognized physical Tanach owner: {relative}')
    return None


def read_object(path: Path) -> dict:
    # Never follow a symlink at any component of a selected source/index.
    if any(p.is_symlink() for p in [path, *path.parents]):
        raise ValueError(f'Symlink source/index is not an owner: {path}')
    data = json.loads(path.read_bytes())
    if not isinstance(data, dict):
        raise ValueError(f'Expected source/index object: {path}')
    return data


def source_data(path: Path, project_segments, *, include_verse: bool = False) -> dict:
    data = read_object(path)
    segments = data.get('segments')
    if (not isinstance(data.get('title'), str) or not data['title'].strip()
            or not isinstance(segments, list) or not segments
            or any(not isinstance(s, dict) for s in segments)):
        raise ValueError(f'Missing title or complete segment body: {path}')
    # Use the actual exporter, with its primary/default or commentary mode.
    # Shape/cardinality alone cannot detect a dictionary that emits no text.
    # Never filter/pad bad rows or allow a shorter successful selected export.
    if len(project_segments(data, include_verse=include_verse)) != len(segments):
        raise ValueError(f'Nonemitting selected segment body: {path}')
    return data


def reject_selected_symlinks(reader: Path) -> None:
    """Check before rglob, which silently skips linked directories.

    Inspect only protected namespaces and their ancestors; unrelated/absent
    bounded groups do not select their global catalog's missing sources.
    """
    def reject(path):
        if path.is_symlink():
            raise ValueError(f'Symlink selected namespace/source/index: {path}')

    for path in (reader, *reader.parents, reader / 'likutay-nanach'):
        reject(path)

    def walk(path):
        reject(path)  # Also rejects dangling links before exists/is_dir.
        if path.is_dir():
            for child in path.iterdir():
                walk(child)

    for root in reader.glob('tanach-*'):
        walk(root)
    walk(reader / 'likutay-nanach/tanach')


def preflight(reader: Path, project_segments) -> dict[str, tuple[str, str, str]]:
    """Bind every selected physical source to exactly one catalog membership.

    Validate before the producer clears its previous output. No missing chapter,
    malformed selected JSON or ambiguous membership may become a partial full.txt.
    """
    reject_selected_symlinks(reader)
    bindings: dict[str, tuple[str, str, str]] = {}
    primary_groups: dict[tuple[str, str], list[Path]] = {}
    commentary_files = []
    for path in sorted(reader.rglob('*.json')):
        if not protected_source(path, reader) or path.name == 'index.json':
            continue
        data = source_data(path, project_segments, include_verse=bool(COMMENTARY.fullmatch(path.relative_to(reader).as_posix())))
        owner = identity(path, data, reader)
        if owner is None:
            raise ValueError(f'Missing physical source identity: {path}')
        relative = path.relative_to(reader).as_posix()
        bindings[relative] = owner
        if owner[0] == 'likutay-nanach':
            commentary_files.append(path)
        else:
            primary_groups.setdefault((owner[0], owner[1]), []).append(path)
    # An index with all chapters missing is still a selected incomplete group.
    for path in reader.glob('tanach-*/part-*/index.json'):
        match = re.fullmatch(rf'({BOOK})/part-({NUMBER})/index\.json', path.relative_to(reader).as_posix())
        if match is None:
            raise ValueError(f'Invalid primary part index: {path}')
        primary_groups.setdefault((match[1], match[2]), [])
    if primary_groups:
        books = read_object(reader / 'catalog.json').get('books')
        if not isinstance(books, list) or any(not isinstance(b, dict) for b in books):
            raise ValueError('Missing primary book catalog')
        for (book, part), files in primary_groups.items():
            candidates = [b for b in books if b.get('id') == book]
            if len(candidates) != 1:
                raise ValueError(f'Missing/ambiguous primary catalog owner: {book}')
            parts = candidates[0].get('parts')
            if not isinstance(parts, list) or any(not isinstance(p, dict) for p in parts):
                raise ValueError(f'Invalid primary parts: {book}')
            declared = [p for p in parts if str(p.get('part')) == part]
            if len(declared) != 1:
                raise ValueError(f'Missing/ambiguous primary part: {book}/{part}')
            declared = declared[0]
            count = declared.get('totalTorahs')
            index_url = f'/reader/{book}/part-{part}/index.json'
            if type(count) is not int or count <= 0 or declared.get('indexUrl') != index_url:
                raise ValueError(f'Invalid primary index declaration: {book}/{part}')
            index = read_object(reader / index_url.removeprefix('/reader/'))
            items = index.get('items')
            if (index.get('bookId') != book or index.get('totalItems') != count
                    or not isinstance(items, list) or len(items) != count
                    or any(not isinstance(i, dict) for i in items)
                    or [i.get('number') for i in items] != list(range(1, count + 1))):
                raise ValueError(f'Incomplete/ambiguous primary chapter index: {book}/{part}')
            expected = {f'{book}/part-{part}/torah-{n}.json' for n in range(1, count + 1)}
            if {p.relative_to(reader).as_posix() for p in files} != expected:
                raise ValueError(f'Primary book requires every indexed chapter once: {book}/{part}')
            for item in items:
                n = item['number']
                data = source_data(reader / f'{book}/part-{part}/torah-{n}.json', project_segments)
                if (item.get('url') != f'/reader/{book}/{part}/{n}'
                        or any(data.get(k) != item.get(k) for k in ('title', 'hebrewTitle'))):
                    raise ValueError(f'Primary chapter header/catalog mismatch: {book}/{part}/{n}')
    if commentary_files:
        books = read_object(reader / 'likutay-nanach/tanach/index.json').get('books')
        if not isinstance(books, dict):
            raise ValueError('Missing commentary membership catalog')
        members = {}
        for subject, rows in books.items():
            if not isinstance(subject, str) or not re.fullmatch(BOOK, subject) or not isinstance(rows, list):
                raise ValueError('Invalid commentary subject index')
            for row in rows:
                if not isinstance(row, dict):
                    raise ValueError('Invalid commentary member')
                chapter, file = row.get('chapter'), row.get('file')
                if not isinstance(chapter, str) or (chapter and not re.fullmatch(NUMBER, chapter)):
                    raise ValueError('Invalid commentary chapter')
                expected = f'/reader/likutay-nanach/tanach/{subject}' + (f'-{chapter}' if chapter else '') + '.json'
                if file != expected or file in members or type(row.get('segments')) is not int or row['segments'] <= 0:
                    raise ValueError(f'Ambiguous/invalid commentary catalog member: {file}')
                members[file] = (subject, chapter, row['segments'])
        selected = set()
        for path in commentary_files:
            url = '/reader/' + path.relative_to(reader).as_posix()
            if url not in members:
                raise ValueError(f'Unindexed commentary source owner: {url}')
            subject, chapter, count = members[url]
            data = source_data(path, project_segments, include_verse=True)
            if (data.get('book') != subject or data.get('chapter', '') != chapter
                    or len(data['segments']) != count):
                raise ValueError(f'Commentary source/catalog mismatch: {url}')
            selected.add(subject)
        for subject in selected:
            for row in books[subject]:
                path = reader / row['file'].removeprefix('/reader/')
                if not path.is_file():
                    raise FileNotFoundError(f'Missing indexed commentary owner: {path}')
    if len(set(bindings.values())) != len(bindings):
        raise ValueError('Distinct physical sources claim the same Tanach export')
    return bindings


def validate_entries(entries: list[dict], entry_sources: dict, bindings: dict) -> None:
    seen = set()
    for entry in entries:
        source = entry_sources.get(id(entry))
        ids = (entry['bookId'], str(entry['part']), str(entry['torah']))
        if source not in bindings:
            if ids in bindings.values() or ids[0].startswith('tanach-') or ids[:2] == ('likutay-nanach', 'tanach'):
                raise ValueError('Unbound Tanach catalog claimant')
            continue
        if (source in seen or ids != bindings[source]
                or entry['url'] != '/reader-plain/' + '/'.join(ids) + '/'):
            raise ValueError('Repeated/mismatched Tanach catalog owner')
        seen.add(source)
    if seen != set(bindings):
        raise ValueError('Selected source missing from plain catalog')
