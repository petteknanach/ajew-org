#!/usr/bin/env python3
"""Regression checks for the Pe'er HaLikutim Torah 1 structured manifest."""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'public/reader/super/likutay-moharan/1/1/peer-halikutim/manifest.json'


def main() -> None:
    data = json.loads(MANIFEST.read_text(encoding='utf-8'))
    assert data['schemaVersion'] == 2
    assert data['textStatus'] == 'unreviewed-extraction'
    assert len(data['sectionDefinitions']) == 10
    assert [page['sourcePage'] for page in data['pages']] == list(range(45, 65))

    fragments = [fragment for page in data['pages'] for fragment in page['fragments']]
    counts = Counter(fragment['section'] for fragment in fragments)
    expected = {definition['id'] for definition in data['sectionDefinitions']}
    assert set(counts) == expected
    assert all(counts[section] > 0 for section in expected)
    assert all(fragment['reviewState'] == 'unreviewed' for fragment in fragments)
    assert all(fragment['correctedText'] is None for fragment in fragments)
    assert all(fragment['witnesses'][0]['source'] == 'embedded-pdf' for fragment in fragments)

    pages = {page['sourcePage']: page for page in data['pages']}
    # Mirrored outside columns must retain semantic identity on both page parities.
    p45_concepts = [f for f in pages[45]['fragments'] if f['section'] == 'concepts']
    p46_concepts = [f for f in pages[46]['fragments'] if f['section'] == 'concepts']
    p45_prayer = [f for f in pages[45]['fragments'] if f['section'] == 'prayer']
    p46_prayer = [f for f in pages[46]['fragments'] if f['section'] == 'prayer']
    assert p45_concepts and all((f['bbox'][0] + f['bbox'][2]) / 2 < 108 for f in p45_concepts)
    assert p46_concepts and all((f['bbox'][0] + f['bbox'][2]) / 2 > 518 for f in p46_concepts)
    assert p45_prayer and all((f['bbox'][0] + f['bbox'][2]) / 2 > 518 for f in p45_prayer)
    assert p46_prayer and all((f['bbox'][0] + f['bbox'][2]) / 2 < 108 for f in p46_prayer)

    print('Pe’er manifest verified:', len(data['pages']), 'pages,', len(fragments), 'fragments')
    print('Section counts:', dict(sorted(counts.items())))


if __name__ == '__main__':
    main()
