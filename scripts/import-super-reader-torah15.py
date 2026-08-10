#!/usr/bin/env python3
"""Import Torah 15 from the canonical Sefaria bilingual witness and preserve two Classic-only addenda."""
from __future__ import annotations
import html, json, re
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/reader/super/likutay-moharan/1/15/torah-study.json'
CLASSIC = ROOT / 'public/reader/likutay-moharan/part-1/torah-15.json'
MARKS = re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
SECTION_COUNTS = [2, 4, 1, 3, 11, 7, 8, 7]


def plain(value: str) -> str:
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', value or ''))).strip()


def crosswalk(section: int, comment: int) -> tuple[int, list[int] | None]:
    if section == 1: return (2, [1, 2]) if comment == 1 else (3, None)
    if section == 2: return (5, [4, 5]) if comment == 1 else (5, None)
    if section == 3: return 7, [6, 7]
    if section == 4: return 8, None
    if section == 5: return (10, [9, 10]) if comment == 1 else (12, None)
    if section == 6: return (14, [13, 14]) if comment == 1 else (14, None)
    if section == 7: return 15, None
    if section == 8: return (17, [16, 17]) if comment == 1 else (17, None)
    raise RuntimeError(f'No Classic crosswalk for 15:{section}:{comment}')


def classic_addendum(classic: dict, classic_numbers: list[int], label: str, source_ref: str) -> dict:
    he = ' '.join(str(classic['segments'][number - 1].get('he') or '').strip() for number in classic_numbers).strip()
    if not he:
        raise RuntimeError(f'Empty Classic addendum {classic_numbers}')
    return {
        'sourceSection': 15, 'sourceComment': label, 'sourceRef': source_ref,
        'classicSegment': classic_numbers[-1], 'classicSegments': classic_numbers,
        'provenance': 'Classic source-only Hebrew addendum; absent from the Sefaria/BRI bilingual witness',
        'he': he, 'he_nikud': he, 'en': '', 'hebrewOnly': True,
        'displayLabel': 'Classic source-only Hebrew (no safe English witness)',
    }


def main() -> None:
    classic = json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00', ''))
    if len(classic.get('segments', [])) != 18 or len(classic.get('aligned_segments', [])) != 53:
        raise RuntimeError('Torah 15 Classic constants must be 18 coarse / 53 legacy aligned')
    passages, versions = [], []
    for section, count in enumerate(SECTION_COUNTS, 1):
        response = requests.get(f'https://www.sefaria.org/api/texts/Likutei_Moharan.15.{section}?lang=bi&context=0', timeout=45)
        response.raise_for_status(); data = response.json()
        hebrew, english = list(data.get('he') or []), list(data.get('text') or [])
        if len(hebrew) != count or len(english) != count:
            raise RuntimeError(f'Section {section}: expected {count}, got HE {len(hebrew)}, EN {len(english)}')
        if not versions: versions = data.get('versions', [])
        for comment, (he, en) in enumerate(zip(hebrew, english), 1):
            he_nikud, en_text = plain(he), plain(en)
            if not he_nikud or not en_text:
                raise RuntimeError(f'Empty Sefaria passage 15:{section}:{comment}')
            classic_segment, classic_segments = crosswalk(section, comment)
            record = {
                'sourceSection': section, 'sourceComment': comment,
                'sourceRef': f'Likutei Moharan 15:{section}:{comment}',
                'classicSegment': classic_segment,
                'provenance': 'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English',
                'he': MARKS.sub('', he_nikud), 'he_nikud': he_nikud, 'en': en_text,
            }
            if classic_segments: record['classicSegments'] = classic_segments
            passages.append(record)
            if section == 5 and comment == 1:
                passages.append(classic_addendum(classic, [11], '5:1a', 'Rashbam gloss preserved after Likutei Moharan 15:5:1; absent from Sefaria.'))
    passages.append(classic_addendum(classic, [18], '8:7a', 'Classic closing memorandum after Likutei Moharan 15:8:7; absent from Sefaria.'))
    for index, record in enumerate(passages, 1): record['index'] = index
    if len(passages) != 45 or sum(bool(p.get('en')) for p in passages) != 43:
        raise RuntimeError('Expected 45 displayed passages: 43 bilingual plus two labeled Classic source-only addenda')
    represented = {n for item in passages for n in item.get('classicSegments', [item['classicSegment']])}
    if represented != set(range(1, 19)):
        raise RuntimeError(f'Classic crosswalk does not cover all 18 records: {sorted(represented)}')
    payload = {
        'id':'super-lm-1-15-study','book':'likutay-moharan','part':1,'torah':15,'displayNumber':'15',
        'title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic['keyVerse'],
        'keyVerseTranslation':passages[0]['en'],'keyVerseRef':classic['keyVerseRef'],'themes':classic.get('themes',[]),
        'segments':passages,'totalPassages':45,'sefariaSections':8,'sefariaPassages':43,
        'classicSegments':18,'classicAlignedLegacy':53,'classicSourceOnlyPassages':2,'hasEnglish':True,'hasNikud':True,
        'license':{
            'he':'Public Domain (rabenubook.com edition via Sefaria); two source-only Hebrew addenda from repository Classic witness',
            'en':'CC BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)',
            'notes':['All 43 Sefaria passages preserve licensed bilingual wording.','The Classic Rashbam gloss and closing memorandum are retained as clearly labeled source-only Hebrew; shifted legacy English is not used.']},
        'source':{'sefariaRef':'Likutei Moharan 15','classicFile':str(CLASSIC.relative_to(ROOT)),'sectionCounts':SECTION_COUNTS,'versions':versions},
        'generatedAt':datetime.now(timezone.utc).isoformat(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Prepared Torah 15: 43 canonical Sefaria bilingual passages + two labeled Classic source-only Hebrew addenda (45 total); all 18 Classic records crosswalked.')

if __name__ == '__main__': main()
