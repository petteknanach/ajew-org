#!/usr/bin/env python3
"""Import the licensed aligned Hebrew/English witness used by Torah 7 Super Reader."""
from __future__ import annotations
import html, json, re
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/reader/super/likutay-moharan/1/7/torah-study.json'
CLASSIC = ROOT / 'public/reader/likutay-moharan/part-1/torah-7.json'
URL = 'https://www.sefaria.org/api/texts/Likutei_Moharan.7.{section}?lang=bi&context=0'

def classic_segment(section: int, comment: int) -> int:
    if section == 1:
        if comment == 1: return 2
        if comment == 2: return 3
        return 4
    if section == 2: return 5
    if section == 3: return 6
    if section == 4: return 7
    if section == 5: return 8 if comment <= 2 else 10
    if section == 6: return 11
    if section == 7: return 12 if comment <= 10 else 13
    return 14

def plain(value: str) -> str:
    value = re.sub(r'<br\s*/?>', '\n', value, flags=re.I)
    value = re.sub(r'</?(?:i|b)>', '', value, flags=re.I)
    value = re.sub(r'<[^>]+>', '', value)
    return re.sub(r'[ \t\r\f\v]+', ' ', html.unescape(value)).strip()

def without_nikud(value: str) -> str:
    return re.sub(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]', '', value)

def passage(index: int, section: int, comment, classic: int, he_raw: str, en_raw: str, source_ref: str | None = None) -> dict:
    he_nikud = plain(he_raw)
    return {'index': index, 'classicSegment': classic, 'source': 'Sefaria API', 'sourceSection': section,
        'sourceComment': comment, 'sourceRef': source_ref or f'Likutei Moharan 7:{section}:{comment}',
        'he': without_nikud(he_nikud), 'he_nikud': he_nikud, 'en': plain(en_raw),
        'heRawHtml': he_raw, 'enRawHtml': en_raw}

def main() -> None:
    existing_generated = json.loads(OUT.read_text(encoding='utf-8')).get('generatedAt') if OUT.exists() else None
    classic = json.loads(CLASSIC.read_text(encoding='utf-8'))
    classic_by_index = {int(item['index']): item for item in classic['segments']}
    segments, first = [], None
    for section in range(1, 9):
        response = requests.get(URL.format(section=section), timeout=45); response.raise_for_status()
        data = response.json(); first = first or data
        hebrew, english = data.get('he', []), data.get('text', [])
        if len(hebrew) != len(english) or not hebrew: raise RuntimeError(f'Section {section} alignment mismatch')
        for comment, (he_raw, en_raw) in enumerate(zip(hebrew, english), start=1):
            if section == 1 and comment == 1:
                segments.append(passage(len(segments)+1, section, '1a', 1, 'לשון רבנו, זכרונו לברכה', 'In the language of our Rebbe, of blessed memory.', 'Likutei Moharan 7:1:1a'))
                segments.append(passage(len(segments)+1, section, '1b', 2, classic_by_index[2]['he'], en_raw, 'Likutei Moharan 7:1:1b'))
                continue
            if section == 8 and comment == 1:
                he_pre, he_post = he_raw.split('וְזֶהוּ:', 1)
                en_pre, en_post = en_raw.split('This is:', 1)
                segments.append(passage(len(segments)+1, section, '1a', 14, he_pre, en_pre, 'Likutei Moharan 7:8:1a'))
                pri_he = 'ז"ל הפע"ח: ט"ל כריכות הם קנ"ו כמנין יוסף. וסמ"ך גודלין יש בכל הכנפות עם הציצית כמנין הנה, וכמנין בנך חוליות וקשרים. והחוטין הם ל"ב והם שזורין הרי ס"ד כמנין בא אליך. ע"כ.'
                pri_en = 'The Pri Etz Chaim states: The thirty-nine windings equal 156, the numerical value of Yosef. There are sixty thumbbreadths in all the corners together with the tzitzit, equal to the numerical value of hineh; the loops and knots equal the numerical value of binkha. The threads number thirty-two, and because they are twisted they total sixty-four, the numerical value of ba eilekha. End quote.'
                segments.append(passage(len(segments)+1, section, 'Pri Etz Chaim gloss', 14, pri_he, pri_en, 'Pri Etz Chaim, Shaar HaTzitzit 4, gloss'))
                segments.append(passage(len(segments)+1, section, '1c', 14, 'וְזֶהוּ:' + he_post, 'This is:' + en_post, 'Likutei Moharan 7:8:1c'))
                continue
            segments.append(passage(len(segments)+1, section, comment, classic_segment(section, comment), he_raw, en_raw))
            if section == 5 and comment == 2:
                rashbam_en = 'Rashbam: “That I swore”—concerning the exile, as many verses in the Prophets state.'
                segments.append(passage(len(segments)+1, section, 'Rashbam gloss', 9, classic_by_index[9]['he'], rashbam_en, 'Rashbam on Bava Batra 74a'))
    if len(segments) != 54 or not all(item['he'] and item['en'] for item in segments):
        raise RuntimeError(f'Expected 54 nonempty aligned Torah 7 passages, found {len(segments)}')
    if first is None:
        raise RuntimeError('No Sefaria metadata returned')
    payload = {'schemaVersion': 1, 'id': 'lm-super-1-7', 'book': 'likutay-moharan', 'part': 1, 'torah': 7,
        'hebrewTitle': 'ואלה המשפטים אשר תשים לפניהם', 'englishTitle': 'VeEleh HaMishpatim',
        'keyVerseTranslation': 'And these are the laws that you must place before them.',
        'themes': ['Faith', 'Truth', 'The tzaddik’s counsel', 'Tzitzit', 'Prayer', 'Miracles'],
        'generatedAt': existing_generated or datetime.now(timezone.utc).isoformat(),
        'provenance': {'source': 'Sefaria API plus the classic edition’s Rashbam gloss',
            'sourceUrls': [URL.format(section=s) for s in range(1,9)],
            'hebrewVersion': first.get('heVersionTitle'), 'hebrewLicense': first.get('heLicense'),
            'englishVersion': first.get('versionTitle'), 'englishLicense': first.get('license'),
            'englishVersionSource': first.get('versionSource'),
            'displayTransformation': 'HTML emphasis tags removed; words and punctuation retained; combined opening split for alignment; omitted classic Rashbam and Pri Etz Chaim glosses restored in canonical order as bilingual passages',
            'classicReaderDataChanged': False}, 'segments': segments}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(f'Prepared {len(segments)} aligned Torah 7 passages at {OUT}')

if __name__ == '__main__': main()
