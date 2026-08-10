#!/usr/bin/env python3
"""Import the licensed aligned Hebrew/English witness used by Torah 4 Super Reader."""
from __future__ import annotations

import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/reader/super/likutay-moharan/1/4/torah-study.json'
CLASSIC = ROOT / 'public/reader/likutay-moharan/part-1/torah-4.json'
URL = 'https://www.sefaria.org/api/texts/Likutei_Moharan.4.{section}?lang=bi&context=0'


def classic_segment(section: int, comment: int) -> int:
    if section == 1:
        return 1 if comment == 1 else 3
    if 2 <= section <= 6:
        return section + 2
    if section == 7:
        return 9 if comment <= 4 else 10
    if section == 8:
        if comment <= 2: return 11
        if comment <= 5: return 12
        if comment <= 7: return 13
        if comment <= 9: return 14
        return 15
    if section == 9:
        return 16 if comment <= 7 else 17
    if section == 10:
        if comment <= 2: return 18
        if comment <= 21: return 21
        return 22
    return 23


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
        'sourceRef': source_ref or f'Likutei Moharan 4:{section}:{comment}',
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
    for section in range(1, 12):
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
                segments.append(passage(len(segments) + 1, section, '1a', 1, classic_by_index[1]['he_nikud'], 'In the language of our Rebbe, his memory for blessing.', 'Likutei Moharan 4:1:1a'))
                segments.append(passage(len(segments) + 1, section, '1b', 2, classic_by_index[2]['he_nikud'], 'I am Hashem your God, who brought you out from the land of Egypt, from the house of slaves (Exodus 20:2).', 'Likutei Moharan 4:1:1b'))
                continue
            segments.append(passage(len(segments) + 1, section, comment, classic_segment(section, comment), he_raw, en_raw))
            if section == 10 and comment == 2:
                segments.append(passage(len(segments) + 1, section, 'Rashbam heading', 19, classic_by_index[19]['he'], 'Rashbam:', 'Rashbam on Bava Batra 73b'))
                rashbam_en = ('Kavra—a fish. Akhla tina—a small creeping creature. B’usay—the creature entered the fish’s nostrils. '
                    'V’idchuhu maya—the water washed it up and cast it onto dry land, as is the way of the sea, which does not tolerate a dead thing. '
                    'Charvu minei shittin mechozei—the water cast it upon sixty cities and destroyed them all, so large was it. '
                    'V’akhalu minei shittin mechozei—sixty cities ate from it while it was fresh. U’malchu minei shittin mechozei—sixty other, distant cities salted flesh from it and carried it home. '
                    'Mechad galgala d’eina—from its eyeball they took three hundred jugs of oil. Havu m’nasrei—they sawed beams from the fish’s bones to rebuild the cities it had destroyed.')
                segments.append(passage(len(segments) + 1, section, 'Rashbam gloss', 20, classic_by_index[20].get('he_nikud', classic_by_index[20]['he']), rashbam_en, 'Rashbam on Bava Batra 73b'))

    if len(segments) != 81 or not all(item['he'] and item['en'] for item in segments):
        raise RuntimeError(f'Expected 81 nonempty aligned Torah 4 passages, found {len(segments)}')
    if first is None:
        raise RuntimeError('No Sefaria source response was loaded')
    payload = {
        'schemaVersion': 1, 'id': 'lm-super-1-4', 'book': 'likutay-moharan', 'part': 1, 'torah': 4,
        'hebrewTitle': "אנכי ה׳ אלהיך", 'englishTitle': 'Anokhi Hashem Elokeikha',
        'keyVerseTranslation': 'I am Hashem your God, who brought you out from the land of Egypt, from the house of slaves.',
        'themes': ['Everything is for the good', 'Holy kingship', 'Confession', 'The tzaddik', 'Humility', 'Infinite light'],
        'generatedAt': existing_generated or datetime.now(timezone.utc).isoformat(),
        'provenance': {
            'source': 'Sefaria API plus the classic edition’s Rashbam gloss',
            'sourceUrls': [URL.format(section=section) for section in range(1, 12)],
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
    print(f'Prepared {len(segments)} aligned Torah 4 passages at {OUT}')


if __name__ == '__main__':
    main()
