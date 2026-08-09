#!/usr/bin/env python3
"""Import the frozen Torah 27 bilingual Sefaria witness."""
import html, json, re
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/reader/super/likutay-moharan/1/27/torah-study.json'
CLASSIC = ROOT / 'public/reader/likutay-moharan/part-1/torah-27.json'
API = 'https://www.sefaria.org/api/texts/Likutei_Moharan.27.{section}?context=0&commentary=0'
COUNTS = [2, 2, 1, 2, 2, 10, 4, 1, 7, 2]
MARKS = re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
KNOWN_TAGS = re.compile(r'</?(?:i|b|em|strong|span|small|sup|br)(?:\s[^>]*)?>', re.I)


def plain(value):
    return re.sub(r'\s+', ' ', html.unescape(KNOWN_TAGS.sub('', value or ''))).strip()


def classic_segment(section, leaf):
    if section == 1: return 1 if leaf == 1 else 2
    if section == 2: return 3
    if section == 3: return 4
    if section == 4: return 5
    if section == 5: return 6
    if section == 6: return 7 if leaf == 1 else 8
    if section == 7: return 9
    return 10


def main():
    classic = json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00', ''))
    if len(classic['segments']) != 10:
        raise RuntimeError('Classic Torah 27 witness changed')
    segments, sections = [], []
    for section, expected in enumerate(COUNTS, 1):
        data = requests.get(API.format(section=section), timeout=45).json()
        he, en = data.get('he') or [], data.get('text') or []
        if data.get('ref') != f'Likutei Moharan 27:{section}' or len(he) != expected or len(en) != expected:
            raise RuntimeError(f'Sefaria Torah 27 section {section} changed')
        expected_prev = 'Likutei Moharan 26:1' if section == 1 else f'Likutei Moharan 27:{section-1}'
        expected_next = 'Likutei Moharan 28:1' if section == 10 else f'Likutei Moharan 27:{section+1}'
        if data.get('prev') != expected_prev or data.get('next') != expected_next:
            raise RuntimeError(f'Sefaria boundary changed at section {section}')
        sections.append(data)
        for leaf, (raw_he, raw_en) in enumerate(zip(he, en), 1):
            hn, english = plain(raw_he), plain(raw_en)
            if not hn or not english:
                raise RuntimeError(f'empty 27:{section}:{leaf}')
            segments.append({
                'index': len(segments) + 1, 'sourceSection': section, 'sourceComment': leaf,
                'sourceRef': f'Likutei Moharan 27:{section}:{leaf}',
                'provenance': 'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English',
                'he': MARKS.sub('', hn), 'he_nikud': hn, 'en': english,
                'rawSource': {'he': raw_he, 'en': raw_en},
                'classicSegment': classic_segment(section, leaf),
            })
    probe = requests.get(API.format(section=11), timeout=45).json()
    if (probe.get('he') or []) or (probe.get('text') or []) or probe.get('prev') != 'Likutei Moharan 27:10' or probe.get('next') != 'Likutei Moharan 28:1':
        raise RuntimeError('section 11 upper-bound probe changed')
    if len(segments) != 33:
        raise RuntimeError('passage count')
    first, last = sections[0], sections[-1]
    payload = {
        'id': 'super-lm-1-27-study', 'book': 'likutay-moharan', 'part': 1, 'torah': 27,
        'displayNumber': '27', 'title': classic['title'], 'hebrewTitle': classic['hebrewTitle'],
        'keyVerse': classic.get('keyVerse'), 'keyVerseTranslation': segments[0]['en'],
        'keyVerseRef': classic.get('keyVerseRef'), 'themes': classic.get('themes', []),
        'segments': segments, 'structuralNotes': [], 'totalPassages': 33,
        'productionAlignedPassages': 33, 'productionDisplayRecords': 33,
        'sefariaSections': 10, 'sefariaSectionCounts': COUNTS, 'sefariaPassages': 33,
        'classicFileSegments': 10, 'classicInScopeSegments': 10,
        'restoredBilingualSupplements': 0, 'structuralRestorations': 0,
        'hasEnglish': True, 'hasNikud': True,
        'license': {'he': 'Public Domain (Likutei Moharan - rabenubook.com via Sefaria)', 'en': 'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)'},
        'source': {
            'sefariaRef': 'Likutei Moharan 27:1-10', 'apiPattern': API,
            'classicFile': str(CLASSIC.relative_to(ROOT)), 'ref': first.get('ref'),
            'prev': first.get('prev'), 'lastRef': last.get('ref'), 'lastNext': last.get('next'),
            'versionTitle': first.get('versionTitle'), 'license': first.get('license'),
            'versionSource': first.get('versionSource'), 'heVersionTitle': first.get('heVersionTitle'),
            'heLicense': first.get('heLicense'), 'heVersionSource': first.get('heVersionSource'),
            'versions': first.get('versions', []), 'upperBoundProbe': 'Likutei Moharan 27:11',
        },
        'alignmentNotes': ['Exactly 33 licensed bilingual Sefaria leaves; no supplement or structural restoration.', 'Classic segments establish the frozen coarse crosswalk only; shifted coarse Classic English is unused.'],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Prepared Torah 27: 33 exact bilingual Sefaria leaves across sections 1–10.')

if __name__ == '__main__': main()
