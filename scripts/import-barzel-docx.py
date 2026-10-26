#!/usr/bin/env python3
"""Import the two hash-bound Barzel DOCX witnesses without editing their text.

The reviewed structure fixture records literal OOXML paragraph/line locations.
Run with --sources DIRECTORY. No translations, spelling changes, Unicode
normalization, deduplication, or inferred teaching numbers are permitted.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
FIXTURE = ROOT / 'scripts/data/barzel-docx-structure-20261026.json'
PROVENANCE = ROOT / 'public/reader/reviewed/barzel-docx-provenance-20261026.json'


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def extract(source: Path, expected_sha: str) -> list[str]:
    assert digest(source.read_bytes()) == expected_sha, f'Source changed: {source.name}'
    with zipfile.ZipFile(source) as archive:
        body = ET.fromstring(archive.read('word/document.xml')).find(W + 'body')
    assert body is not None
    assert not list(body.iter(W + 'tbl')), 'Tables require a separately reviewed extractor'
    for tag in ['ins', 'del', 'txbxContent', 'footnoteReference', 'endnoteReference']:
        assert not list(body.iter(W + tag)), f'Unreviewed source apparatus: {tag}'
    paragraphs = []
    for paragraph in body.findall(W + 'p'):
        text = []
        for node in paragraph.iter():
            if node.tag == W + 't':
                text.append(node.text or '')
            elif node.tag in (W + 'br', W + 'cr'):
                assert node.get(W + 'type', 'textWrapping') == 'textWrapping'
                text.append('\n')
            elif node.tag == W + 'tab':
                text.append('\t')
            elif node.tag == W + 'noBreakHyphen':
                text.append('\u2011')
            elif node.tag == W + 'softHyphen':
                text.append('\u00ad')
        paragraphs.append(''.join(text))
    return paragraphs


def source_span(paragraph: int, start: int, end: int) -> dict:
    return {'paragraph': paragraph, 'start': start, 'end': end}


def segment(paragraphs: list[str], p: int, start: int, end: int, role: str, label: str = '') -> dict:
    return {'he': paragraphs[p][start:end], 'en': '', 'role': role,
            'sourceLabel': label, 'sourceSpan': source_span(p, start, end)}


def first_line_end(text: str) -> int:
    found = text.find('\n')
    return found + 1 if found >= 0 else len(text)


def hebrew_label(number: int) -> str:
    tens = ['', 'י', 'כ', 'ל', 'מ', 'נ']
    units = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
    if number == 15:
        return 'טו'
    if number == 16:
        return 'טז'
    return tens[number // 10] + units[number % 10]


def make_book(spec: dict, source_dir: Path) -> tuple[dict, dict, list[dict]]:
    source = source_dir / spec['filename']
    paragraphs = extract(source, spec['sha256'])
    assert len(paragraphs) == spec['paragraphCount']
    assert sum(bool(p.strip()) for p in paragraphs) == spec['nonblankParagraphCount']
    book_id = spec['id']
    leafs = []
    for number, section in enumerate(spec['sections'], 1):
        p = section['paragraph']
        text = paragraphs[p]
        heading_end = first_line_end(text)
        assert text[:heading_end].rstrip('\n') == section['heading'], (book_id, p, 'heading drift')
        leaf = {
            'id': f'{book_id}-1-{number}', 'book': book_id, 'part': 1, 'torah': number,
            'title': section['heading'], 'hebrewTitle': section['heading'],
            'author': 'Michoel Barzel', 'hebrewAuthor': 'מיכאל ברזל',
            'hasEnglish': False, 'source': spec['filename'], 'sourceSha256': spec['sha256'],
            'sourceHeading': {'he': text[:heading_end], 'sourceSpan': source_span(p, 0, heading_end)},
            'preHeadingSegments': [], 'segments': [],
            'navigation': {'prevUrl': f'/reader/{book_id}/1/{number - 1}/' if number > 1 else None,
                           'nextUrl': f'/reader/{book_id}/1/{number + 1}/' if number < len(spec['sections']) else None},
        }
        for prefix in section.get('prefixParagraphs', []):
            leaf['preHeadingSegments'].append(segment(paragraphs, prefix, 0, len(paragraphs[prefix]), 'divider'))
        # These are two literal source heading occurrences in the same scope,
        # not duplicate prose or a second collection. A composite display title
        # also conserves their order in the normal plain-text export header.
        leaf['hebrewTitle'] = ''.join(s['he'] for s in leaf['preHeadingSegments']) + section['heading']
        starts = section.get('itemStartLines', [])
        if starts:
            lines = text.splitlines(keepends=True)
            offsets = [0]
            for line in lines:
                offsets.append(offsets[-1] + len(line))
            first_item = offsets[starts[0]]
            if first_item > heading_end:
                leaf['segments'].append(segment(paragraphs, p, heading_end, first_item, 'subtitle'))
            tail = section.get('tailLine')
            body_end = offsets[tail] if tail is not None else len(text)
            for i, start_line in enumerate(starts):
                start = offsets[start_line]
                end = offsets[starts[i + 1]] if i + 1 < len(starts) else body_end
                label = hebrew_label(i + 1)
                if section.get('pairedLabels'):
                    assert lines[start_line].strip() == label
                    assert lines[start_line + 1].startswith(label + '. ')
                else:
                    assert lines[start_line].startswith(label + ' '), (book_id, p, start_line, label)
                leaf['segments'].append(segment(paragraphs, p, start, end, 'numbered-item', label))
            if tail is not None:
                leaf['segments'].append(segment(paragraphs, p, body_end, len(text), 'cross-reference'))
        elif heading_end < len(text):
            leaf['segments'].append(segment(paragraphs, p, heading_end, len(text), 'prose'))
        for continuation in section.get('continuationParagraphs', []):
            leaf['segments'].append(segment(paragraphs, continuation, 0, len(paragraphs[continuation]), 'prose'))
        for closing in section.get('closingParagraphs', []):
            leaf['segments'].append(segment(paragraphs, closing, 0, len(paragraphs[closing]), 'closing'))
        for i, seg in enumerate(leaf['segments'], 1):
            seg['index'] = i
        leaf['stats'] = {'totalSegments': len(leaf['segments']),
                         'numberedSourceItems': len(starts), 'translatedSegments': 0,
                         'translationPercent': 0}
        leafs.append(leaf)

    # Authenticate exhaustive ordered source-span coverage, including headings,
    # duplicate divider occurrences, continuations, closings, TOC and whitespace.
    spans = []
    for leaf in leafs:
        spans.extend(leaf['preHeadingSegments'])
        spans.append(leaf['sourceHeading'])
        spans.extend(leaf['segments'])
    nonreading = []
    for p, text in enumerate(paragraphs):
        if p == 0 or not text.strip():
            nonreading.append({'paragraph': p, 'role': 'navigation' if p == 0 else 'layout', 'text': text})
    reading_paragraphs = [p for p, t in enumerate(paragraphs) if p != 0 and t.strip()]
    assert sorted({s['sourceSpan']['paragraph'] for s in spans}) == reading_paragraphs
    previous = (-1, -1)
    for item in spans:
        span = item['sourceSpan']
        pos = (span['paragraph'], span['start'])
        assert pos >= previous, (book_id, 'source-order drift', previous, pos)
        previous = pos
    for p in reading_paragraphs:
        selected = [s for s in spans if s['sourceSpan']['paragraph'] == p]
        cursor = 0
        for item in selected:
            span = item['sourceSpan']
            assert span['start'] == cursor and span['end'] > cursor
            assert item['he'] == paragraphs[p][span['start']:span['end']]
            assert item.get('en', '') == ''
            cursor = span['end']
        assert cursor == len(paragraphs[p]), (book_id, p, cursor, len(paragraphs[p]))
        assert ''.join(s['he'] for s in selected) == paragraphs[p]
    assert digest(source.read_bytes()) == spec['sha256'], 'Original input was modified'

    total_segments = sum(len(leaf['segments']) for leaf in leafs)
    index = {
        'book': book_id, 'title': spec['title'], 'hebrewTitle': spec['hebrewTitle'],
        'author': 'Michoel Barzel', 'hebrewAuthor': 'מיכאל ברזל', 'part': 1,
        'hasEnglish': False, 'source': spec['filename'], 'sourceSha256': spec['sha256'],
        'totalTorahs': len(leafs), 'totalSegments': total_segments,
        'torahs': [{'number': leaf['torah'], 'displayNumber': leaf['torah'], 'title': leaf['title'],
                    'hebrewTitle': leaf['hebrewTitle'], 'segments': len(leaf['segments']),
                    'url': f'/reader/{book_id}/1/{leaf["torah"]}/'} for leaf in leafs],
    }
    provenance = {
        'book': book_id, 'filename': spec['filename'], 'sha256': spec['sha256'],
        'paragraphCount': len(paragraphs), 'nonblankParagraphCount': spec['nonblankParagraphCount'],
        'readingParagraphs': reading_paragraphs,
        'paragraphTextSha256': [digest(t.encode('utf-8')) for t in paragraphs],
        'nonReadingParagraphs': nonreading,
        'numberedSourceItems': sum(leaf['stats']['numberedSourceItems'] for leaf in leafs),
        'verified': 'Every reading paragraph is exactly covered once, in source order, by unnormalized source spans.',
    }
    return index, provenance, leafs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sources', type=Path, required=True)
    args = parser.parse_args()
    fixture = json.loads(FIXTURE.read_text(encoding='utf-8'))
    provenance = {'schemaVersion': 1, 'date': '2026-10-26',
                  'policy': 'Two independent Hebrew source witnesses; no translation, normalization, correction or deduplication.',
                  'sources': []}
    catalog_path = ROOT / 'public/reader/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    imported = []
    for spec in fixture['books']:
        index, witness, leafs = make_book(spec, args.sources)
        write_json(ROOT / 'public/reader' / spec['id'] / 'index.json', index)
        for leaf in leafs:
            write_json(ROOT / 'public/reader' / spec['id'] / 'part-1' / f'torah-{leaf["torah"]}.json', leaf)
        provenance['sources'].append(witness)
        entry = {
            'id': spec['id'], 'title': spec['title'], 'hebrewTitle': spec['hebrewTitle'],
            'author': 'Michoel Barzel', 'hebrewAuthor': 'מיכאל ברזל', 'hasEnglish': False,
            'parts': [{'part': 1, 'title': spec['title'], 'hebrewTitle': spec['hebrewTitle'],
                       'totalTorahs': len(leafs), 'totalSegments': index['totalSegments'],
                       'indexUrl': f'/reader/{spec["id"]}/index.json'}],
        }
        existing = [i for i, b in enumerate(catalog['books']) if b['id'] == spec['id']]
        assert len(existing) <= 1
        if existing:
            catalog['books'][existing[0]] = entry
        else:
            catalog['books'].append(entry)
        imported.append({'book': spec['id'], 'sections': len(leafs),
                         'segments': index['totalSegments'], 'numberedSourceItems': witness['numberedSourceItems'],
                         'sourceSha256': spec['sha256']})
    write_json(PROVENANCE, provenance)
    write_json(catalog_path, catalog)
    print(json.dumps({'imported': imported, 'sourceConservation': 'PASS'}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
