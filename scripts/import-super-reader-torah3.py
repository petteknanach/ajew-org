#!/usr/bin/env python3
"""Import the licensed aligned Hebrew/English witness used by Torah 3 readers."""
from __future__ import annotations

import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'reader' / 'super' / 'likutay-moharan' / '1' / '3' / 'torah-study.json'
CLASSIC = ROOT / 'public' / 'reader' / 'likutay-moharan' / 'part-1' / 'torah-3.json'
URL = 'https://www.sefaria.org/api/texts/Likutei_Moharan.3.{section}?lang=bi&context=0'
# Sefaria's 33 bilingual passages crosswalked to the classic reader's twelve
# editorial segments. The classic edition also prints Rashbam's short gloss
# after the opening quotation; it is preserved as one additional aligned
# passage below. Sefaria passage 3:5 bridges classic segments 6–7 and is
# assigned to 7, where most of its interpretive text belongs.
SOURCE_CLASSIC_SEGMENTS = [
    1, 4, 4, 4, 4, 4, 4, 4, 4,
    5, 5,
    6, 6, 6, 6, 7, 7, 7, 7, 7,
    8, 8, 8, 8, 8,
    9, 9, 9, 10,
    10,
    11,
    12, 12,
]
CLASSIC_SEGMENT_WINDOWS = {(3, 5): [6, 7]}
RASHBAM_EN = (
    'Rashbam: Akrukta—a frog. Ke-akra de-Hagronya—it was as large as that city. '
    '“And how large was the city of Hagronya?”—the Talmud asks this. '
    '“A tannina came”—Rabbah says this. Pushkantza—a female raven.'
)


def plain(value: str) -> str:
    value = re.sub(r'<br\s*/?>', '\n', value, flags=re.I)
    value = re.sub(r'</?(?:i|b)>', '', value, flags=re.I)
    value = re.sub(r'<[^>]+>', '', value)
    return re.sub(r'[ \t\r\f\v]+', ' ', html.unescape(value)).strip()


def without_nikud(value: str) -> str:
    # Remove cantillation and vowel combining marks while preserving Hebrew
    # punctuation such as maqaf (־), geresh, gershayim, and sof pasuq.
    return re.sub(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]', '', value)


def main() -> None:
    existing_generated = None
    if OUT.exists():
        existing_generated = json.loads(OUT.read_text(encoding='utf-8')).get('generatedAt')

    classic_data = json.loads(CLASSIC.read_text(encoding='utf-8'))
    classic_by_index = {int(item['index']): item for item in classic_data['segments']}
    segments = []
    source_index = 0
    first = None
    for section in range(1, 9):
        response = requests.get(URL.format(section=section), timeout=45)
        response.raise_for_status()
        data = response.json()
        first = first or data
        hebrew = data.get('he', [])
        english = data.get('text', [])
        if len(hebrew) != len(english):
            raise RuntimeError(f'Section {section} alignment mismatch: {len(hebrew)} Hebrew / {len(english)} English')
        for comment, (he_raw, en_raw) in enumerate(zip(hebrew, english), start=1):
            index = len(segments) + 1
            he_nikud = plain(he_raw)
            item = {
                'index': index,
                'classicSegment': SOURCE_CLASSIC_SEGMENTS[source_index],
                'source': 'Sefaria API',
                'sourceSection': section,
                'sourceComment': comment,
                'sourceRef': f'Likutei Moharan 3:{section}:{comment}',
                'he': without_nikud(he_nikud),
                'he_nikud': he_nikud,
                'en': plain(en_raw),
                'heRawHtml': he_raw,
                'enRawHtml': en_raw,
            }
            if (section, comment) in CLASSIC_SEGMENT_WINDOWS:
                item['classicSegments'] = CLASSIC_SEGMENT_WINDOWS[(section, comment)]
            segments.append(item)
            source_index += 1

            if section == 1 and comment == 1:
                rashbam_he = f"{classic_by_index[2]['he']}\n{classic_by_index[3]['he']}"
                rashbam_nikud = f"רַשְׁבַּ\"ם\n{classic_by_index[3].get('he_nikud', classic_by_index[3]['he'])}"
                segments.append({
                    'index': len(segments) + 1,
                    'classicSegment': 3,
                    'classicSegments': [2, 3],
                    'source': 'Classic reader / Rashbam gloss',
                    'sourceSection': 1,
                    'sourceComment': 'Rashbam gloss',
                    'sourceRef': 'Rashbam on Bava Batra 73b; classic reader segments 2–3',
                    'he': rashbam_he,
                    'he_nikud': rashbam_nikud,
                    'en': RASHBAM_EN,
                    'heRawHtml': rashbam_he,
                    'enRawHtml': RASHBAM_EN,
                })

    if len(segments) != 34 or len(SOURCE_CLASSIC_SEGMENTS) != 33 or not all(item['he'] and item['en'] for item in segments):
        raise RuntimeError('Expected 34 nonempty aligned Torah 3 passages')
    if first is None:
        raise RuntimeError('No Sefaria source response was loaded')

    payload = {
        'schemaVersion': 1,
        'id': 'lm-super-1-3',
        'book': 'likutay-moharan',
        'part': 1,
        'torah': 3,
        'hebrewTitle': 'אקרוקתא',
        'englishTitle': 'Akrukta — The Frog',
        'keyVerseTranslation': 'Rabba bar bar Chana said: I saw a frog as large as the city of Hagronya.',
        'themes': ['Holy melody', 'Oral Torah at night', 'Kingship', 'Prophecy', 'Judging favorably', 'Kindness'],
        'generatedAt': existing_generated or datetime.now(timezone.utc).isoformat(),
        'provenance': {
            'source': 'Sefaria API plus the classic edition’s Rashbam gloss',
            'sourceUrls': [URL.format(section=section) for section in range(1, 9)],
            'hebrewVersion': first.get('heVersionTitle'),
            'hebrewLicense': first.get('heLicense'),
            'englishVersion': first.get('versionTitle'),
            'englishLicense': first.get('license'),
            'englishVersionSource': first.get('versionSource'),
            'displayTransformation': 'HTML emphasis tags removed; words and punctuation retained; the classic Rashbam gloss is preserved as its own aligned passage',
            'classicReaderDataChanged': False,
        },
        'segments': segments,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {len(segments)} aligned Torah 3 passages at {OUT}')


if __name__ == '__main__':
    main()
