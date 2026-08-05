#!/usr/bin/env python3
"""Validate Torah 8 aligned text, crosswalk, phrases, sources, and facsimiles."""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/reader/super/likutay-moharan/1/8'

def check_inline(text: str, anchor: str) -> bool:
    return bool(re.search(rf'<span[^>]+data-inline-phrase="{re.escape(anchor)}"', text))

def main() -> None:
    study = json.loads((BASE / 'torah-study.json').read_text(encoding='utf-8'))
    seg = study['segments']
    if len(seg) != 97 or [x['index'] for x in seg] != list(range(1, 98)):
        raise RuntimeError('Torah 8 must contain 97 contiguous aligned passages')
    if any(not x.get('he') or not x.get('he_nikud') or not x.get('en') for x in seg):
        raise RuntimeError('Every Torah 8 passage must be fully bilingual')
    expected = [1] * 2 + [2] * 4 + [3] * 6 + [4] * 6 + [5] * 5 + [6] * 11 + [7] * 2 + [8] * 7 + [9] * 6 + [10] * 5 + [11] * 2 + [12] + [13] * 22 + [14] * 8 + [15] * 2 + [16] * 8
    if len(expected) != 97 or [int(x['classicSegment']) for x in seg] != expected:
        raise RuntimeError('Torah 8 classic crosswalk is incorrect')
    if 'opening note' not in seg[1]['sourceRef'] or int(seg[1]['classicSegment']) != 1:
        raise RuntimeError('Torah 8 Haftarah-note split is missing at passage 2')
    if 'Rashbam' not in seg[56]['sourceRef'] or int(seg[56]['classicSegment']) != 12:
        raise RuntimeError('Torah 8 restored Rashbam gloss must be passage 57')

    phrases = json.loads((BASE / 'phrase-study.json').read_text(encoding='utf-8'))['phrases']
    if len(phrases) != 30 or len({x['id'] for x in phrases}) != 30:
        raise RuntimeError('Expected 30 unique phrase anchors')
    if int(phrases[0]['segment']) != 1 or int(phrases[-1]['segment']) != 97:
        raise RuntimeError('Phrase navigation must span passages 1–97')
    by_index = {int(x['index']): x for x in seg}
    for phrase in phrases:
        target = by_index[int(phrase['segment'])]
        if not check_inline(target['he'], phrase['id']) or not check_inline(target['en'], phrase['id']):
            raise RuntimeError(f"Phrase {phrase['id']} lacks bilingual inline anchors")

    pettek = json.loads((ROOT / 'public/reader/pettek-nanach-commentary/torah-8.json').read_text(encoding='utf-8'))
    if len(pettek['segments']) != 16: raise RuntimeError('Torah 8 Pettek mismatch')
    biur = json.loads((ROOT / 'public/reader/biur-halikutim/section-12.json').read_text(encoding='utf-8'))
    if len(biur['segments']) != 28 or any(not x.get('he') for x in biur['segments']): raise RuntimeError('Torah 8 Biur mismatch')
    parparos = json.loads((ROOT / 'public/reader/parparos-lechochma/section-9.json').read_text(encoding='utf-8'))
    if len(parparos['segments']) != 4 or any(not x.get('he') or not x.get('en') for x in parparos['segments']): raise RuntimeError('Torah 8 Parparos mismatch')
    nanach = json.loads((ROOT / 'public/reader/likutay-nanach/volume-4/chapter-3.json').read_text(encoding='utf-8'))
    material = [x for x in nanach['segments'] if 115 <= int(x['index']) <= 149]
    if len(material) != 35: raise RuntimeError('Torah 8 Likutay Nanach mismatch')
    prayer = json.loads((ROOT / 'public/reader/likutay-tefilos/part-1/prayer-8.json').read_text(encoding='utf-8'))
    if len(prayer['segments']) != 5 or any(not x.get('he') or not x.get('en') or 'עברית ▾' in x.get('en', '') for x in prayer['segments']):
        raise RuntimeError('Torah 8 prayer is not five clean bilingual blocks')

    manifest = json.loads((BASE / 'peer-halikutim/manifest.json').read_text(encoding='utf-8'))
    if manifest['sourcePageRange'] != [55, 108] or len(manifest['pages']) != 54:
        raise RuntimeError('Torah 8 Pe’er range must be PDF pages 55–108')
    names = {f'page-{n}.webp' for n in range(55, 109)}
    actual = {p.name for p in (BASE / 'peer-halikutim').glob('page-*.webp')}
    if actual != names: raise RuntimeError('Torah 8 Pe’er images are missing or out of range')
    covered = {int(n) for page in manifest['pages'] for n in page.get('relatedPassages', [])}
    if covered != set(range(1, 98)): raise RuntimeError('Torah 8 Pe’er navigation must cover all 97 passages')
    print('Validated Torah 8: 97 passages, 16 classic segments, 30 phrases, 5 prayer blocks, 54 Pe’er pages.')

if __name__ == '__main__': main()
