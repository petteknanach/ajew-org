#!/usr/bin/env python3
"""Validate frozen Torah 18 Full Super Reader package in strict low-resource mode."""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/reader/super/likutay-moharan/1/18'
COUNTS = [5, 12, 4, 9, 3, 10, 4, 7]
SHA = '796b49291678cc50b05f90ca0e7e2955eae62b0f2455d798ca55aa2ddb9673d3'
AVAILABILITY = {'beginner': {'he': False, 'en': True}, 'intermediate': {'he': True, 'en': True}, 'scholarly': {'he': True, 'en': False}}
MERGED = {3: [3, 4], 4: [5, 6], 7: [8, 9], 19: [13, 14], 23: [16, 17], 32: [19, 20], 35: [21, 22], 45: [23, 24], 49: [25, 26]}

def load(path: Path):
    return json.loads(path.read_text(encoding='utf-8-sig').replace('\x00', ''))

def plain(value):
    return re.sub(r'<span[^>]*>|</span>', '', value or '').strip()

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def main():
    classic = load(ROOT / 'public/reader/likutay-moharan/part-1/torah-18.json')
    require(len(classic.get('segments', [])) == 29, 'Classic physical count must be 29')
    require('ספרא דצניעותא' in plain(classic['segments'][28].get('he')), 'Classic 29 Torah 19 boundary missing')

    study = load(BASE / 'torah-study.json')
    segs = study.get('segments', [])
    require(len(segs) == 55 and [x.get('index') for x in segs] == list(range(1, 56)), 'Study must contain contiguous passages 1-55')
    refs = [f'Likutei Moharan 18:{section}:{leaf}' for section, count in enumerate(COUNTS, 1) for leaf in range(1, count + 1)]
    expected_refs = refs[:1] + [None] + refs[1:]
    require([x.get('sourceRef') for x in segs] == expected_refs, '54-ref sequence/Rashbam insertion mismatch')
    require(all(plain(x.get('he')) and plain(x.get('en')) and plain(x['he']) != plain(x['en']) for x in segs), 'Every aligned passage must be genuinely bilingual')
    supplement = [x for x in segs if x.get('insertedSupplement')]
    require(len(supplement) == 1 and supplement[0]['index'] == 2 and supplement[0].get('classicSegment') == 2 and supplement[0].get('sourceRef') is None, 'Rashbam supplement identity mismatch')
    require(plain(supplement[0]['he']).startswith('רשב"ם: קרטליתא - ארגז') and plain(supplement[0]['en']).startswith('(Rashi) Rashbam: Kartalisa - argaz'), 'Exact Rashbam wording mismatch')
    for index, merged in MERGED.items():
        require(segs[index - 1].get('classicSegments') == merged, f'Merged Classic heading crosswalk mismatch at passage {index}')
    require(all(1 <= int(x.get('classicSegment', 0)) <= 27 for x in segs), 'Aligned crosswalk contains out-of-scope Classic segment')
    require(study.get('sefariaSectionCounts') == COUNTS and study.get('sefariaPassages') == 54 and study.get('totalPassages') == 55 and study.get('restoredBilingualSupplements') == 1, 'Study count metadata mismatch')
    source = study.get('source', {})
    expected_meta = {'ref': 'Likutei Moharan 18:1', 'prev': 'Likutei Moharan 17:9', 'lastNext': 'Likutei Moharan 19:1', 'versionTitle': 'Likutey Moharan Volumes 1-11, trans. by Moshe Mykoff. Breslov Research Inst., 1986-2012', 'license': 'CC-BY-NC', 'versionSource': 'https://www.nli.org.il/he/books/NNL01', 'heVersionTitle': 'Likutei Moharan - rabenubook.com', 'heLicense': 'Public Domain', 'heVersionSource': 'http://rabenubook.com/%D7%9C%D7%99%D7%A7%D7%95%D7%98%D7%99-%D7%9E%D7%95%D7%94%D7%A8%D7%B4%D7%9F-%D7%90/'}
    require(all(source.get(k) == v for k, v in expected_meta.items()), 'Sefaria provenance mismatch')
    final = segs[-1]
    require(plain(final['he']).endswith('תמצא מרגוע לנפשך]:') and 'עד הנה עזרונו' not in plain(final['he']), 'Visible 18:8:7 clipping mismatch')
    close = study.get('editionClose', {})
    require(close.get('classicSegment') == 28 and not close.get('en') and plain(close.get('he')).startswith('עד הנה עזרונו רחמיך') and plain(close.get('he')).endswith('בריך שמה לעלא מן כל ברכתא ושירתא:'), 'Separate Hebrew-only doxology mismatch')

    phrases = load(BASE / 'phrase-study.json')
    plist = phrases.get('phrases', [])
    require(len(plist) == 30 and len({x['id'] for x in plist}) == 30 and phrases.get('selectedPassages', [0])[0] == 1 and phrases.get('selectedPassages', [0])[-1] == 55, '30-phrase distribution mismatch')
    by_index = {x['index']: x for x in segs}
    for phrase in plist:
        segment = by_index[int(phrase['segment'])]
        require(all(str(phrase.get(k, '')).strip() for k in ('he', 'en', 'enMatch', 'info', 'source')), f'Incomplete phrase {phrase.get("id")}')
        require(phrase['he'] in plain(segment['he']) and phrase['enMatch'] in plain(segment['en']), f'Phrase source mismatch: {phrase.get("id")}')
        require(all(f'data-inline-phrase="{phrase["id"]}"' in segment[k] for k in ('he', 'he_nikud', 'en')), f'Phrase markers missing: {phrase["id"]}')

    pettek = load(ROOT / 'public/reader/pettek-nanach-commentary/torah-18.json')
    psegments = pettek.get('segments', [])
    require(len(psegments) == 28 and [int(x['relatedSegment']) for x in psegments] == list(range(1, 29)) and pettek.get('layerAvailability') == AVAILABILITY, 'Pettek count/availability mismatch')
    require(psegments[-1].get('alignedPassage') is None and psegments[-1].get('alignmentTarget') == 'hebrew-only-edition-close', 'Pettek 28 close alignment mismatch')
    require(all(int(x.get('relatedSegment', 0)) != 29 for x in psegments), 'Pettek 29 Torah 19 record leaked into package')
    for item in psegments:
        actual = {layer: {lang: bool(str((item.get('layers', {}).get(layer) or {}).get(lang) or '').strip()) for lang in ('he', 'en')} for layer in AVAILABILITY}
        require(actual == AVAILABILITY, f'Pettek asymmetric language mismatch at {item.get("index")}')

    biur = load(ROOT / 'public/reader/biur-halikutim/section-23.json')
    require(biur.get('sourceSection') == 23 and biur.get('displayNumber') == 18 and len(biur.get('segments', [])) == 5 and [x['index'] for x in biur['segments']] == list(range(1, 6)), 'Biur section 23 package mismatch')
    require(all(x.get('he') and not x.get('en') for x in biur['segments']) and biur.get('hasEnglish') is False, 'Biur must be Hebrew-only')

    parparos = load(BASE / 'parparos-lechochma.json')
    require(parparos.get('sourceSection') == 19 and len(parparos.get('segments', [])) == 12 and [x['index'] for x in parparos['segments']] == list(range(1, 13)), 'Parparos normalized count mismatch')
    require([x['sourceIndex'] for x in parparos['segments']] == list(range(2, 25, 2)) and parparos.get('hasEnglish') is False and all(x.get('he') and not x.get('en') for x in parparos['segments']), 'Parparos source indices/language honesty mismatch')

    prayer = load(ROOT / 'public/reader/likutay-tefilos/part-1/prayer-18.json')
    ids = [f'p18{chr(97 + i)}' for i in range(10)]
    require(len(prayer.get('segments', [])) == 10 and [x.get('sourceId') for x in prayer['segments']] == ids, 'Prayer p18a-p18j boundary mismatch')
    require(prayer.get('excludedMetadata', {}).get('dateBars') == 1 and '8th of Cheshvan' in prayer.get('excludedMetadata', {}).get('dateBarText', ''), 'Prayer date metadata mismatch')
    require(all(x.get('he') and x.get('en') for x in prayer['segments']), 'Prayer must contain ten bilingual blocks')

    nanach = load(BASE / 'likutay-nanach.json')
    nsegments = nanach.get('segments', [])
    require(len(nsegments) == 5 and [(x.get('sourceFile'), x.get('sourceIndex')) for x in nsegments] == [('volume-4/chapter-18.json', i) for i in range(5, 10)], 'Nanach chapter 18 range mismatch')
    require(all(x.get('he') and not x.get('en') for x in nsegments), 'Nanach must be Hebrew-only')
    associations = load(ROOT / 'src/data/lm-commentaries.json')['1']['18']['related_commentaries']
    n_assoc = [x for x in associations if x.get('book') == 'likutay-nanach']
    require(len(n_assoc) == 1 and n_assoc[0].get('url') == '/reader/likutay-nanach/volume-4/chapter-18.json' and n_assoc[0].get('sourceRange') == {'startIndex': 5, 'endIndex': 9, 'count': 5}, 'Nanach discovery association mismatch')

    manifest = load(BASE / 'peer-halikutim/manifest.json')
    require(manifest.get('hebrewBooksId') == 66038 and manifest.get('sourceSha256') == SHA and manifest.get('sourcePageRange') == [113, 150], 'Pe’er constants mismatch')
    require(len(manifest.get('pages', [])) == 38 and [x['sourcePage'] for x in manifest['pages']] == list(range(113, 151)), 'Pe’er exact page range mismatch')
    expected_assets = {f'page-{n}.webp' for n in range(113, 151)}
    actual_assets = {p.name for p in (BASE / 'peer-halikutim').glob('page-*.webp')}
    pdf_ready = (BASE / 'peer-halikutim/peer-halikutim-torah-18.pdf').is_file()
    require((not actual_assets and not pdf_ready) or (actual_assets == expected_assets and pdf_ready), 'Pe’er asset readiness mismatch')
    require(actual_assets or manifest.get('facsimileStatus') == 'pending-separately-supervised-conversion', 'Pending Pe’er status missing')

    astro = (ROOT / 'src/pages/reader/super/likutay-moharan/1/18.astro').read_text(encoding='utf-8')
    layers = set(re.findall(r'data-open-source="([^"]+)"', astro))
    require(layers == {'phrase', 'guide', 'pettek', 'biur', 'parparos', 'nanach', 'prayer', 'peer', 'notes'}, f'Expected nine study layers, got {sorted(layers)}')
    for token in ('<span><b>9</b> study layers</span>', '54 Hebrew leaves', 'Classic segment 2', '18:8:7', 'Classic segment 28', 'Classic and Pettek 29', 'beginner English-only', 'source section 23 · 5 Hebrew-only records', 'source section 19 · 12 Hebrew-only records', 'chapter 18 indices 5–9', '10 bilingual blocks p18a–p18j', 'Pe’er pages 113–150', 'page 151 begins Torah 19', 'https://www.peer-halikutim.com/'):
        require(token in astro, f'Route source-integrity token missing: {token}')
    discovery = [ROOT / 'src/pages/reader/likutay-moharan/index.astro', ROOT / 'src/pages/reader/likutay-moharan/[part]/index.astro', ROOT / 'src/pages/reader/likutay-moharan/[part]/[torah].astro']
    for path in discovery:
        text = path.read_text(encoding='utf-8-sig').replace('\x00', '')
        require('/reader/super/likutay-moharan/1/18' in text or '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]' in text, f'Discovery missing in {path}')

    status = 'facsimiles ready' if actual_assets else 'facsimiles pending separately supervised conversion'
    print('Validated Torah 18: 54 Sefaria leaves + restored Rashbam (55 bilingual passages), separate Hebrew-only doxology, exact 28-segment in-scope crosswalk, 30 exact bilingual phrases, 9 study layers, Pettek 28 asymmetric, Biur 5, Parparos 12 Hebrew-only, Nanach 5, prayer 10, Pe’er pages 113–150; ' + status + '.')

if __name__ == '__main__':
    main()
