#!/usr/bin/env python3
"""Validate Torah 7 aligned text, crosswalk, phrases, sources, and facsimiles."""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/reader/super/likutay-moharan/1/7'

def key(value: str, language: str) -> str:
    pattern = r'[א-ת]' if language == 'he' else r'[a-z0-9]'
    return ''.join(re.findall(pattern, str(value or '').lower()))

def main() -> None:
    study = json.loads((BASE / 'torah-study.json').read_text(encoding='utf-8'))
    segments = study['segments']
    if len(segments) != 54 or [item['index'] for item in segments] != list(range(1, 55)):
        raise RuntimeError('Torah 7 must contain 54 contiguous aligned passages')
    if not all(item.get('he') and item.get('he_nikud') and item.get('en') for item in segments):
        raise RuntimeError('Every passage must be fully bilingual')
    if {int(item['classicSegment']) for item in segments} != set(range(1, 15)):
        raise RuntimeError('Classic crosswalk must cover segments 1–14')
    expected_crosswalk = [1] + [2] + [3] + [4] * 10 + [5] + [6] * 6 + [7] * 4 + [8] * 2 + [9] + [10] * 5 + [11] * 6 + [12] * 10 + [13] * 3 + [14] * 3
    if [int(item['classicSegment']) for item in segments] != expected_crosswalk:
        raise RuntimeError('Classic crosswalk order or passage counts are incorrect')
    if segments[0]['sourceComment'] != '1a' or segments[1]['sourceComment'] != '1b':
        raise RuntimeError('Opening marker/verse split is missing')
    if segments[26]['classicSegment'] != 9 or 'Rashbam' not in segments[26]['sourceRef']:
        raise RuntimeError('Classic Rashbam gloss is missing at passage 27')
    if segments[52]['classicSegment'] != 14 or 'Pri Etz Chaim' not in segments[52]['sourceRef']:
        raise RuntimeError('Classic Pri Etz Chaim gloss is missing at passage 53')

    phrases = json.loads((BASE / 'phrase-study.json').read_text(encoding='utf-8'))['phrases']
    if len(phrases) != 30 or len({item['id'] for item in phrases}) != 30:
        raise RuntimeError('Expected 30 unique phrase anchors')
    if int(phrases[0]['segment']) != 1 or int(phrases[-1]['segment']) != 54:
        raise RuntimeError('Phrase navigation must span passages 1–54')
    by_index = {int(item['index']): item for item in segments}
    for phrase in phrases:
        segment = by_index[int(phrase['segment'])]
        if key(phrase['he'], 'he') not in key(segment['he'], 'he'):
            raise RuntimeError(f"Hebrew phrase mismatch: {phrase['id']}")
        if key(phrase['enMatch'], 'en') not in key(segment['en'], 'en'):
            raise RuntimeError(f"English phrase mismatch: {phrase['id']}")
        if not phrase.get('info') or not phrase.get('source'):
            raise RuntimeError(f"Phrase metadata incomplete: {phrase['id']}")

    parparos = json.loads((ROOT / 'public/reader/parparos-lechochma/section-8.json').read_text(encoding='utf-8'))
    if len(parparos['segments']) != 11 or not all(item.get('he') and item.get('en') for item in parparos['segments']):
        raise RuntimeError('Torah 7 Parparos bilingual repair incomplete')
    pettek = json.loads((ROOT / 'public/reader/pettek-nanach-commentary/torah-7.json').read_text(encoding='utf-8'))
    if len(pettek['segments']) != 14:
        raise RuntimeError('Torah 7 Pettek source mismatch')
    biur = json.loads((ROOT / 'public/reader/biur-halikutim/section-15.json').read_text(encoding='utf-8'))
    if len(biur['segments']) != 64 or any(not item.get('he') for item in biur['segments']):
        raise RuntimeError('Torah 7/9 Biur HaLikutim source mismatch')
    prayer = json.loads((ROOT / 'public/reader/likutay-tefilos/part-1/prayer-7.json').read_text(encoding='utf-8'))
    if len(prayer['segments']) != 4 or any(not item.get('he') or not item.get('en') or 'עברית ▾' in item.get('en', '') for item in prayer['segments']):
        raise RuntimeError('Torah 7 prayer source is not four clean bilingual blocks')
    nanach = json.loads((ROOT / 'public/reader/likutay-nanach/volume-4/chapter-3.json').read_text(encoding='utf-8'))
    nanach7 = [item for item in nanach['segments'] if 99 <= int(item['index']) <= 114]
    if len(nanach7) != 16:
        raise RuntimeError('Torah 7 Likutay Nanach source slice mismatch')

    manifest = json.loads((BASE / 'peer-halikutim/manifest.json').read_text(encoding='utf-8'))
    if manifest['sourcePageRange'] != [19, 54] or len(manifest['pages']) != 36:
        raise RuntimeError('Pe’er page range mismatch')
    if manifest.get('hebrewBooksId') != 54912 or manifest.get('sourceSha256') != 'fa1ed1cfe0e39e0046805f93e227c0a84e90823fb7a472b103f73edf1862acfc':
        raise RuntimeError('Pe’er provenance mismatch')
    if not (BASE / 'peer-halikutim/peer-halikutim-torah-7.pdf').exists():
        raise RuntimeError('Pe’er Torah 7 PDF is missing')
    for page in manifest['pages']:
        if not (ROOT / 'public' / page['image'].lstrip('/')).exists():
            raise RuntimeError(f"Missing Pe’er image {page['image']}")
    expected_images = {f'page-{page}.webp' for page in range(19, 55)}
    actual_images = {page.name for page in (BASE / 'peer-halikutim').glob('page-*.webp')}
    if actual_images != expected_images:
        raise RuntimeError('Pe’er image directory contains missing or out-of-range pages')
    covered = {int(n) for page in manifest['pages'] for n in page.get('relatedPassages', [])}
    if covered != set(range(1, 55)):
        raise RuntimeError('Pe’er navigation does not cover all 54 passages')

    print('Validated Torah 7: 54 passages, 14 classic segments, 30 phrases, repaired Parparos and prayer, 36 Pe’er pages.')

if __name__ == '__main__': main()
