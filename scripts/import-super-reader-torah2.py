#!/usr/bin/env python3
"""Import the aligned Hebrew/English source used by the Torah 2 Super Reader.

The classic reader's canonical JSON is not modified. The supplementary route keeps
Sefaria's raw HTML witness alongside a plain-text display form and records version
and license provenance.
"""
from __future__ import annotations

import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'reader' / 'super' / 'likutay-moharan' / '1' / '2' / 'torah-study.json'
URL = 'https://www.sefaria.org/api/texts/Likutei_Moharan.2.{section}?lang=bi&context=0'
CLASSIC_SEGMENTS = [
    1, 2, 3, 4, 5, 5, 8, 9, 9,
    11, 11, 11, 11, 11,
    12, 12, 12,
    13, 13,
    14, 14, 15, 15,
    16, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18,
    19, 19, 19, 19, 19, 19, 19,
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
    for section in range(1, 10):
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
                'sourceRef': f'Likutei Moharan 2:{section}:{comment}',
                'he': without_nikud(he_nikud),
                'he_nikud': he_nikud,
                'en': plain(en_raw),
                'heRawHtml': he_raw,
                'enRawHtml': en_raw,
            })

    if len(segments) != 45 or not all(item['he'] and item['en'] for item in segments):
        raise RuntimeError('Expected 45 nonempty aligned Torah 2 segments')
    if first is None:
        raise RuntimeError('No Sefaria source response was loaded')

    payload = {
        'schemaVersion': 1,
        'id': 'lm-super-1-2',
        'book': 'likutay-moharan',
        'part': 1,
        'torah': 2,
        'hebrewTitle': 'אמור אל הכהנים',
        'englishTitle': 'Emor El HaKohanim',
        'keyVerseTranslation': 'Speak to the priests, the sons of Aharon, and say to them: None shall defile himself for a dead person among his people.',
        'themes': ['Prayer', 'Mashiach', 'Guarding the covenant', 'Judgment', 'Charity', 'The Tzaddik'],
        'generatedAt': existing_generated or datetime.now(timezone.utc).isoformat(),
        'provenance': {
            'source': 'Sefaria API',
            'sourceUrls': [URL.format(section=section) for section in range(1, 10)],
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
    print(f'Prepared {len(segments)} aligned Torah 2 segments at {OUT}')


if __name__ == '__main__':
    main()
