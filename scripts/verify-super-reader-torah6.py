#!/usr/bin/env python3
"""Validate Torah 6 aligned text, crosswalk, phrases, sources, and facsimiles."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/reader/super/likutay-moharan/1/6'


def key(value: str, language: str) -> str:
    pattern = r'[א-ת]' if language == 'he' else r'[a-z0-9]'
    return ''.join(re.findall(pattern, str(value or '').lower()))


def main() -> None:
    study = json.loads((BASE / 'torah-study.json').read_text(encoding='utf-8'))
    segments = study['segments']
    if len(segments) != 94 or [item['index'] for item in segments] != list(range(1, 95)):
        raise RuntimeError('Torah 6 must contain 94 contiguous aligned passages')
    if not all(item.get('he') and item.get('he_nikud') and item.get('en') for item in segments):
        raise RuntimeError('Every passage must be fully bilingual')
    if {int(item['classicSegment']) for item in segments} != set(range(1, 20)):
        raise RuntimeError('Classic crosswalk must cover segments 1–19')
    expected_crosswalk = (
        [1] * 2 + [2] * 2 + [3] * 5 + [4] + [5] * 2 + [6] * 9 + [7] * 4 +
        [8] * 10 + [9] * 2 + [10] + [11] * 4 + [12] + [13] * 6 + [14] * 5 +
        [15] + [16] * 4 + [17] * 27 + [18] * 3 + [19] * 5
    )
    if [int(item['classicSegment']) for item in segments] != expected_crosswalk:
        raise RuntimeError('Classic crosswalk order or passage counts are incorrect')

    phrase_data = json.loads((BASE / 'phrase-study.json').read_text(encoding='utf-8'))
    phrases = phrase_data['phrases']
    if len(phrases) != 30 or len({item['id'] for item in phrases}) != 30:
        raise RuntimeError('Expected 30 unique phrase anchors')
    by_index = {int(item['index']): item for item in segments}
    for phrase in phrases:
        segment = by_index[int(phrase['segment'])]
        if key(phrase['he'], 'he') not in key(segment['he'], 'he'):
            raise RuntimeError(f"Hebrew phrase mismatch: {phrase['id']}")
        if key(phrase['enMatch'], 'en') not in key(segment['en'], 'en'):
            raise RuntimeError(f"English phrase mismatch: {phrase['id']}")
        if not phrase.get('info') or not phrase.get('source'):
            raise RuntimeError(f"Phrase metadata incomplete: {phrase['id']}")

    for relative, count in [('public/reader/parparos-lechochma/section-7.json', 20)]:
        data = json.loads((ROOT / relative).read_text(encoding='utf-8'))
        if len(data['segments']) != count or not all(item.get('he') and item.get('en') for item in data['segments']):
            raise RuntimeError(f'Parparos bilingual repair incomplete: {relative}')

    manifest = json.loads((BASE / 'peer-halikutim/manifest.json').read_text(encoding='utf-8'))
    if manifest['sourcePageRange'] != [189, 231] or len(manifest['pages']) != 43:
        raise RuntimeError('Pe’er page range mismatch')
    if not (BASE / 'peer-halikutim/peer-halikutim-torah-6.pdf').exists():
        raise RuntimeError('Pe’er Torah 6 PDF is missing')
    for page in manifest['pages']:
        if not (ROOT / 'public' / page['image'].lstrip('/')).exists():
            raise RuntimeError(f"Missing Pe’er image {page['image']}")
    expected_images = {f'page-{page}.webp' for page in range(189, 232)}
    actual_images = {page.name for page in (BASE / 'peer-halikutim').glob('page-*.webp')}
    if actual_images != expected_images:
        raise RuntimeError('Pe’er image directory contains missing or out-of-range pages')
    covered = {int(n) for page in manifest['pages'] for n in page.get('relatedPassages', [])}
    if covered != set(range(1, 95)):
        raise RuntimeError('Pe’er navigation does not cover all 94 passages')

    print('Validated Torah 6: 94 passages, 19 classic segments, 30 phrases, repaired Parparos, 43 Pe’er pages.')


if __name__ == '__main__':
    main()
