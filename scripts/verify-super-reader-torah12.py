#!/usr/bin/env python3
"""Validate the Torah 12 Full Super Reader package in targeted low-resource mode."""
from __future__ import annotations
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/reader/super/likutay-moharan/1/12'

def load(path): return json.loads(path.read_text(encoding='utf-8-sig').replace('\x00', ''))
def unspan(value): return re.sub(r'<span[^>]*>|</span>', '', value or '')
def inline(text, anchor): return bool(re.search(rf'<span[^>]+data-inline-phrase="{re.escape(anchor)}"', text or ''))
def fail(message): raise RuntimeError(message)

def main():
    classic = load(ROOT / 'public/reader/likutay-moharan/part-1/torah-12.json')
    study = load(BASE / 'torah-study.json'); segments = study['segments']
    if len(classic.get('segments', [])) != 12 or len(classic.get('aligned_segments', [])) != 94:
        fail('Classic constants must be 12/94')
    if len(segments) != 60 or [x['index'] for x in segments] != list(range(1, 61)):
        fail('Study must contain 60 contiguous displayed passages')
    if study.get('sefariaSections') != 6 or study.get('sefariaPassages') != 59 or study.get('classicSupplementRange') != [58, 72]:
        fail('Sefaria/supplement metadata mismatch')
    if sum(bool(x.get('en')) for x in segments) != 59:
        fail('Exactly 59 passages must be bilingual')
    expected = ([1] + [3]*3 + [4]*6 + [5]*3 + [6]*3 + [7]*10 + [8]*12 + [9] + [10] + [11]*14 + [12]*6)
    if [int(x['classicSegment']) for x in segments] != expected:
        fail('Exact Classic crosswalk mismatch')
    if segments[0].get('classicSegments') != [1, 2]:
        fail('Combined introductory heading/opening-verse crosswalk missing')
    if segments[38].get('sourceRef') != 'Likutei Moharan 12:5:1' or segments[40].get('sourceRef') != 'Likutei Moharan 12:5:2':
        fail('Rashbam restoration is not positioned after 12:5:1')
    gloss = segments[39]
    expected_gloss = '\n'.join(str(x.get('he') or '').strip() for x in classic['aligned_segments'][57:72])
    if gloss.get('classicAlignedRange') != [58, 72] or not gloss.get('hebrewOnly') or gloss.get('en') or unspan(gloss.get('he')) != unspan(expected_gloss):
        fail('Classic Hebrew-only Rashbam restoration mismatch')
    if 'Rashbam gloss preserved' not in gloss.get('sourceRef', '') or 'Hebrew only' not in gloss.get('displayLabel', ''):
        fail('Classic restoration labeling mismatch')
    for item in segments:
        if not item.get('he') or not item.get('he_nikud'):
            fail(f'Passage {item.get("index")} has empty Hebrew')
        if item.get('en') and item['en'].strip() == unspan(item['he']).strip():
            fail(f'Passage {item["index"]} copies Hebrew as English')

    phrases = load(BASE / 'phrase-study.json')['phrases']; by_index = {x['index']: x for x in segments}
    if len(phrases) != 30 or len({x['id'] for x in phrases}) != 30:
        fail('Expected 30 unique phrases')
    for phrase in phrases:
        segment = by_index[int(phrase['segment'])]
        if segment.get('hebrewOnly'):
            fail(f'Phrase {phrase["id"]} points to Hebrew-only restoration')
        if not all(str(phrase.get(k, '')).strip() for k in ('he', 'en', 'enMatch', 'info', 'sourceRef')):
            fail(f'Phrase {phrase.get("id")} not substantive')
        if phrase['he'] not in unspan(segment['he']) or phrase['enMatch'] not in unspan(segment['en']):
            fail(f'Phrase {phrase["id"]} not exactly anchored')
        if not all(inline(segment[k], phrase['id']) for k in ('he', 'he_nikud', 'en')):
            fail(f'Phrase {phrase["id"]} inline markers missing')

    pettek = load(ROOT / 'public/reader/pettek-nanach-commentary/torah-12.json')
    if len(pettek['segments']) != 12 or [int(x['relatedSegment']) for x in pettek['segments']] != list(range(1, 13)):
        fail('Pettek must have 12 synchronized records')
    for item in pettek['segments']:
        layers = item.get('layers', {})
        if not (layers.get('beginner', {}).get('en') and layers.get('intermediate', {}).get('he') and layers.get('intermediate', {}).get('en') and layers.get('scholarly', {}).get('he')):
            fail('Pettek layer coverage mismatch')

    biur = load(ROOT / 'public/reader/biur-halikutim/section-18.json')
    if biur.get('torah') != 12 or biur.get('displayNumber') != 12 or len(biur['segments']) != 18 or any(not x.get('he') for x in biur['segments']):
        fail('Biur metadata/count mismatch')
    parparos = load(ROOT / 'public/reader/parparos-lechochma/section-13.json')
    if parparos.get('torah') != 12 or parparos.get('displayNumber') != 12 or len(parparos['segments']) != 13:
        fail('Parparos metadata/count mismatch')
    if [int(x['index']) for x in parparos['segments']] != list(range(2, 27, 2)) or any(not x.get('he') or not x.get('en') or x['he'].strip() == x['en'].strip() for x in parparos['segments']):
        fail('Parparos bilingual groups mismatch')
    prayer = load(ROOT / 'public/reader/likutay-tefilos/part-1/prayer-12.json')
    if prayer.get('id') != 'lt-1-12' or prayer.get('part') != 1 or len(prayer['segments']) != 4:
        fail('Prayer metadata/count mismatch')
    if any(not x.get('he') or not x.get('en') or x['he'].strip() == x['en'].strip() for x in prayer['segments']):
        fail('Prayer bilingual content mismatch')

    source_records = []
    for name, lo, hi in [('chapter-10.json', 7, 20), ('chapter-11.json', 1, 27)]:
        data = load(ROOT / 'public/reader/likutay-nanach/volume-4' / name)
        source_records += [x for x in data['segments'] if lo <= int(x['index']) <= hi]
    substantive = [x for i, x in enumerate(source_records) if not (i == 0 or i == 6)]
    if len(source_records) != 41 or len(substantive) != 39 or any(not x.get('he') for x in substantive):
        fail('Likutay Nanach must be 41 source / 39 substantive records')

    manifest = load(BASE / 'peer-halikutim/manifest.json')
    if manifest.get('hebrewBooksId') != 54912 or manifest.get('sourcePageRange') != [242, 281] or len(manifest.get('pages', [])) != 40:
        fail('Pe’er manifest mismatch')
    if [x.get('sourcePage') for x in manifest['pages']] != list(range(242, 282)):
        fail('Pe’er page sequence mismatch')
    if {int(n) for page in manifest['pages'] for n in page.get('relatedPassages', [])} != set(range(1, 61)):
        fail('Pe’er passage coverage mismatch')
    expected_assets = {f'page-{n}.webp' for n in range(242, 282)}
    actual_assets = {p.name for p in (BASE / 'peer-halikutim').glob('page-*.webp')}
    pdf_ready = (BASE / 'peer-halikutim/peer-halikutim-torah-12.pdf').is_file()
    if actual_assets and actual_assets != expected_assets:
        fail('Partial Pe’er image set is not allowed')
    if bool(actual_assets) != pdf_ready:
        fail('Pe’er PDF/image readiness mismatch')
    if not actual_assets and manifest.get('facsimileStatus') != 'pending-separately-supervised-conversion':
        fail('Pending Pe’er conversion status missing')

    astro = (ROOT / 'src/pages/reader/super/likutay-moharan/1/12.astro').read_text(encoding='utf-8')
    sources = set(re.findall(r'data-open-source="([^"]+)"', astro))
    if sources != {'phrase', 'guide', 'pettek', 'biur', 'parparos', 'nanach', 'prayer', 'peer', 'notes'}:
        fail(f'Expected nine study layers, got {sorted(sources)}')
    for token in ('chapter-10.json', 'chapter-11.json', '7, 20', '1, 27', 'new Set([7, 13])', '39 substantive records'):
        if token not in astro: fail(f'Nanach selection token missing: {token}')
    if 'Hebrew-only Classic Rashbam restoration' not in astro:
        fail('Hebrew-only restoration UI notice missing')
    discovery = [ROOT/'src/pages/reader/likutay-moharan/index.astro', ROOT/'src/pages/reader/likutay-moharan/[part]/index.astro', ROOT/'src/pages/reader/likutay-moharan/[part]/[torah].astro']
    for path in discovery:
        text = path.read_text(encoding='utf-8-sig').replace('\x00', '')
        if '/reader/super/likutay-moharan/1/12' not in text and '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]' not in text:
            fail(f'Discovery missing in {path}')

    asset_note = 'facsimiles ready' if actual_assets else 'facsimiles pending separately supervised conversion'
    print('Validated Torah 12: 59 Sefaria bilingual + 1 labeled Hebrew-only Classic Rashbam passage (60 total), exact 12/94 crosswalk, 30 exact bilingual phrases, 9 study layers, 12 Pettek, 18 Biur, 13 Parparos, 41/39 Likutay Nanach, 4 prayer blocks, 40-page Pe’er manifest (242–281); ' + asset_note + '.')

if __name__ == '__main__': main()
