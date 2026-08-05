#!/usr/bin/env python3
"""Import the licensed aligned Hebrew/English witness used by Torah 9 Super Reader."""
from __future__ import annotations
import html, json, re
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/reader/super/likutay-moharan/1/9/torah-study.json'
CLASSIC = ROOT / 'public/reader/likutay-moharan/part-1/torah-9.json'
MARKS = re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')

def plain(value: str) -> str:
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', value or ''))).strip()

def strip_nikud(value: str) -> str:
    return MARKS.sub('', value)

def classic_segment(section: int, comment: int) -> int:
    if section == 2: return 6
    if section == 3: return 7
    if section == 4:
        if comment <= 2: return 8
        if comment <= 5: return 9
        return 11
    if section in {5, 6}: return 12
    raise ValueError((section, comment))

def passage(index: int, section: int, comment: int | str, classic: int, he_nikud: str, en: str, source_ref: str | None = None) -> dict:
    return {'index': index, 'sourceSection': section, 'sourceComment': comment,
            'sourceRef': source_ref or f'Likutei Moharan 9:{section}:{comment}',
            'classicSegment': classic, 'he': strip_nikud(plain(he_nikud)),
            'he_nikud': plain(he_nikud), 'en': plain(en)}

def split_prefix(value: str, prefix: str) -> str:
    value = plain(value)
    if not value.startswith(prefix): raise RuntimeError(f'Expected prefix {prefix!r}: {value[:80]!r}')
    return value[len(prefix):].strip()

def main() -> None:
    classic = json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00', ''))
    classic_by = {int(x['index']): x for x in classic['segments']}
    segments, versions = [], None
    for section in range(1, 7):
        response = requests.get(f'https://www.sefaria.org/api/texts/Likutei_Moharan.9.{section}?lang=bi&context=0', timeout=45)
        response.raise_for_status(); data = response.json()
        if versions is None: versions = data.get('versions', [])
        he_items = data.get('he') or []
        en_items = data.get('text') or []
        english_recap = ''
        if section == 6:
            if len(en_items) != 5:
                raise RuntimeError(f'Unexpected Torah 9 section 6 English count: {len(en_items)}')
            english_recap = plain(en_items[1])
            en_items = [en_items[0], en_items[2], en_items[3],
                'Metzolot (depths) corresponds to Egypt, as it is said: “They despoiled Egypt” (Exodus 12:36).', en_items[4]]
        for comment, (he_raw, en_raw) in enumerate(zip(he_items, en_items), start=1):
            if section == 1 and comment == 1:
                he = plain(he_raw); marker = 'תְּהֹמֹת'
                if marker not in he: raise RuntimeError('Could not split Torah 9 attribution')
                attribution, verse = he.split(marker, 1)
                segments.append(passage(len(segments)+1, section, '1a attribution', 1, attribution, 'In the words of Rebbe Nachman, of blessed memory.', 'Printed attribution; editorial English translation'))
                segments.append(passage(len(segments)+1, section, '1b opening verse', 2, marker + verse, en_raw, 'Likutei Moharan 9:1:1 opening verse'))
                continue
            if section == 1 and comment == 2:
                segments.append(passage(len(segments)+1, section, '2a section heading', 3, 'א', 'Section 1.', 'Printed section heading; editorial English navigation label'))
                segments.append(passage(len(segments)+1, section, '2b discourse', 4, split_prefix(he_raw, 'א '), en_raw, 'Likutei Moharan 9:1:2 discourse'))
                continue
            if section == 2 and comment == 1:
                segments.append(passage(len(segments)+1, section, '1a section heading', 5, 'ב', 'Section 2.', 'Printed section heading; editorial English navigation label'))
                segments.append(passage(len(segments)+1, section, '1b discourse', 6, split_prefix(he_raw, 'ב '), re.sub(r'^\s*2\.\s*', '', plain(en_raw)), 'Likutei Moharan 9:2:1 discourse'))
                continue
            segments.append(passage(len(segments)+1, section, comment, classic_segment(section, comment), he_raw, en_raw))
            if section == 6 and comment == 1:
                segments[-1]['englishSourceAside'] = english_recap
            if section == 6 and comment == 4:
                segments[-1]['sourceRef'] = 'Likutei Moharan 9:6:4; editorial English restoration (API witness omits standalone mate)'
            if section == 4 and comment == 5:
                segments.append(passage(len(segments)+1, section, 'Rashbam gloss', 10, classic_by[10]['he'], 'Rashbam: Tayya—an Ishmaelite merchant. “And we switched”—this earth with that earth, to test whether he was truly so expert.', 'Rashbam on Bava Batra 73b; editorial English restoration'))
    if len(segments) != 63 or not all(x['he'] and x['en'] for x in segments):
        raise RuntimeError(f'Expected 63 fully bilingual passages, found {len(segments)}')
    payload = {'id':'super-lm-1-9-study','book':'likutay-moharan','part':1,'torah':9,'displayNumber':'9',
        'title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic['keyVerse'],
        'keyVerseTranslation':classic['keyVerseTranslation'],'keyVerseRef':classic['keyVerseRef'],
        'themes':classic.get('themes',[]),'segments':segments,'totalPassages':len(segments),'hasEnglish':True,'hasNikud':True,
        'license':{'he':'Public Domain (rabenubook.com edition via Sefaria)','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)','editorialRestorations':['Attribution and section-heading English labels','Rashbam gloss English translation','Likutei Moharan 9:6:4 English translation omitted by API witness']},
        'source':{'sefariaRef':'Likutei Moharan 9','classicFile':str(CLASSIC.relative_to(ROOT)),'versions':versions},
        'generatedAt':datetime.now(timezone.utc).isoformat()}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Prepared {len(segments)} aligned Torah 9 passages.')
if __name__ == '__main__': main()
