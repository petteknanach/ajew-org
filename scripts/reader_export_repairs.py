"""Physical ownership and lossless projections for layered/compound Reader inputs.

These are export identities, not new human routes or editorial translations.
Keep the source record intact alongside its readable, owning-Reader projection.
"""
from __future__ import annotations
import copy
import json
from pathlib import Path
import re

PNC = 'pettek-nanach-commentary'
LAYERS = (('beginner', 'Beginner', 'מתחיל'),
          ('intermediate', 'Intermediate', 'ביניים'),
          ('scholarly', 'Scholarly', 'עיוני'))
NUMBER = r'[1-9][0-9]*'


def selected(path: Path, reader: Path) -> bool:
    rel = path.relative_to(reader).parts
    return ((len(rel) == 2 and rel[:1] == (PNC,)) or rel[:2] == ('likutay-nanach', 'volume-4')
            or (rel[:1] == ('likutay-moharan',) and path.stem.startswith('preface-section-')))


def identity(path: Path, reader: Path) -> tuple[str, str, str] | None:
    rel = path.relative_to(reader).as_posix()
    match = re.fullmatch(rf'{PNC}/(torah|tinyana)-({NUMBER})\.json', rel)
    if match:
        return PNC, '1' if match[1] == 'torah' else '2', match[2]
    if path.parent == reader / PNC and path.name != 'index.json':
        return PNC, '1', path.stem
    match = re.fullmatch(rf'likutay-nanach/volume-4/chapter-({NUMBER})\.json', rel)
    if match:
        # torah is a subject/Tinyana reference, NOT the physical chapter number.
        return 'likutay-nanach', 'volume-4', match[1]
    match = re.fullmatch(rf'likutay-moharan/part-({NUMBER})/(preface-section-{NUMBER})\.json', rel)
    if match:
        return 'likutay-moharan', match[1], match[2]
    return None


def source_object(path: Path) -> dict:
    if any(p.is_symlink() for p in (path, *path.parents)):
        raise ValueError(f'Symlink is not a physical export owner: {path}')
    data = json.loads(path.read_bytes())
    if not isinstance(data, dict):
        raise ValueError(f'Invalid selected export source: {path}')
    return data


def pnc_projection(seg: dict) -> tuple[str, str]:
    """Mirror extractPncTexts in the actual PNC [part]/[torah].astro.

    Legacy string beginner is English; intermediate/scholarly strings are
    Hebrew. Object layers carry their own languages. Never infer translations.
    """
    he = [seg['he']] if seg.get('he') else []
    en = [seg['en']] if seg.get('en') else []
    layers = seg.get('layers') if seg.get('layers') is not None else seg
    if not isinstance(layers, dict):
        raise ValueError('Invalid PNC layers')
    beginner = layers.get('beginner')
    if isinstance(beginner, str):
        if beginner:
            en.append(beginner)
        for key in ('intermediate', 'scholarly'):
            value = layers.get(key)
            if isinstance(value, str) and value:
                he.append(value)
    else:
        for key, english, hebrew in LAYERS:
            value = layers.get(key)
            if isinstance(value, str):
                h = e = value  # layerText(string, lang), exactly as Reader
            elif isinstance(value, dict):
                h, e = value.get('he', ''), value.get('en', '')
            elif value is None:
                h = e = ''
            else:
                raise ValueError('Invalid PNC layer body')
            if h:
                he.append(hebrew + ':\n' + h)
            if e:
                en.append(english + ':\n' + e)
    return '\n\n'.join(he), '\n\n'.join(en)


def project(data: dict, *, layered: bool) -> list[dict]:
    segments = data.get('segments')
    if not isinstance(segments, list) or not segments:
        raise ValueError('Selected export requires its complete segment body')
    out = []
    for position, seg in enumerate(segments, 1):
        if not isinstance(seg, dict):
            raise ValueError('Invalid selected source segment')
        if layered:
            he, en = pnc_projection(seg)
        else:
            # Dedicated Nanach/Moharan Reader panes; do not trim source ink.
            he, en = seg.get('he_nikud') or seg.get('he') or '', seg.get('en') or ''
        out.append({'index': seg.get('index') or position, 'he': he, 'en': en,
                    'sourceIndex': seg.get('index'), 'sourcePosition': position,
                    'sourceSegment': copy.deepcopy(seg)})
    # Empty records in a populated owning Reader (e.g. Tinyana 34) retain
    # their exact positions; never pad them with invented prose or drop them.
    if not any(s['he'] or s['en'] for s in out):
        raise ValueError('Selected source emits no Reader text')
    return out


