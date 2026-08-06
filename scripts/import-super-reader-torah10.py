#!/usr/bin/env python3
"""Import and semantically align the licensed Torah 10 Hebrew/English witness."""
from __future__ import annotations
import html, json, re
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/reader/super/likutay-moharan/1/10/torah-study.json'
CLASSIC = ROOT / 'public/reader/likutay-moharan/part-1/torah-10.json'
MARKS = re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
RASHBAM = 'רשב"ם: בזעי - בקעים דכתיב: ותבקע האדמה וגו\' קטרא - עשן. שקל גבבא דעמרא - לקח גזת צמר ושראה במים. ואחרך אחרוכי - הני גבבי, ואף על פי ששרו אותה במים. אצית - הסכת ושמע. ושמעת דקאמרי - שהרי ירדו חיים שאולה. כל תלתין יומין - כל ראש חדש. בקלחת שמהפכין אותו כדי שתתבשל:'

def plain(value: str) -> str:
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', value or ''))).strip()

def classic_segment(index: int) -> int:
    ranges = [(1,1,1),(2,2,3),(3,3,5),(4,8,7),(9,14,9),(15,17,10),(18,23,11),
              (24,25,12),(26,30,14),(31,32,16),(33,35,18),(36,46,19),(47,47,20),
              (48,48,21),(49,49,22),(50,58,23),(59,65,24),(66,66,25),(67,67,26),(68,70,27)]
    return next(classic for lo, hi, classic in ranges if lo <= index <= hi)

def make(index: int, section: int, comment: int | str, he_nikud: str, en: str, source_ref: str | None = None) -> dict:
    return {'index': index, 'sourceSection': section, 'sourceComment': comment,
            'sourceRef': source_ref or f'Likutei Moharan 10:{section}:{comment}',
            'classicSegment': classic_segment(index), 'he': MARKS.sub('', plain(he_nikud)),
            'he_nikud': plain(he_nikud), 'en': plain(en)}

def main() -> None:
    classic = json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00', ''))
    passages, versions = [], None
    for section in range(1, 12):
        response = requests.get(f'https://www.sefaria.org/api/texts/Likutei_Moharan.10.{section}?lang=bi&context=0', timeout=45)
        response.raise_for_status(); data = response.json()
        if versions is None: versions = data.get('versions', [])
        he_items = list(data.get('he') or []); en_items = list(data.get('text') or [])
        if len(he_items) != len(en_items): raise RuntimeError(f'Section {section} count mismatch')
        if section == 9:
            # The API cuts the quoted aggadah after "I heard them saying". Put its
            # remainder with 9:2, then split 9:3 commentary from the 9:4 crack gloss.
            clean_en = [plain(v) for v in en_items]
            clean_en[1] = f'{clean_en[1]} {clean_en[2]}'
            marker = 'I saw two cracks from which fumes were coming out —'
            if marker not in clean_en[3]: raise RuntimeError('Torah 10:9 English semantic split marker missing')
            korach, cracks = clean_en[3].split(marker, 1)
            clean_en[2] = korach.strip()
            clean_en[3] = f'{marker} {cracks}'.strip()
            en_items = clean_en
        for comment, (he_raw, en_raw) in enumerate(zip(he_items, en_items), 1):
            passages.append(make(len(passages)+1, section, comment, he_raw, en_raw))
            if section == 9 and comment == 2:
                passages.append(make(len(passages)+1, section, 'Rashbam gloss', RASHBAM, '',
                    'Rashbam gloss preserved in the Classic witness; absent from Sefaria Hebrew.'))
    if len(passages) != 70: raise RuntimeError(f'Expected 70 passages, found {len(passages)}')
    if any(not p['he'] or not p['he_nikud'] for p in passages): raise RuntimeError('Empty Hebrew passage')
    if [p['index'] for p in passages if not p['en']] != [49]: raise RuntimeError('Only Rashbam passage 49 may lack English')
    payload = {'id':'super-lm-1-10-study','book':'likutay-moharan','part':1,'torah':10,'displayNumber':'10',
        'title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic['keyVerse'],
        'keyVerseTranslation':classic['keyVerseTranslation'],'keyVerseRef':classic['keyVerseRef'],
        'themes':classic.get('themes',[]),'segments':passages,'totalPassages':70,'hasEnglish':True,'hasNikud':True,
        'license':{'he':'Public Domain (rabenubook.com edition via Sefaria)','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)',
          'notes':['Passage 49 is a Hebrew-only Classic-witness Rashbam gloss; no English was supplied or invented.',
                   'Sefaria English 10:9:2–4 was recombined and split at its semantic boundaries without changing its words.']},
        'source':{'sefariaRef':'Likutei Moharan 10','classicFile':str(CLASSIC.relative_to(ROOT)),'versions':versions},
        'generatedAt':datetime.now(timezone.utc).isoformat()}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Prepared 70 aligned Torah 10 passages (69 Sefaria + Hebrew-only Rashbam gloss).')
if __name__ == '__main__': main()
