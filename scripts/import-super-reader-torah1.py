#!/usr/bin/env python3
"""Import the aligned Hebrew/English source used by the Torah 1 readers."""
from __future__ import annotations

import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'reader' / 'super' / 'likutay-moharan' / '1' / '1' / 'torah-study.json'
URL = 'https://www.sefaria.org/api/texts/Likutei_Moharan.1.{section}?lang=bi&context=0'
# Crosswalk from Sefaria's sentence-level sections to the classic reader's
# eight editorial passages. This keeps commentary and Pe’er synchronization.
CLASSIC_SEGMENTS = [
    1, 2, 2,
    3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
    4, 4, 4, 4,
    5, 5, 5,
    6, 6, 7, 7, 7, 7, 7, 7, 7,
    8, 8, 8, 8,
]


def plain(value: str) -> str:
    value = re.sub(r'<br\s*/?>', '\n', value, flags=re.I)
    value = re.sub(r'</?(?:i|b)>', '', value, flags=re.I)
    value = re.sub(r'<[^>]+>', '', value)
    return re.sub(r'[ \t\r\f\v]+', ' ', html.unescape(value)).strip()


def without_nikud(value: str) -> str:
    return re.sub(r'[\u0591-\u05C7]', '', value)


def main() -> None:
    existing_generated = None
    if OUT.exists():
        existing_generated = json.loads(OUT.read_text(encoding='utf-8')).get('generatedAt')

    segments = []
    first = None
    for section in range(1, 7):
        response = requests.get(URL.format(section=section), timeout=45)
        response.raise_for_status()
        data = response.json()
        first = first or data
        hebrew = data.get('he', [])
        english = data.get('text', [])
        if len(hebrew) != len(english):
            raise RuntimeError(f'Section {section} alignment mismatch: {len(hebrew)} Hebrew / {len(english)} English')
        for comment, (he_raw, en_raw) in enumerate(zip(hebrew, english), start=1):
            he_nikud = plain(he_raw)
            index = len(segments) + 1
            segments.append({
                'index': index,
                'classicSegment': CLASSIC_SEGMENTS[index - 1],
                'sourceSection': section,
                'sourceComment': comment,
                'sourceRef': f'Likutei Moharan 1:{section}:{comment}',
                'he': without_nikud(he_nikud),
                'he_nikud': he_nikud,
                'en': plain(en_raw),
                'heRawHtml': he_raw,
                'enRawHtml': en_raw,
            })

    if len(segments) != 34 or len(CLASSIC_SEGMENTS) != 34 or not all(item['he'] and item['en'] for item in segments):
        raise RuntimeError('Expected 34 nonempty aligned Torah 1 passages')
    if first is None:
        raise RuntimeError('No Sefaria source response was loaded')

    payload = {
        'schemaVersion': 1,
        'id': 'lm-super-1-1',
        'book': 'likutay-moharan',
        'part': 1,
        'torah': 1,
        'hebrewTitle': 'אשרי תמימי דרך',
        'englishTitle': 'Ashray Temeemay Durech',
        'keyVerseTranslation': 'Happy are those whose way is perfect, who walk in the Torah of Hashem.',
        'themes': ['Torah', 'Grace', 'Prayer', 'Intellect', 'Jacob and Esau'],
        'generatedAt': existing_generated or datetime.now(timezone.utc).isoformat(),
        'provenance': {
            'source': 'Sefaria API',
            'sourceUrls': [URL.format(section=section) for section in range(1, 7)],
            'hebrewVersion': first.get('heVersionTitle'),
            'hebrewLicense': first.get('heLicense'),
            'englishVersion': first.get('versionTitle'),
            'englishLicense': first.get('license'),
            'englishVersionSource': first.get('versionSource'),
            'displayTransformation': 'HTML emphasis tags removed; words and punctuation retained',
            'classicReaderDataChanged': False,
        },
        'segments': segments,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {len(segments)} aligned Torah 1 passages at {OUT}')


if __name__ == '__main__':
    main()
