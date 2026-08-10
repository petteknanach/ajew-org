#!/usr/bin/env python3
"""Import Torah 13's 80 licensed bilingual passages plus the Hebrew-only Classic Rashbam gloss."""
from __future__ import annotations
import html, json, re
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/reader/super/likutay-moharan/1/13/torah-study.json'
CLASSIC = ROOT / 'public/reader/likutay-moharan/part-1/torah-13.json'
MARKS = re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
SECTION_COUNTS = [9, 3, 5, 9, 23, 22, 9]
NOTES = {
 (1, 1): '(עיין בסוף הספר כל התורה הזאת מכת"י רבינו ז"ל בעצמו בנוסח אחר.)',
 (1, 8): '(עיין סנהדרין קי"ג ועיין ספרי פ\' ראה:)',
 (2, 1): '(עיין זוהר בהעלותך קנ"ב)',
 (5, 19): '(עיין תיקון י\' ותיקון כ"א ותיקון ס"ט)',
 (6, 8): '(עיין זוהר ויחי רמ"ט:)',
 (6, 21): '(עיין זוהר ויקהל קצ"ה: רי"ג:)',
 (7, 9): '(עיין בסוף בנ"א של כת"י רבינו ז"ל בעצמו מובא כל הפסוק הזה)',
}


def plain(value: str) -> str:
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', value or ''))).strip()


def crosswalk(index: int) -> tuple[int, list[int] | None]:
    if index == 1: return 1, None
    if 2 <= index <= 4: return 2, None
    if index == 5: return 2, [2, 3]
    if 6 <= index <= 9: return 3, None
    if 10 <= index <= 12: return 4, None
    if 13 <= index <= 17: return 5, None
    if 18 <= index <= 26: return 6, None
    if index == 27: return 7, [7, 8]
    if 28 <= index <= 41: return 9, None
    if 42 <= index <= 48: return 10, None
    if index == 49: return 10, [10, 11]
    if index == 50: return 11, None
    if 51 <= index <= 53: return 12, None
    if index == 54: return 13, None
    if 55 <= index <= 65: return 14, None
    if 66 <= index <= 72: return 15, None
    if 73 <= index <= 78: return 16, None
    if index == 79: return 17, None
    if 80 <= index <= 81: return 18, None
    raise RuntimeError(f'No Classic crosswalk for passage {index}')


def main() -> None:
    classic = json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00', ''))
    if len(classic.get('segments', [])) != 18 or len(classic.get('aligned_segments', [])) != 78:
        raise RuntimeError('Torah 13 Classic constants must be 18 coarse / 78 legacy aligned')
    passages, versions = [], []
    for section, count in enumerate(SECTION_COUNTS, 1):
        response = requests.get(f'https://www.sefaria.org/api/texts/Likutei_Moharan.13.{section}?lang=bi&context=0', timeout=45)
        response.raise_for_status(); data = response.json()
        hebrew, english = list(data.get('he') or []), list(data.get('text') or [])
        if len(hebrew) != count or len(english) != count:
            raise RuntimeError(f'Section {section}: expected {count}, got HE {len(hebrew)}, EN {len(english)}')
        if not versions: versions = data.get('versions', [])
        for comment, (he, en) in enumerate(zip(hebrew, english), 1):
            displayed = len(passages) + 1
            # Insert the Classic-only gloss after 13:6:4 and before 13:6:5.
            if section == 6 and comment == 5:
                gloss_he = str(classic['segments'][12].get('he') or '').strip()
                if not gloss_he: raise RuntimeError('Classic segment 13 Rashbam gloss is empty')
                passages.append({'index': displayed, 'sourceSection': 6, 'sourceComment': '4a',
                    'sourceRef': 'Rashbam gloss preserved in the Classic witness after Likutei Moharan 13:6:4; absent from Sefaria.',
                    'classicSegment': 13, 'provenance': 'Classic Hebrew-only Rashbam gloss; no safe English witness',
                    'he': gloss_he, 'he_nikud': gloss_he, 'en': '', 'hebrewOnly': True,
                    'displayLabel': 'Classic Rashbam gloss (Hebrew only)'})
                displayed += 1
            he_nikud, en_text = plain(he), plain(en)
            if not he_nikud or not en_text: raise RuntimeError(f'Empty Sefaria passage 13:{section}:{comment}')
            note = NOTES.get((section, comment))
            if note:
                he_nikud = f'{he_nikud} {note}'
            classic_segment, classic_segments = crosswalk(displayed)
            record = {'index': displayed, 'sourceSection': section, 'sourceComment': comment,
                'sourceRef': f'Likutei Moharan 13:{section}:{comment}', 'classicSegment': classic_segment,
                'provenance': 'Sefaria bilingual witness' + (' with Classic-only Hebrew editorial/citation note' if note else ''),
                'he': MARKS.sub('', he_nikud), 'he_nikud': he_nikud, 'en': en_text}
            if classic_segments: record['classicSegments'] = classic_segments
            if note: record['classicNote'] = note
            passages.append(record)
    if len(passages) != 81 or sum(bool(p.get('en')) for p in passages) != 80:
        raise RuntimeError('Expected 81 total passages: 80 bilingual plus one Hebrew-only gloss')
    payload = {'id':'super-lm-1-13-study','book':'likutay-moharan','part':1,'torah':13,'displayNumber':'13',
        'title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic['keyVerse'],
        'keyVerseTranslation': passages[0]['en'], 'keyVerseRef':classic['keyVerseRef'],'themes':classic.get('themes',[]),
        'segments':passages,'totalPassages':81,'sefariaSections':7,'sefariaPassages':80,
        'classicSegments':18,'classicAlignedLegacy':78,'classicGlossPassage':54,'hasEnglish':True,'hasNikud':True,
        'license':{'he':'Public Domain (rabenubook.com edition via Sefaria); Classic Hebrew gloss and notes from repository witness',
          'en':'CC BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)',
          'notes':['All 80 Sefaria passages preserve licensed bilingual wording.','Seven Classic-only Hebrew editorial/citation notes are merged into their audited host passages.','Passage 54 is the complete Classic segment 13 Rashbam gloss, clearly labeled Hebrew-only; contaminated legacy English is not used.']},
        'source':{'sefariaRef':'Likutei Moharan 13','classicFile':str(CLASSIC.relative_to(ROOT)),'versions':versions},
        'generatedAt':datetime.now(timezone.utc).isoformat()}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Prepared Torah 13: 80 Sefaria bilingual passages + one labeled Hebrew-only Classic Rashbam gloss; seven Classic notes merged.')

if __name__ == '__main__': main()
