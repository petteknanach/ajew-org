#!/usr/bin/env python3
"""Import the frozen Torah 16 bilingual witness and restore its Rashbam supplement."""
from __future__ import annotations
import html, json, re
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/reader/super/likutay-moharan/1/16/torah-study.json'
CLASSIC = ROOT / 'public/reader/likutay-moharan/part-1/torah-16.json'
API = 'https://www.sefaria.org/api/texts/Likutei_Moharan.16.1?context=0&commentary=0'
MARKS = re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
RASHBAM_HE = 'רשב״ם: ונפיץ — ושפך. אוסיא — נחיריו. מברי דסורא — נהרות שבסורא.'
RASHBAM_EN = 'Rashbam: nafitz — and it spouted/poured; usya — its nostrils; mavrei de-Sura — the rivers of Sura.'

def plain(value: str) -> str:
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', value or ''))).strip()

def main() -> None:
    classic = json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00', ''))
    if len(classic.get('segments', [])) != 3:
        raise RuntimeError('Torah 16 Classic source must contain exactly 3 coarse segments')
    response = requests.get(API, timeout=45)
    response.raise_for_status()
    data = response.json()
    hebrew, english = list(data.get('he') or []), list(data.get('text') or [])
    if data.get('ref') != 'Likutei Moharan 16:1' or data.get('next') != 'Likutei Moharan 17:1' or len(hebrew) != 10 or len(english) != 10:
        raise RuntimeError('Frozen Sefaria section/count/boundary constants changed')
    passages = []
    for comment, (raw_he, raw_en) in enumerate(zip(hebrew, english), 1):
        he_nikud, en_text = plain(raw_he), plain(raw_en)
        corrections = []
        if comment == 1:
            opening = 'רַבִּי יוֹחָנָן מִשְׁתָּעֵי'
            at = he_nikud.find(opening)
            if at < 0:
                raise RuntimeError('Cannot locate the canonical fish-story opening in 16:1:1')
            he_nikud = he_nikud[at:]
            if 'eyesresembled' not in en_text:
                raise RuntimeError('Expected frozen Sefaria eyesresembled typo is absent')
            en_text = en_text.replace('eyesresembled', 'eyes resembled')
            corrections.append({'from':'eyesresembled','to':'eyes resembled','reason':'display spacing only'})
        if comment in (3, 7):
            if 'no st rils' not in en_text:
                raise RuntimeError(f'Expected frozen Sefaria no st rils typo is absent in 16:1:{comment}')
            en_text = en_text.replace('no st rils', 'nostrils')
            corrections.append({'from':'no st rils','to':'nostrils','reason':'display spacing only'})
        if not he_nikud or not en_text:
            raise RuntimeError(f'Empty Sefaria passage 16:1:{comment}')
        record = {
            'sourceSection':1, 'sourceComment':comment, 'sourceRef':f'Likutei Moharan 16:1:{comment}',
            'classicSegment':1 if comment == 1 else 3,
            'provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English',
            'he':MARKS.sub('', he_nikud), 'he_nikud':he_nikud, 'en':en_text,
            'rawSource':{'he':raw_he,'en':raw_en},
        }
        if corrections:
            record['displayCorrections'] = corrections
        passages.append(record)
        if comment == 1:
            passages.append({
                'sourceSection':None, 'sourceComment':'Rashbam supplement', 'sourceRef':None,
                'classicSegment':2, 'provenance':'Classic segment 2 / Rashbam on Bava Batra 74a; restored mixed-provenance supplement absent from Sefaria',
                'sourceCitation':'Rashbam on Bava Batra 74a', 'insertedSupplement':True,
                'he':RASHBAM_HE, 'he_nikud':RASHBAM_HE, 'en':RASHBAM_EN,
            })
    for index, record in enumerate(passages, 1):
        record['index'] = index
    expected_refs = ['Likutei Moharan 16:1:1', None] + [f'Likutei Moharan 16:1:{n}' for n in range(2, 11)]
    if len(passages) != 11 or [p['sourceRef'] for p in passages] != expected_refs or [p['classicSegment'] for p in passages] != [1,2]+[3]*9:
        raise RuntimeError('Frozen 11-passage production alignment failed')
    if any(not p.get('he') or not p.get('en') for p in passages):
        raise RuntimeError('Every displayed Torah 16 passage must be genuinely bilingual')
    payload = {
        'id':'super-lm-1-16-study','book':'likutay-moharan','part':1,'torah':16,'displayNumber':'16',
        'title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic['keyVerse'],
        'keyVerseTranslation':passages[0]['en'],'keyVerseRef':classic['keyVerseRef'],'themes':classic.get('themes',[]),
        'segments':passages,'totalPassages':11,'sefariaSections':1,'sefariaPassages':10,
        'classicSegments':3,'restoredBilingualSupplements':1,'hasEnglish':True,'hasNikud':True,
        'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria)','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)','supplement':'Classic segment 2 / Rashbam on Bava Batra 74a'},
        'source':{
            'sefariaRef':'Likutei Moharan 16:1','sefariaSourceRange':'Likutei Moharan 16:1:1-10','api':API,
            'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':data.get('ref'),'next':data.get('next'),'prev':data.get('prev'),
            'versionTitle':data.get('versionTitle'),'license':data.get('license'),'versionSource':data.get('versionSource'),
            'heVersionTitle':data.get('heVersionTitle'),'heLicense':data.get('heLicense'),'heVersionSource':data.get('heVersionSource'),
            'versions':data.get('versions',[]),
            'rawSefariaMetadata':{k:data.get(k) for k in ('ref','heRef','sectionRef','heSectionRef','sections','toSections','sectionNames','addressTypes','textDepth','next','prev','versionTitle','license','versionSource','heVersionTitle','heLicense','heVersionSource')},
        },
        'alignmentNotes':['The Hebrew-only editorial transition preceding רבי יוחנן משתעי remains in rawSource for 16:1:1 and is intentionally excluded from the displayed bilingual passage.','Only spacing typos eyesresembled and no st rils are corrected for display; raw source strings are retained per passage.'],
        'generatedAt':datetime.now(timezone.utc).isoformat(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Prepared Torah 16: ten Sefaria bilingual leaves plus one restored bilingual Rashbam supplement (11 displayed passages).')

if __name__ == '__main__': main()
