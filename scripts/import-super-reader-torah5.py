#!/usr/bin/env python3
"""Import the licensed aligned Hebrew/English witness used by Torah 5 Super Reader."""
from __future__ import annotations

import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/reader/super/likutay-moharan/1/5/torah-study.json'
CLASSIC = ROOT / 'public/reader/likutay-moharan/part-1/torah-5.json'
URL = 'https://www.sefaria.org/api/texts/Likutei_Moharan.5.{section}?lang=bi&context=0'


def classic_segment(section: int, comment: int) -> int:
    if section == 1: return 1 if comment == 1 else 2
    if 2 <= section <= 5: return section + 1
    if section == 6: return 7 if comment <= 2 else 10
    return 11


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
        'sourceRef': source_ref or f'Likutei Moharan 5:{section}:{comment}',
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
    for section in range(1, 8):
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
                segments.append(passage(len(segments) + 1, section, '1a', 1, 'לשון רבנו, זכרונו לברכה]', 'In the language of our Rebbe, his memory for blessing.', 'Likutei Moharan 5:1:1a'))
                segments.append(passage(len(segments) + 1, section, '1b', 1, classic_by_index[1]['he_nikud'], 'With trumpets and the sound of the shofar, shout before the King, Hashem (Psalms 98:6).', 'Likutei Moharan 5:1:1b'))
                continue
            segments.append(passage(len(segments) + 1, section, comment, classic_segment(section, comment), he_raw, en_raw))
            if section == 6 and comment == 2:
                segments.append(passage(len(segments) + 1, section, 'Rashbam heading', 8, classic_by_index[8]['he'], 'Rashbam:', 'Rashbam on Bava Batra 73b'))
                rashbam_en = ('Shitza—a fin. Between one shitza and the other—the fins on the fish’s back, one toward the head and one toward the tail. '
                    'It was swimming upwind—against the wind. We were sailing downwind—with the wind. The ship therefore traveled faster than the fish. '
                    'In the time it takes to heat a kettle of water—the fish covered sixty parasangs. And a horseman shot an arrow—the ship preceded the arrow.')
                segments.append(passage(len(segments) + 1, section, 'Rashbam gloss', 9, classic_by_index[9].get('he_nikud', classic_by_index[9]['he']), rashbam_en, 'Rashbam on Bava Batra 73b'))

    if len(segments) != 71 or not all(item['he'] and item['en'] for item in segments):
        raise RuntimeError(f'Expected 71 nonempty aligned Torah 5 passages, found {len(segments)}')
    if first is None:
        raise RuntimeError('No Sefaria source response was loaded')
    payload = {
        'schemaVersion': 1, 'id': 'lm-super-1-5', 'book': 'likutay-moharan', 'part': 1, 'torah': 5,
        'hebrewTitle': 'בחצוצרות וקול שופר', 'englishTitle': 'BeChatzotzrot VeKol Shofar',
        'keyVerseTranslation': 'With trumpets and the sound of the shofar, shout before the King, Hashem.',
        'themes': ['Repairing the world', 'Prayer after judgment', 'Joy in the mitzvah', 'Thunder and the heart', 'Holy fear', 'The tzaddik’s prayer'],
        'generatedAt': existing_generated or datetime.now(timezone.utc).isoformat(),
        'provenance': {
            'source': 'Sefaria API plus the classic edition’s Rashbam gloss',
            'sourceUrls': [URL.format(section=section) for section in range(1, 8)],
            'hebrewVersion': first.get('heVersionTitle'), 'hebrewLicense': first.get('heLicense'),
            'englishVersion': first.get('versionTitle'), 'englishLicense': first.get('license'),
            'englishVersionSource': first.get('versionSource'),
            'displayTransformation': 'HTML emphasis tags removed; words and punctuation retained; combined opening split for alignment; classic Rashbam gloss preserved in bilingual passages',
            'classicReaderDataChanged': False,
        },
        'segments': segments,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {len(segments)} aligned Torah 5 passages at {OUT}')


if __name__ == '__main__':
    main()
