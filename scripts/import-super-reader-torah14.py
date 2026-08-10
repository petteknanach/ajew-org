#!/usr/bin/env python3
"""Import Torah 14 from the canonical Sefaria bilingual witness and preserve three Classic-only addenda."""
from __future__ import annotations
import html, json, re
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/reader/super/likutay-moharan/1/14/torah-study.json'
CLASSIC = ROOT / 'public/reader/likutay-moharan/part-1/torah-14.json'
MARKS = re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
SECTION_COUNTS = [2, 3, 6, 3, 13, 1, 1, 5, 10, 7, 6, 9, 9]


def plain(value: str) -> str:
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', value or ''))).strip()


def crosswalk(section: int, comment: int) -> tuple[int, list[int] | None]:
    if section == 1: return (1, None) if comment == 1 else (2, None)
    if section == 2: return (4, [3, 4]) if comment == 1 else ((4, None) if comment == 2 else (5, None))
    if section == 3: return (7, [6, 7]) if comment == 1 else (7, None)
    if section == 4: return 8, None
    if section == 5:
        if comment == 1: return 9, None
        if comment <= 3: return 10, None
        return 13, None
    if section == 6: return 15, [14, 15]
    if section == 7: return 17, [16, 17]
    if section == 8: return (19, [18, 19]) if comment == 1 else (19, None)
    if section == 9: return (20, None) if comment == 1 else (23, None)
    if section == 10: return 24, None
    if section == 11: return (26, [25, 26]) if comment == 1 else (26, None)
    if section == 12: return (28, [27, 28]) if comment == 1 else (28, None)
    if section == 13:
        if comment == 1: return 29, None
        if comment <= 6: return 30, None
        if comment == 7: return 31, None
        return 32, None
    raise RuntimeError(f'No Classic crosswalk for 14:{section}:{comment}')


def classic_addendum(classic: dict, classic_numbers: list[int], label: str, source_ref: str) -> dict:
    he = ' '.join(str(classic['segments'][number - 1].get('he') or '').strip() for number in classic_numbers).strip()
    if not he:
        raise RuntimeError(f'Empty Classic addendum {classic_numbers}')
    return {
        'sourceSection': 14,
        'sourceComment': label,
        'sourceRef': source_ref,
        'classicSegment': classic_numbers[-1],
        'classicSegments': classic_numbers,
        'provenance': 'Classic source-only Hebrew addendum; absent from the Sefaria/BRI bilingual witness',
        'he': he,
        'he_nikud': he,
        'en': '',
        'hebrewOnly': True,
        'displayLabel': 'Classic source-only Hebrew (no safe English witness)',
    }


def main() -> None:
    classic = json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00', ''))
    if len(classic.get('segments', [])) != 33 or len(classic.get('aligned_segments', [])) != 33:
        raise RuntimeError('Torah 14 Classic constants must be 33 coarse / 33 legacy aligned')
    passages, versions = [], []
    for section, count in enumerate(SECTION_COUNTS, 1):
        response = requests.get(f'https://www.sefaria.org/api/texts/Likutei_Moharan.14.{section}?lang=bi&context=0', timeout=45)
        response.raise_for_status(); data = response.json()
        hebrew, english = list(data.get('he') or []), list(data.get('text') or [])
        if len(hebrew) != count or len(english) != count:
            raise RuntimeError(f'Section {section}: expected {count}, got HE {len(hebrew)}, EN {len(english)}')
        if not versions: versions = data.get('versions', [])
        for comment, (he, en) in enumerate(zip(hebrew, english), 1):
            he_nikud, en_text = plain(he), plain(en)
            if not he_nikud or not en_text:
                raise RuntimeError(f'Empty Sefaria passage 14:{section}:{comment}')
            classic_segment, classic_segments = crosswalk(section, comment)
            record = {
                'sourceSection': section, 'sourceComment': comment,
                'sourceRef': f'Likutei Moharan 14:{section}:{comment}',
                'classicSegment': classic_segment,
                'provenance': 'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English',
                'he': MARKS.sub('', he_nikud), 'he_nikud': he_nikud, 'en': en_text,
            }
            if classic_segments: record['classicSegments'] = classic_segments
            passages.append(record)
            if section == 5 and comment == 3:
                passages.append(classic_addendum(classic, [11, 12], '5:3a', 'Rashbam gloss preserved after Likutei Moharan 14:5:3; absent from Sefaria.'))
            if section == 9 and comment == 1:
                passages.append(classic_addendum(classic, [21, 22], '9:1a', 'Rashbam gloss preserved after Likutei Moharan 14:9:1; absent from Sefaria.'))
    passages.append(classic_addendum(classic, [33], '13:9a', 'Classic “Foundation of the matter” memorandum after Likutei Moharan 14:13:9; absent from Sefaria.'))
    for index, record in enumerate(passages, 1): record['index'] = index
    if len(passages) != 78 or sum(bool(p.get('en')) for p in passages) != 75:
        raise RuntimeError('Expected 78 displayed passages: 75 bilingual plus three labeled Classic source-only addenda')
    represented = {n for item in passages for n in item.get('classicSegments', [item['classicSegment']])}
    if represented != set(range(1, 34)):
        raise RuntimeError(f'Classic crosswalk does not cover all 33 records: {sorted(represented)}')
    payload = {
        'id':'super-lm-1-14-study','book':'likutay-moharan','part':1,'torah':14,'displayNumber':'14',
        'title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic['keyVerse'],
        'keyVerseTranslation':passages[0]['en'],'keyVerseRef':classic['keyVerseRef'],'themes':classic.get('themes',[]),
        'segments':passages,'totalPassages':78,'sefariaSections':13,'sefariaPassages':75,
        'classicSegments':33,'classicAlignedLegacy':33,'classicSourceOnlyPassages':3,'hasEnglish':True,'hasNikud':True,
        'license':{
            'he':'Public Domain (rabenubook.com edition via Sefaria); three source-only Hebrew addenda from repository Classic witness',
            'en':'CC BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)',
            'notes':['All 75 Sefaria passages preserve licensed bilingual wording.','Two Classic Rashbam glosses and the final Classic foundation memorandum are retained as clearly labeled source-only Hebrew; shifted legacy English is not used.']},
        'source':{'sefariaRef':'Likutei Moharan 14','classicFile':str(CLASSIC.relative_to(ROOT)),'sectionCounts':SECTION_COUNTS,'versions':versions},
        'generatedAt':datetime.now(timezone.utc).isoformat(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Prepared Torah 14: 75 canonical Sefaria bilingual passages + three labeled Classic source-only Hebrew addenda (78 total); all 33 Classic records crosswalked.')

if __name__ == '__main__': main()
