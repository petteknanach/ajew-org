#!/usr/bin/env python3
"""Validate the Torah 14 Full Super Reader package in targeted low-resource mode."""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/reader/super/likutay-moharan/1/14'

def load(path: Path):
    return json.loads(path.read_text(encoding='utf-8-sig').replace('\x00', ''))

def unspan(value: str) -> str:
    return re.sub(r'<span[^>]*>|</span>', '', value or '')

def inline(text: str, anchor: str) -> bool:
    return bool(re.search(rf'<span[^>]+data-inline-phrase="{re.escape(anchor)}"', text or ''))

def fail(message: str):
    raise RuntimeError(message)

def main():
    classic = load(ROOT / 'public/reader/likutay-moharan/part-1/torah-14.json')
    study = load(BASE / 'torah-study.json')
    segments = study['segments']
    if len(classic.get('segments', [])) != 33 or len(classic.get('aligned_segments', [])) != 33:
        fail('Classic constants must be 33/33')
    if len(segments) != 78 or [x['index'] for x in segments] != list(range(1, 79)):
        fail('Study must contain 78 contiguous displayed passages')
    if study.get('sefariaSections') != 13 or study.get('sefariaPassages') != 75 or study.get('classicSourceOnlyPassages') != 3:
        fail('Sefaria/source-only metadata mismatch')
    if sum(bool(x.get('en')) for x in segments) != 75:
        fail('Exactly 75 passages must be bilingual')
    expected_crosswalk = [1,2,4,4,5,7,7,7,7,7,7,8,8,8,9,10,10,12,13,13,13,13,13,13,13,13,13,13,15,17,19,19,19,19,19,20,22,23,23,23,23,23,23,23,23,23,24,24,24,24,24,24,24,26,26,26,26,26,26,28,28,28,28,28,28,28,28,28,29,30,30,30,30,30,31,32,32,33]
    if [int(x['classicSegment']) for x in segments] != expected_crosswalk:
        fail('Exact 33-segment Classic crosswalk mismatch')
    boundaries = {3:[3,4], 6:[6,7], 18:[11,12], 29:[14,15], 30:[16,17], 31:[18,19], 37:[21,22], 54:[25,26], 60:[27,28], 78:[33]}
    for index, values in boundaries.items():
        if segments[index-1].get('classicSegments') != values:
            fail(f'Boundary/addendum crosswalk missing at passage {index}')
    addenda = {18:([11,12], 'Rashbam gloss preserved'), 37:([21,22], 'Rashbam gloss preserved'), 78:([33], 'Foundation of the matter')}
    for index, (classic_numbers, label) in addenda.items():
        item = segments[index-1]
        expected_he = ' '.join(str(classic['segments'][n-1].get('he') or '').strip() for n in classic_numbers).strip()
        if not item.get('hebrewOnly') or item.get('en') or unspan(item.get('he')) != expected_he:
            fail(f'Classic source-only passage {index} content mismatch')
        if label not in item.get('sourceRef', '') or 'source-only Hebrew' not in item.get('displayLabel', ''):
            fail(f'Classic source-only passage {index} labeling mismatch')
    if segments[16].get('sourceRef') != 'Likutei Moharan 14:5:3' or segments[18].get('sourceRef') != 'Likutei Moharan 14:5:4':
        fail('First Rashbam addendum is not positioned after 14:5:3')
    if segments[35].get('sourceRef') != 'Likutei Moharan 14:9:1' or segments[37].get('sourceRef') != 'Likutei Moharan 14:9:2':
        fail('Second Rashbam addendum is not positioned after 14:9:1')
    if segments[76].get('sourceRef') != 'Likutei Moharan 14:13:9':
        fail('Final Classic memorandum is not positioned after 14:13:9')
    for item in segments:
        if not item.get('he') or not item.get('he_nikud'):
            fail(f'Passage {item.get("index")} has empty Hebrew')
        if item.get('en') and item['en'].strip() == unspan(item['he']).strip():
            fail(f'Passage {item["index"]} copies Hebrew as English')
    phrases = load(BASE / 'phrase-study.json')['phrases']
    by_index = {x['index']: x for x in segments}
    if len(phrases) != 30 or len({x['id'] for x in phrases}) != 30:
        fail('Expected 30 unique phrases')
    for phrase in phrases:
        segment = by_index[int(phrase['segment'])]
        if segment.get('hebrewOnly'):
            fail(f'Phrase {phrase["id"]} points to source-only Hebrew')
        if not all(str(phrase.get(k, '')).strip() for k in ('he','en','enMatch','info','sourceRef')):
            fail(f'Phrase {phrase.get("id")} not substantive')
        if phrase['he'] not in unspan(segment['he']) or phrase['enMatch'] not in unspan(segment['en']):
            fail(f'Phrase {phrase["id"]} not exactly anchored')
        if not all(inline(segment[k], phrase['id']) for k in ('he','he_nikud','en')):
            fail(f'Phrase {phrase["id"]} inline markers missing')
    pettek = load(ROOT / 'public/reader/pettek-nanach-commentary/torah-14.json')
    if len(pettek['segments']) != 33 or [int(x['relatedSegment']) for x in pettek['segments']] != list(range(1,34)):
        fail('Pettek must have 33 synchronized records')
    for item in pettek['segments']:
        layers = item.get('layers', {})
        if not (layers.get('beginner',{}).get('en') and layers.get('intermediate',{}).get('he') and layers.get('intermediate',{}).get('en') and layers.get('scholarly',{}).get('he')):
            fail('Pettek layer coverage mismatch')
    biur = load(ROOT / 'public/reader/biur-halikutim/section-20.json')
    if biur.get('torah') != 14 or biur.get('displayNumber') != 14 or len(biur['segments']) != 27 or any(not x.get('he') for x in biur['segments']):
        fail('Biur metadata/count mismatch')
    parparos = load(ROOT / 'public/reader/parparos-lechochma/section-15.json')
    if parparos.get('torah') != 14 or parparos.get('displayNumber') != 14 or len(parparos['segments']) != 4:
        fail('Parparos metadata/count mismatch')
    if [int(x['index']) for x in parparos['segments']] != [2,4,6,8] or any(not x.get('he') or not x.get('en') or x['he'].strip() == x['en'].strip() for x in parparos['segments']):
        fail('Parparos bilingual records mismatch')
    prayer = load(ROOT / 'public/reader/likutay-tefilos/part-1/prayer-14.json')
    if prayer.get('id') != 'lt-1-14' or prayer.get('part') != 1 or len(prayer['segments']) != 14 or prayer.get('totalSegments') != 14:
        fail('Prayer metadata/count mismatch')
    if any(not x.get('he') or not x.get('en') or x['he'].strip() == x['en'].strip() for x in prayer['segments']):
        fail('Prayer bilingual content mismatch')
    nanach = load(ROOT / 'public/reader/likutay-nanach/volume-4/chapter-13.json')
    source = [x for x in nanach['segments'] if 3 <= int(x['index']) <= 37]
    substantive = [x for x in source if int(x['index']) != 3]
    if len(source) != 35 or len(substantive) != 34 or int(substantive[-1]['index']) != 37 or any(not x.get('he') for x in substantive):
        fail('Likutay Nanach must be 35 source / 34 substantive records, retaining record 37')
    manifest = load(BASE / 'peer-halikutim/manifest.json')
    if manifest.get('hebrewBooksId') != 54912 or manifest.get('sourcePageRange') != [329,376] or len(manifest.get('pages', [])) != 48:
        fail('Pe’er manifest mismatch')
    if [x.get('sourcePage') for x in manifest['pages']] != list(range(329,377)):
        fail('Pe’er page sequence mismatch')
    if {int(n) for page in manifest['pages'] for n in page.get('relatedPassages', [])} != set(range(1,79)):
        fail('Pe’er passage coverage mismatch')
    expected_assets = {f'page-{n}.webp' for n in range(329,377)}
    actual_assets = {p.name for p in (BASE/'peer-halikutim').glob('page-*.webp')}
    pdf_ready = (BASE/'peer-halikutim/peer-halikutim-torah-14.pdf').is_file()
    if actual_assets and actual_assets != expected_assets:
        fail('Partial Pe’er image set is not allowed')
    if bool(actual_assets) != pdf_ready:
        fail('Pe’er PDF/image readiness mismatch')
    if not actual_assets and manifest.get('facsimileStatus') != 'pending-separately-supervised-conversion':
        fail('Pending Pe’er conversion status missing')
    astro = (ROOT / 'src/pages/reader/super/likutay-moharan/1/14.astro').read_text(encoding='utf-8')
    sources = set(re.findall(r'data-open-source="([^"]+)"', astro))
    if sources != {'phrase','guide','pettek','biur','parparos','nanach','prayer','peer','notes'}:
        fail(f'Expected nine study layers, got {sorted(sources)}')
    for token in ('chapter-13.json', '3, 37', 'new Set([3])', '34 substantive records'):
        if token not in astro:
            fail(f'Nanach selection token missing: {token}')
    for token in ('three clearly labeled source-only Hebrew addenda', 'Pe’er pages 329–376', 'https://www.peer-halikutim.com/'):
        if token not in astro:
            fail(f'Source/addendum UI token missing: {token}')
    discovery = [ROOT/'src/pages/reader/likutay-moharan/index.astro', ROOT/'src/pages/reader/likutay-moharan/[part]/index.astro', ROOT/'src/pages/reader/likutay-moharan/[part]/[torah].astro']
    for path in discovery:
        text = path.read_text(encoding='utf-8-sig').replace('\x00','')
        if '/reader/super/likutay-moharan/1/14' not in text and '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]' not in text and 'Number(item.number) <= 14' not in text:
            fail(f'Discovery missing in {path}')
    asset_note = 'facsimiles ready' if actual_assets else 'facsimiles pending separately supervised conversion'
    print('Validated Torah 14: 75 Sefaria bilingual + 3 labeled Classic source-only Hebrew addenda (78 total), exact 33/33 crosswalk, 30 exact bilingual phrases, 9 study layers, 33 Pettek, 27 Biur, 4 Parparos, 35/34 Likutay Nanach, 14 prayer blocks, 48-page Pe’er manifest (329–376); ' + asset_note + '.')

if __name__ == '__main__':
    main()
