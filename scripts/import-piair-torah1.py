#!/usr/bin/env python3
"""Prepare a section-aware Pe'er HaLikutim Torah 1 dataset for the Super Reader.

The PDF text layer is retained as an unreviewed witness, never silently corrected.
Semantic sections follow the publisher's own guide and mirrored odd/even layout.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

import fitz

SOURCE = Path('/mnt/c/Users/Pettek/Downloads/Piair halikutim - likutay moharan 1 - 1-6 - Hebrewbooks_org_54911.pdf')
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'reader' / 'super' / 'likutay-moharan' / '1' / '1' / 'peer-halikutim'
FIRST_PAGE = 45
LAST_PAGE = 64

PAGE_SECTIONS = {
    45: [1, 2],
    46: [2, 3],
    **{page: [3] for page in range(47, 58)},
    58: [4],
    59: [5],
    60: [6],
    61: [6, 7],
    62: [7],
    63: [8],
    64: [8],
}

SECTION_DEFS = [
    {'id': 'likutay-moharan', 'he': 'ליקוטי מוהר״ן', 'en': 'Central Torah', 'purpose': "Rabbi Nachman's canonical teaching", 'stage': 'read'},
    {'id': 'revelation-story', 'he': 'סיפור התגלות המאמר', 'en': 'How the Torah was revealed', 'purpose': 'Background and transmission story', 'stage': 'understand'},
    {'id': 'nahal-novea', 'he': 'נחל נובע', 'en': 'Direct explanation', 'purpose': 'Close explanation from Rabbi Nachman and early Breslov sources', 'stage': 'understand'},
    {'id': 'mekor-chokhma', 'he': 'מקור חכמה', 'en': 'Direct sources', 'purpose': 'Tanakh, Chazal, Zohar and Kabbalistic sources', 'stage': 'deepen'},
    {'id': 'yalkut-hanahal', 'he': 'ילקוט הנחל', 'en': 'Further explanation', 'purpose': 'Later and supplementary Breslov explanations', 'stage': 'deepen'},
    {'id': 'miluei-chokhma', 'he': 'מילואי חכמה', 'en': 'Further sources', 'purpose': 'Additional source material beyond the direct source column', 'stage': 'deepen'},
    {'id': 'concepts', 'he': 'ערכים וכינויים', 'en': 'Concepts and terms', 'purpose': 'Definitions of important concepts and symbolic names', 'stage': 'deepen'},
    {'id': 'translator', 'he': 'המתרגם', 'en': 'Aramaic translated', 'purpose': 'Hebrew translations of Aramaic quotations', 'stage': 'understand'},
    {'id': 'advice', 'he': 'עצה ותושיה', 'en': 'Practical guidance', 'purpose': 'Practical advice distilled from the Torah', 'stage': 'apply'},
    {'id': 'prayer', 'he': 'ואני תפלה', 'en': 'Prayer', 'purpose': 'Prayer corresponding to the Torah', 'stage': 'pray'},
]
SECTION_IDS = {item['id'] for item in SECTION_DEFS}


def normalize_text(value: str) -> str:
    return re.sub(r'\s+', ' ', value).strip()


def hebrew_key(value: str) -> str:
    return re.sub(r'[^א-ת]', '', value)


def merge_bbox(boxes: list[list[float]]) -> list[float]:
    return [
        round(min(box[0] for box in boxes), 1),
        round(min(box[1] for box in boxes), 1),
        round(max(box[2] for box in boxes), 1),
        round(max(box[3] for box in boxes), 1),
    ]


def page_lines(page: fitz.Page) -> list[dict[str, Any]]:
    lines: list[dict[str, Any]] = []
    raw_dict: dict[str, Any] = page.get_text('dict')  # type: ignore[assignment]
    raw_blocks = raw_dict.get('blocks', [])
    for block_number, block in enumerate(raw_blocks, start=1):
        if not isinstance(block, dict):
            continue
        for line_number, line in enumerate(block.get('lines', []), start=1):
            spans = []
            for span in line.get('spans', []):
                text = normalize_text(str(span.get('text', '')))
                if not text:
                    continue
                spans.append({
                    'text': text,
                    'bbox': [float(value) for value in span['bbox']],
                    'size': float(span.get('size', 0)),
                })
            if not spans:
                continue
            spans.sort(key=lambda span: span['bbox'][0], reverse=True)
            lines.append({
                'block': block_number,
                'line': line_number,
                'text': normalize_text(' '.join(span['text'] for span in spans)),
                'bbox': merge_bbox([span['bbox'] for span in spans]),
                'spans': spans,
                'maxSize': max(span['size'] for span in spans),
            })
    return lines


def heading_landmarks(lines: list[dict[str, Any]]) -> dict[str, float | bool | None]:
    joined_by_y: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for line in lines:
        joined_by_y[round(line['bbox'][1])].append(line)

    candidates = []
    for y, grouped in joined_by_y.items():
        ordered = sorted(grouped, key=lambda line: line['bbox'][0], reverse=True)
        text = normalize_text(' '.join(line['text'] for line in ordered))
        candidates.append((float(y), hebrew_key(text), text))

    def find(*needles: str) -> float | None:
        keys = [hebrew_key(needle) for needle in needles]
        for y, key, _text in sorted(candidates):
            if all(needle in key for needle in keys):
                return y
        return None

    top_key = hebrew_key(' '.join(line['text'] for line in lines if line['bbox'][1] < 50))

    return {
        'conceptHeader': 'ערכים' in top_key and 'כינויים' in top_key,
        'translatorHeader': 'מתרגם' in top_key,
        'adviceY': find('עצה', 'תושיה'),
        'prayerY': find('ואני', 'תפל'),
        'storyY': find('סיפור', 'המאמר'),
        'yalkutY': find('לקוט', 'הנחל') or find('ליקוט', 'הנחל') or find('ליקומ', 'הנחל'),
        'milueiY': find('מילואי', 'חכמה') or find('מיליואי', 'חכמה'),
    }


def classify_span(
    source_page: int,
    span: dict[str, Any],
    landmarks: dict[str, Any],
    carry: dict[str, str],
) -> tuple[str | None, str]:
    x0, y0, x1, _y1 = span['bbox']
    center = (x0 + x1) / 2
    size = span['size']

    # Running title, column names and folio are metadata, not commentary prose.
    if y0 < 48:
        return None, 'header'

    odd = source_page % 2 == 1
    concepts_on_left = odd
    outer_lane = None
    if center < 108:
        outer_lane = 'concepts' if concepts_on_left else 'translator'
    elif center > 518:
        outer_lane = 'translator' if concepts_on_left else 'concepts'

    advice_y = landmarks['adviceY']
    prayer_y = landmarks['prayerY']
    story_y = landmarks['storyY']

    if outer_lane == 'concepts':
        if advice_y is not None and y0 >= advice_y - 2:
            return 'advice', 'heading-or-position'
        return carry['concepts'], 'mirrored-outer-column'
    if outer_lane == 'translator':
        if prayer_y is not None and y0 >= prayer_y - 2:
            return 'prayer', 'heading-or-position'
        return carry['translator'], 'mirrored-outer-column'

    # Advice can use the full bottom line when the narrow outside column is full.
    if advice_y is not None and y0 >= advice_y - 2:
        return 'advice', 'heading-or-position'

    # The canonical Torah is distinguished typographically by its large central type.
    # Judge the complete PDF line, not a single large heading word in a side column.
    line_bbox = span.get('lineBBox', span['bbox'])
    line_is_central = line_bbox[0] >= 220 and line_bbox[2] <= 402
    if y0 > 85 and line_is_central and span.get('lineMaxSize', size) >= 11.5:
        return 'likutay-moharan', 'central-large-type'

    # The revelation story occupies the inner spread below its printed heading.
    if story_y is not None and y0 >= story_y - 2:
        return 'revelation-story', 'heading-or-position'

    left_primary = 'nahal-novea' if odd else 'mekor-chokhma'
    right_primary = 'mekor-chokhma' if odd else 'nahal-novea'
    left_supplement = 'yalkut-hanahal' if odd else 'miluei-chokhma'
    right_supplement = 'miluei-chokhma' if odd else 'yalkut-hanahal'
    is_left = center < 312
    if is_left:
        yalkut_or_miluei = landmarks['yalkutY'] if left_supplement == 'yalkut-hanahal' else landmarks['milueiY']
        return (left_supplement if yalkut_or_miluei is not None and y0 >= yalkut_or_miluei - 2 else left_primary), 'mirrored-inner-column'
    yalkut_or_miluei = landmarks['yalkutY'] if right_supplement == 'yalkut-hanahal' else landmarks['milueiY']
    return (right_supplement if yalkut_or_miluei is not None and y0 >= yalkut_or_miluei - 2 else right_primary), 'mirrored-inner-column'


def extract_fragments(
    page: fitz.Page,
    source_page: int,
    carry: dict[str, str],
) -> tuple[list[dict[str, Any]], dict[str, Any], dict[str, str]]:
    lines = page_lines(page)
    landmarks = heading_landmarks(lines)

    if landmarks['conceptHeader']:
        carry['concepts'] = 'concepts'
    if landmarks['translatorHeader']:
        carry['translator'] = 'translator'

    grouped: dict[tuple[int, str], list[dict[str, Any]]] = defaultdict(list)
    methods: dict[tuple[int, str], set[str]] = defaultdict(set)
    for line in lines:
        per_section: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for span in line['spans']:
            span['lineBBox'] = line['bbox']
            span['lineMaxSize'] = line['maxSize']
            section, method = classify_span(source_page, span, landmarks, carry)
            if section is None:
                continue
            per_section[section].append(span)
            methods[(line['block'], section)].add(method)
        for section, spans in per_section.items():
            spans.sort(key=lambda span: span['bbox'][0], reverse=True)
            grouped[(line['block'], section)].append({
                'text': normalize_text(' '.join(span['text'] for span in spans)),
                'bbox': merge_bbox([span['bbox'] for span in spans]),
            })

    fragments = []
    sequence: dict[str, int] = defaultdict(int)
    for (block_number, section), fragment_lines in sorted(
        grouped.items(), key=lambda item: (min(line['bbox'][1] for line in item[1]), min(line['bbox'][0] for line in item[1]))
    ):
        text = normalize_text(' '.join(line['text'] for line in fragment_lines))
        if len(hebrew_key(text)) < 3:
            continue
        sequence[section] += 1
        method_set = sorted(methods[(block_number, section)])
        confidence = 'high' if all(method in {'central-large-type', 'heading-or-position', 'mirrored-outer-column'} for method in method_set) else 'provisional'
        fragment_id = f'p{source_page}-{section}-{sequence[section]}'
        fragments.append({
            'id': fragment_id,
            'section': section,
            'sequence': sequence[section],
            'bbox': merge_bbox([line['bbox'] for line in fragment_lines]),
            'embeddedText': text,
            'correctedText': None,
            'reviewState': 'unreviewed',
            'layoutConfidence': confidence,
            'classificationMethod': method_set,
            'witnesses': [{'source': 'embedded-pdf', 'text': text}],
        })

    if landmarks['adviceY'] is not None:
        carry['concepts'] = 'advice'
    if landmarks['prayerY'] is not None:
        carry['translator'] = 'prayer'

    counts = {
        definition['id']: sum(1 for fragment in fragments if fragment['section'] == definition['id'])
        for definition in SECTION_DEFS
    }
    return fragments, {'landmarks': landmarks, 'fragmentCounts': {key: value for key, value in counts.items() if value}}, carry


def validate_manifest(manifest: dict[str, Any]) -> None:
    assert len(manifest['pages']) == LAST_PAGE - FIRST_PAGE + 1
    assert {section['id'] for section in manifest['sectionDefinitions']} == SECTION_IDS
    ids = []
    for page in manifest['pages']:
        assert (OUT / Path(page['image']).name).exists(), page['image']
        for fragment in page['fragments']:
            assert fragment['section'] in SECTION_IDS
            assert fragment['embeddedText']
            assert fragment['witnesses'][0]['text'] == fragment['embeddedText']
            ids.append(fragment['id'])
    assert len(ids) == len(set(ids)), 'Fragment IDs must be unique'
    present = {fragment['section'] for page in manifest['pages'] for fragment in page['fragments']}
    missing = SECTION_IDS - present
    assert not missing, f'Missing semantic sections: {sorted(missing)}'


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f'Missing source PDF: {SOURCE}')
    OUT.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(SOURCE)
    excerpt_path = OUT / 'peer-halikutim-torah-1.pdf'
    if not excerpt_path.exists():
        excerpt = fitz.open()
        excerpt.insert_pdf(doc, from_page=FIRST_PAGE - 1, to_page=LAST_PAGE - 1)
        excerpt.save(excerpt_path, garbage=4, deflate=True)

    pages = []
    matrix = fitz.Matrix(1.8, 1.8)
    carry = {'concepts': 'concepts', 'translator': 'translator'}
    for source_page in range(FIRST_PAGE, LAST_PAGE + 1):
        page = doc[source_page - 1]
        filename = f'page-{source_page}.webp'
        image_path = OUT / filename
        if not image_path.exists():
            pix = page.get_pixmap(matrix=matrix, colorspace=fitz.csRGB, alpha=False)
            pix.pil_save(image_path, format='WEBP', quality=86, method=6)
        fragments, extraction, carry = extract_fragments(page, source_page, carry)
        pages.append({
            'sourcePage': source_page,
            'printedFolio': None,
            'image': f'/reader/super/likutay-moharan/1/1/peer-halikutim/{filename}',
            'relatedSections': PAGE_SECTIONS[source_page],
            'pageBox': [round(page.rect.width, 1), round(page.rect.height, 1)],
            'extraction': extraction,
            'fragments': fragments,
        })

    manifest = {
        'schemaVersion': 2,
        'title': "Pe’er HaLikutim — Torah 1",
        'hebrewTitle': 'פאר הליקוטים — תורה א',
        'sourceFile': SOURCE.name,
        'sourcePageRange': [FIRST_PAGE, LAST_PAGE],
        'pdf': '/reader/super/likutay-moharan/1/1/peer-halikutim/peer-halikutim-torah-1.pdf',
        'textStatus': 'unreviewed-extraction',
        'textNotice': 'Unreviewed text-layer extraction for discovery. Verify every quotation against the authoritative scan.',
        'sectionDefinitions': SECTION_DEFS,
        'pages': pages,
    }
    validate_manifest(manifest)
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    total = sum(len(page['fragments']) for page in pages)
    print(f'Prepared {len(pages)} pages and {total} semantic fragments at {OUT}')


if __name__ == '__main__':
    main()
