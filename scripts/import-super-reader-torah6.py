#!/usr/bin/env python3
"""Import the licensed aligned Hebrew/English witness used by Torah 6 Super Reader."""
from __future__ import annotations

import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/reader/super/likutay-moharan/1/6/torah-study.json'
CLASSIC = ROOT / 'public/reader/likutay-moharan/part-1/torah-6.json'
URL = 'https://www.sefaria.org/api/texts/Likutei_Moharan.6.{section}?lang=bi&context=0'


def classic_segment(section: int, comment: int) -> int:
    if section == 1: return 1 if comment == 1 else 2
    if section == 2:
        if comment <= 4: return 3
        if comment == 5: return 4
        return 5
    if section == 3: return 6
    if section == 4: return 7
    if section == 5: return 8
    if section == 6:
        if comment <= 2: return 9
        if comment <= 6: return 11
        return 13
    if section == 7: return 14 if comment <= 5 else 15
    if section == 8: return 16
    if 9 <= section <= 13: return 17
    if section == 14: return 18
    return 19


def plain(value: str) -> str:
    value = re.sub(r'<br\s*/?>', '\n', value, flags=re.I)
    value = re.sub(r'</?(?:i|b)>', '', value, flags=re.I)
    value = re.sub(r'<[^>]+>', '', value)
    return re.sub(r'[ \t\r\f\v]+', ' ', html.unescape(value)).strip()


def without_nikud(value: str) -> str:
    return re.sub(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]', '', value)


def passage(index: int, section: int, comment, classic: int, he_raw: str, en_raw: str, source_ref: str | None = None) -> dict:
    he_nikud = plain(he_raw)
    return {
        'index': index,
        'classicSegment': classic,
        'source': 'Sefaria API',
        'sourceSection': section,
        'sourceComment': comment,
        'sourceRef': source_ref or f'Likutei Moharan 6:{section}:{comment}',
        'he': without_nikud(he_nikud),
        'he_nikud': he_nikud,
        'en': plain(en_raw),
        'heRawHtml': he_raw,
        'enRawHtml': en_raw,
    }


def main() -> None:
    existing_generated = json.loads(OUT.read_text(encoding='utf-8')).get('generatedAt') if OUT.exists() else None
    classic = json.loads(CLASSIC.read_text(encoding='utf-8'))
    classic_by_index = {int(item['index']): item for item in classic['segments']}
    segments: list[dict] = []
    first = None
    for section in range(1, 16):
        response = requests.get(URL.format(section=section), timeout=45)
        response.raise_for_status()
        data = response.json()
        first = first or data
        hebrew, english = data.get('he', []), data.get('text', [])
        if len(hebrew) != len(english) or not hebrew:
            raise RuntimeError(f'Section {section} alignment mismatch')
        for comment, (he_raw, en_raw) in enumerate(zip(hebrew, english), start=1):
            if section == 1 and comment == 1:
                # Sefaria combines Reb Nosson's marker and the opening verse.
                segments.append(passage(len(segments) + 1, section, '1a', 1, 'לשון רבנו, זכרונו לברכה]', 'In the language of our Rebbe, his memory for blessing.', 'Likutei Moharan 6:1:1a'))
                segments.append(passage(len(segments) + 1, section, '1b', 1, classic_by_index[1]['he_nikud'], "Then God said to Moshe: 'Call Yehoshua' (Deuteronomy 31:14).", 'Likutei Moharan 6:1:1b'))
                continue
            segments.append(passage(len(segments) + 1, section, comment, classic_segment(section, comment), he_raw, en_raw))
            if section == 6 and comment == 2:
                rashbam_en = ('Rashbam: “Their wings had fallen off”—their feathers had fallen out from their great fatness. '
                    '“One lifted a wing toward me”—it raised a wing for me, hinting: this is your portion in the World to Come. '
                    '“They will be held accountable for them”—because their sins delay Mashiach, causing those geese the suffering of living creatures on account of their fatness.')
                segments.append(passage(len(segments) + 1, section, 'Rashbam gloss', 10, classic_by_index[10].get('he_nikud', classic_by_index[10]['he']), rashbam_en, 'Rashbam on Bava Batra 73b'))
            if section == 6 and comment == 6:
                note_en = ('For through silence one merits repentance, which is the aspect of Keter, as explained above. This is “Silence is a fence for wisdom.” '
                    'Specifically a fence is the aspect of Keter: a boundary that surrounds, crowns, and adorns wisdom. This Keter, the aspect of a fence, is formed through silence. Thus, “Silence is a fence for wisdom.”')
                segments.append(passage(len(segments) + 1, section, 'classic note', 12, classic_by_index[12].get('he_nikud', classic_by_index[12]['he']), note_en, 'Classic Likutay Moharan 6:12 note'))

    if len(segments) != 93 or not all(item['he'] and item['en'] for item in segments):
        raise RuntimeError(f'Expected 93 nonempty aligned Torah 6 passages, found {len(segments)}')
    if first is None:
        raise RuntimeError('No Sefaria source response was loaded')
    payload = {
        'schemaVersion': 1, 'id': 'lm-super-1-6', 'book': 'likutay-moharan', 'part': 1, 'torah': 6,
        'hebrewTitle': 'קרא את יהושע', 'englishTitle': 'Kra Et Yehoshua',
        'keyVerseTranslation': "Then God said to Moshe: 'Call Yehoshua.'",
        'themes': ['Repentance', 'Silence under insult', 'Divine honor', 'Bekiut in ascent and descent', 'Elul', 'The form of Aleph'],
        'generatedAt': existing_generated or datetime.now(timezone.utc).isoformat(),
        'provenance': {
            'source': 'Sefaria API plus the classic edition’s Rashbam gloss',
            'sourceUrls': [URL.format(section=section) for section in range(1, 16)],
            'hebrewVersion': first.get('heVersionTitle'), 'hebrewLicense': first.get('heLicense'),
            'englishVersion': first.get('versionTitle'), 'englishLicense': first.get('license'),
            'englishVersionSource': first.get('versionSource'),
            'displayTransformation': 'HTML emphasis tags removed; words and punctuation retained; combined opening split for alignment; omitted classic Rashbam gloss and silence note restored as bilingual passages',
            'classicReaderDataChanged': False,
        },
        'segments': segments,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {len(segments)} aligned Torah 6 passages at {OUT}')


if __name__ == '__main__':
    main()