def readable_blocks(seg: dict, *, layered: bool) -> list[tuple[str, str, str]]:
    """(source label, language, exact text), including references and notes."""
    source = seg['sourceSegment']
    blocks = []
    consumed = set()
    if layered:
        for lang in ('he', 'en'):
            if source.get(lang):
                blocks.append(('Source text', lang, source[lang]))
        consumed.update(('he', 'en', 'layers', 'beginner', 'intermediate', 'scholarly'))
        layers = source.get('layers', source)
        legacy = isinstance(layers.get('beginner'), str)
        for key, english, _ in LAYERS:
            value = layers.get(key)
            if isinstance(value, str):
                languages = [('en' if key == 'beginner' else 'he', value)] if legacy else [('he', value), ('en', value)]
            elif isinstance(value, dict):
                languages = [(lang, value.get(lang, '')) for lang in ('he', 'en')]
            else:
                languages = []
            for lang, text in languages:
                if text:
                    blocks.append((english, lang, text))
            if isinstance(value, dict):
                for field, body in value.items():
                    if field not in ('he', 'en'):
                        blocks.extend(apparatus_blocks(f'{english} — {field}', body))
    else:
        for lang in ('he', 'en'):
            if seg[lang]:
                blocks.append(('Source text', lang, seg[lang]))
        consumed.update(('he', 'he_nikud', 'en'))
        if source.get('he_nikud') and source.get('he') and source['he'] != source['he_nikud']:
            blocks.append(('Original Hebrew', 'he', source['he']))
    for field, value in source.items():
        if field not in consumed and field not in ('index',):
            blocks.extend(apparatus_blocks(field, value))
    return blocks


def apparatus_blocks(label, value):
    if isinstance(value, dict):
        return [block for key, body in value.items()
                for block in apparatus_blocks(f'{label} — {key}', body)]
    if isinstance(value, list):
        return [block for i, body in enumerate(value, 1)
                for block in apparatus_blocks(f'{label} {i}', body)]
    if value is None or value == '':
        return []
    return [(label, 'he' if re.search(r'[\u0590-\u05ff]', str(value)) else 'en',
             value if isinstance(value, str) else json.dumps(value, ensure_ascii=False))]


def preflight(reader: Path, infer_ids) -> dict[str, tuple[str, str, str]]:
    """Authenticate complete materialized domains before removing old output.

    PNC membership follows the real template's file scan, not its stale 60-row
    discovery index. Nanach's human chapter subset is authenticated against
    both the book/volume indexes; all other physical inputs remain exports,
    never invented human chapters. Their original subject namespaces survive.
    """
    bindings = {}
    domains = [reader / PNC, reader / 'likutay-nanach/volume-4']
    domains += list((reader / 'likutay-moharan').glob('part-*'))
    for directory in domains:
        if directory.is_symlink():
            raise ValueError('Symlink selected export namespace')
        for path in sorted(directory.glob('*.json')):
            if not selected(path, reader) or path.name == 'index.json':
                continue
            data = source_object(path)
            project(data, layered=directory == reader / PNC)
            owner = infer_ids(path, data)
            if owner in bindings.values():
                raise ValueError(f'Distinct selected physical owners collide: {path}')
            bindings[path.relative_to(reader).as_posix()] = owner
    directory = reader / 'likutay-nanach/volume-4'
    # An indexed materialized group must be complete. Existing bounded callers
    # also select individual chapter witnesses without claiming an index group.
    if (directory / 'index.json').exists():
        index = source_object(directory / 'index.json')
        books = source_object(reader / 'catalog.json')['books']
        declarations = [p for b in books if b.get('id') == 'likutay-nanach'
                        for p in b.get('parts', []) if str(p.get('part')) == '4']
        if len(declarations) != 1:
            raise ValueError('Missing/ambiguous Nanach volume catalog')
        declaration = declarations[0]
        rows = index.get('torahs')
        count = declaration.get('totalTorahs')
        if (declaration.get('indexUrl') != '/reader/likutay-nanach/volume-4/index.json'
                or not isinstance(rows, list) or len(rows) != count
                or [r.get('number') for r in rows] != list(range(1, count + 1))):
            raise ValueError('Incomplete/ambiguous Nanach volume index')
        for row in rows:
            data = source_object(directory / f'chapter-{row["number"]}.json')
            if data.get('title') != row.get('title'):
                raise ValueError('Nanach chapter/index title mismatch')
    return bindings


def validate_entries(entries, entry_sources, bindings):
    seen = set()
    for row in entries:
        source = entry_sources.get(id(row))
        owner = (row['bookId'], str(row['part']), str(row['torah']))
        if source in bindings:
            if source in seen or owner != bindings[source]:
                raise ValueError('Repeated/mismatched selected export owner')
            seen.add(source)
        elif owner in bindings.values():
            raise ValueError('Foreign source claims a selected export owner')
    if seen != set(bindings):
        raise ValueError('Missing selected physical export owner')


def reading_key(row):
    # Natural numeric order; retain literal (possibly Hebrew) subject tokens.
    def natural(value):
        return tuple((0, int(s)) if s.isdigit() else (1, s)
                     for s in re.split(r'(\d+)', str(value)) if s)
    return natural(row['part']), natural(row['torah'])


def reading_order(rows, reader):
    if (rows and rows[0]['bookId'] == 'likutay-nanach'
            and (reader / 'likutay-nanach/index.json').exists()):
        index = source_object(reader / 'likutay-nanach/index.json')
        parts = index.get('parts', [])
        names = [p.get('name') for p in parts]
        if (not names or len(set(names)) != len(names)
                or any(p.get('path') != f'/reader/likutay-nanach/{p.get("name")}/' for p in parts)):
            raise ValueError('Ambiguous Nanach full-book source order')
        rank = {part: i for i, part in enumerate(names)}
        return sorted(rows, key=lambda r: (rank.get(r['part'], len(rank)), reading_key(r)))
    return sorted(rows, key=reading_key)
