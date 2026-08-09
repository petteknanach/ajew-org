#!/usr/bin/env python3
"""Import the frozen Torah 26 bilingual Sefaria witness and exact Hebrew-only Classic Rashi note."""
import html, json, re
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/reader/super/likutay-moharan/1/26/torah-study.json'
CLASSIC = ROOT / 'public/reader/likutay-moharan/part-1/torah-26.json'
API = 'https://www.sefaria.org/api/texts/Likutei_Moharan.26.1?context=0&commentary=0'
MARKS = re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
KNOWN_TAGS = re.compile(r'</?(?:i|b|em|strong|span|small|sup|br)(?:\s[^>]*)?>', re.I)
RASHI = 'רש"י: רציצא דמית, אפרוח שמת בתוך קלפתו:'


def plain(value):
    return re.sub(r'\s+', ' ', html.unescape(KNOWN_TAGS.sub('', value or ''))).strip()


def main():
    classic = json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00', ''))
    if len(classic['segments']) != 4 or classic['segments'][2]['he'].strip() != RASHI:
        raise RuntimeError('Classic Torah 26 witness changed')
    data = requests.get(API, timeout=45).json()
    he, en = data.get('he') or [], data.get('text') or []
    if data.get('ref') != 'Likutei Moharan 26:1' or len(he) != 5 or len(en) != 5:
        raise RuntimeError('Sefaria Torah 26 leaf changed')
    if data.get('prev') != 'Likutei Moharan 25:9' or data.get('next') != 'Likutei Moharan 27:1':
        raise RuntimeError('Sefaria Torah 26 boundaries changed')
    segments = []
    for leaf, (raw_he, raw_en) in enumerate(zip(he, en), 1):
        hn, english = plain(raw_he), plain(raw_en)
        if not hn or not english:
            raise RuntimeError(f'empty 26:1:{leaf}')
        segments.append({
            'index': len(segments) + 1,
            'sourceSection': 1,
            'sourceComment': leaf,
            'sourceRef': f'Likutei Moharan 26:1:{leaf}',
            'provenance': 'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English',
            'he': MARKS.sub('', hn), 'he_nikud': hn, 'en': english,
            'rawSource': {'he': raw_he, 'en': raw_en},
            'classicSegment': 1 if leaf == 1 else 4,
        })
        if leaf == 1:
            segments.append({
                'index': 2, 'type': 'structuralNote', 'afterAlignedPassage': 1,
                'sourceSection': 1, 'sourceComment': None, 'sourceRef': None,
                'provenance': 'Exact separately attributed Hebrew-only Classic printed-Rashi structural note',
                'he': RASHI, 'he_nikud': RASHI, 'en': None, 'rawSource': None,
                'classicSegment': 3,
                'source': '/reader/likutay-moharan/part-1/torah-26.json#segment-3',
                'sefariaEnglishLocation': 'Likutei Moharan 26:1:5',
            })
    for i, segment in enumerate(segments, 1):
        segment['index'] = i
    first = data
    payload = {
        'id': 'super-lm-1-26-study', 'book': 'likutay-moharan', 'part': 1, 'torah': 26,
        'displayNumber': '26', 'title': classic['title'], 'hebrewTitle': classic['hebrewTitle'],
        'keyVerse': classic.get('keyVerse'), 'keyVerseTranslation': segments[0]['en'],
        'keyVerseRef': classic.get('keyVerseRef'), 'themes': classic.get('themes', []),
        'segments': segments, 'structuralNotes': [segments[1]],
        'totalPassages': 5, 'productionAlignedPassages': 5, 'productionDisplayRecords': 6,
        'sefariaSections': 1, 'sefariaSectionCounts': [5], 'sefariaPassages': 5,
        'classicFileSegments': 4, 'classicInScopeSegments': 4,
        'restoredBilingualSupplements': 0, 'structuralRestorations': 1,
        'hasEnglish': True, 'hasNikud': True,
        'license': {
            'he': 'Public Domain (Likutei Moharan - rabenubook.com via Sefaria; Classic structural note separately attributed)',
            'en': 'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria; no English assigned to the Classic structural note)',
        },
        'source': {
            'sefariaRef': 'Likutei Moharan 26:1', 'apiPattern': API,
            'classicFile': str(CLASSIC.relative_to(ROOT)), 'ref': first.get('ref'),
            'prev': first.get('prev'), 'lastNext': first.get('next'),
            'versionTitle': first.get('versionTitle'), 'license': first.get('license'),
            'versionSource': first.get('versionSource'), 'heVersionTitle': first.get('heVersionTitle'),
            'heLicense': first.get('heLicense'), 'heVersionSource': first.get('heVersionSource'),
            'versions': first.get('versions', []),
        },
        'alignmentNotes': [
            'Five licensed bilingual Sefaria leaves plus one exact separately attributed Hebrew-only Classic printed-Rashi structural note.',
            'The structural note follows 26:1:1; its Sefaria English equivalent remains in 26:1:5 and is not duplicated or relocated.',
            'Shifted coarse Classic English is otherwise unused.',
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Prepared Torah 26: 5 exact Sefaria leaves + 1 Hebrew-only Classic Rashi structural note (6 display records).')


if __name__ == '__main__':
    main()
