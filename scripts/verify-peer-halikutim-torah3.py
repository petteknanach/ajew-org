#!/usr/bin/env python3
"""Regression checks for the Pe'er HaLikutim Torah 3 facsimile package."""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'public/reader/super/likutay-moharan/1/3/peer-halikutim/manifest.json'

EXPECTED_PASSAGES = {
    88: [1, 2, 3, 4], 89: [4, 5], 90: [5, 6], 91: [6, 7],
    92: [7, 8], 93: [8, 9], 94: [9, 10], 95: [10, 11],
    96: [11, 12], 97: [13, 14, 15, 16],
    98: [16, 17, 18, 19, 20, 21, 22], 99: [23, 24, 25],
    100: [25, 26, 27], 101: [27, 28, 29, 30, 31, 32],
    102: [32, 33, 34],
}


def main() -> None:
    data = json.loads(MANIFEST.read_text(encoding='utf-8'))
    assert data['schemaVersion'] == 2
    assert data['title'] == 'Pe’er HaLikutim — Torah 3'
    assert data['sourcePageRange'] == [88, 102]
    assert data['textStatus'] == 'unreviewed-extraction'
    assert len(data['sectionDefinitions']) == 10
    assert [page['sourcePage'] for page in data['pages']] == list(range(88, 103))
    pages = {page['sourcePage']: page for page in data['pages']}
    assert {number: page['relatedPassages'] for number, page in pages.items()} == EXPECTED_PASSAGES
    assert {passage for page in pages.values() for passage in page['relatedPassages']} == set(range(1, 35))
    assert all((ROOT / 'public' / page['image'].lstrip('/')).exists() for page in data['pages'])
    assert (ROOT / 'public' / data['pdf'].lstrip('/')).exists()

    fragments = [fragment for page in data['pages'] for fragment in page['fragments']]
    counts = Counter(fragment['section'] for fragment in fragments)
    expected = {item['id'] for item in data['sectionDefinitions']}
    assert set(counts) == expected
    assert all(fragment['reviewState'] == 'unreviewed' for fragment in fragments)
    assert all(fragment['correctedText'] is None for fragment in fragments)
    assert all(fragment['witnesses'][0]['source'] == 'embedded-pdf' for fragment in fragments)

    # Mirrored outside columns retain their identities on even and odd pages.
    for page_number, concepts_left in [(88, False), (89, True)]:
        concepts = [f for f in pages[page_number]['fragments'] if f['section'] == 'concepts']
        prayer = [f for f in pages[page_number]['fragments'] if f['section'] == 'prayer']
        assert concepts and prayer
        concept_centres = [(f['bbox'][0] + f['bbox'][2]) / 2 for f in concepts]
        prayer_centres = [(f['bbox'][0] + f['bbox'][2]) / 2 for f in prayer]
        assert all(value < 108 for value in concept_centres) if concepts_left else all(value > 518 for value in concept_centres)
        assert all(value > 518 for value in prayer_centres) if concepts_left else all(value < 108 for value in prayer_centres)

    print('Torah 3 Pe’er manifest verified:', len(data['pages']), 'pages,', len(fragments), 'fragments')
    print('Section counts:', dict(sorted(counts.items())))


if __name__ == '__main__':
    main()
