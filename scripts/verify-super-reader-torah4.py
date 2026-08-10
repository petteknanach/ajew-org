#!/usr/bin/env python3
"""Validate Torah 4 aligned text, crosswalk, phrases, sources, and facsimiles."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/reader/super/likutay-moharan/1/4'


def key(value: str, language: str) -> str:
    pattern = r'[א-ת]' if language == 'he' else r'[a-z0-9]'
    return ''.join(re.findall(pattern, str(value or '').lower()))


def main() -> None:
    study = json.loads((BASE / 'torah-study.json').read_text(encoding='utf-8'))
    segments = study['segments']
    if len(segments) != 81 or [item['index'] for item in segments] != list(range(1, 82)):
        raise RuntimeError('Torah 4 must contain 81 contiguous aligned passages')
    if not all(item.get('he') and item.get('he_nikud') and item.get('en') for item in segments):
        raise RuntimeError('Every passage must be fully bilingual')
    if {int(item['classicSegment']) for item in segments} != set(range(1, 24)):
        raise RuntimeError('Classic crosswalk must cover segments 1–23')

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

    for relative, count in [('public/reader/parparos-lechochma/section-4.json', 6), ('public/reader/parparos-lechochma/section-5.json', 32)]:
        data = json.loads((ROOT / relative).read_text(encoding='utf-8'))
        if len(data['segments']) != count or not all(item.get('he') and item.get('en') for item in data['segments']):
            raise RuntimeError(f'Parparos bilingual repair incomplete: {relative}')

    manifest = json.loads((BASE / 'peer-halikutim/manifest.json').read_text(encoding='utf-8'))
    if manifest['sourcePageRange'] != [103, 152] or len(manifest['pages']) != 50:
        raise RuntimeError('Pe’er page range mismatch')
    if not (BASE / 'peer-halikutim/peer-halikutim-torah-4.pdf').exists():
        raise RuntimeError('Pe’er Torah 4 PDF is missing')
    for page in manifest['pages']:
        if not (ROOT / 'public' / page['image'].lstrip('/')).exists():
            raise RuntimeError(f"Missing Pe’er image {page['image']}")

    print('Validated Torah 4: 81 passages, 23 classic segments, 30 phrases, repaired Parparos, 50 Pe’er pages.')


if __name__ == '__main__':
    main()
