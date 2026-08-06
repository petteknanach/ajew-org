#!/usr/bin/env python3
"""Import Torah 12's 59 licensed Sefaria passages plus the Hebrew-only Classic Rashbam gloss."""
from __future__ import annotations
import html, json, re
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/reader/super/likutay-moharan/1/12/torah-study.json'
CLASSIC = ROOT / 'public/reader/likutay-moharan/part-1/torah-12.json'
MARKS = re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
SECTION_COUNTS = [13, 3, 10, 12, 15, 6]
# Exact canonical crosswalk from the Torah 12 audit. Sefaria 12:1:1 combines
# the introductory heading (Classic 1) and opening verse (Classic 2).
CLASSIC_MAP = (
    [1] + [3] * 3 + [4] * 6 + [5] * 3 +
    [6] * 3 + [7] * 10 + [8] * 12 +
    [9] + [11] * 14 + [12] * 6
)


def plain(value: str) -> str:
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', value or ''))).strip()


def main() -> None:
    classic = json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00', ''))
    aligned = classic.get('aligned_segments') or []
    if len(classic.get('segments', [])) != 12 or len(aligned) != 94:
        raise RuntimeError('Torah 12 Classic constants must be 12 coarse / 94 aligned')
    passages, versions = [], []
    for section, count in enumerate(SECTION_COUNTS, 1):
        response = requests.get(
            f'https://www.sefaria.org/api/texts/Likutei_Moharan.12.{section}?lang=bi&context=0',
            timeout=45,
        )
        response.raise_for_status()
        data = response.json()
        hebrew, english = list(data.get('he') or []), list(data.get('text') or [])
        if len(hebrew) != count or len(english) != count:
            raise RuntimeError(f'Section {section}: expected {count}, got HE {len(hebrew)}, EN {len(english)}')
        if not versions:
            versions = data.get('versions', [])
        for comment, (he, en) in enumerate(zip(hebrew, english), 1):
            source_index = sum(bool(item.get('en')) for item in passages) + 1
            index = len(passages) + 1
            he_nikud, en_text = plain(he), plain(en)
            if not he_nikud or not en_text:
                raise RuntimeError(f'Empty Sefaria passage 12:{section}:{comment}')
            classic_segment = CLASSIC_MAP[source_index - 1]
            record = {
                'index': index,
                'sourceSection': section,
                'sourceComment': comment,
                'sourceRef': f'Likutei Moharan 12:{section}:{comment}',
                'classicSegment': classic_segment,
                'provenance': 'Sefaria bilingual witness',
                'he': MARKS.sub('', he_nikud),
                'he_nikud': he_nikud,
                'en': en_text,
            }
            if section == 1 and comment == 1:
                record['classicSegments'] = [1, 2]
            passages.append(record)
        if section == 5:
            # Classic aligned 58–72 is the complete Rashbam restoration. Its
            # English is shifted, so only the Hebrew witness is admitted.
            gloss_parts = [str(item.get('he') or '').strip() for item in aligned[57:72]]
            if len(gloss_parts) != 15 or any(not part for part in gloss_parts):
                raise RuntimeError('Classic Rashbam restoration 58–72 is incomplete')
            # Insert after 12:5:1, not at the end of section 5.
            gloss = {
                'index': 0,
                'sourceSection': 5,
                'sourceComment': '1a',
                'sourceRef': 'Rashbam gloss preserved in the Classic witness; absent from Sefaria Hebrew.',
                'classicSegment': 10,
                'classicAlignedRange': [58, 72],
                'provenance': 'Classic Hebrew-only Rashbam restoration; no safe English witness',
                'he': '\n'.join(gloss_parts),
                'he_nikud': '\n'.join(gloss_parts),
                'en': '',
                'hebrewOnly': True,
                'displayLabel': 'Classic Rashbam restoration (Hebrew only)',
            }
            # The first four sections contain 38 passages; 5:1 is position 39.
            passages.insert(39, gloss)
    for index, passage in enumerate(passages, 1):
        passage['index'] = index
    if len(passages) != 60 or sum(bool(p.get('en')) for p in passages) != 59:
        raise RuntimeError('Expected 60 total passages: 59 bilingual plus one Hebrew-only gloss')
    payload = {
        'id': 'super-lm-1-12-study', 'book': 'likutay-moharan', 'part': 1,
        'torah': 12, 'displayNumber': '12', 'title': classic['title'],
        'hebrewTitle': classic['hebrewTitle'], 'keyVerse': classic['keyVerse'],
        'keyVerseTranslation': classic.get('keyVerseTranslation') or 'A praise of David: I will exalt You, my God the King, and bless Your name forever and ever.',
        'keyVerseRef': classic['keyVerseRef'], 'themes': classic.get('themes', []),
        'segments': passages, 'totalPassages': 60, 'sefariaSections': 6,
        'sefariaPassages': 59, 'classicSegments': 12, 'classicAligned': 94,
        'classicSupplementRange': [58, 72], 'hasEnglish': True, 'hasNikud': True,
        'license': {
            'he': 'Public Domain (rabenubook.com edition via Sefaria); Classic Hebrew restoration from repository witness',
            'en': 'CC BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)',
            'notes': [
                'All 59 Sefaria passages preserve the licensed bilingual wording.',
                'The passage after 12:5:1 is the complete Classic aligned 58–72 Rashbam gloss, clearly labeled Hebrew-only because Classic English is shifted and unsafe.',
            ],
        },
        'source': {'sefariaRef': 'Likutei Moharan 12', 'classicFile': str(CLASSIC.relative_to(ROOT)), 'versions': versions},
        'generatedAt': datetime.now(timezone.utc).isoformat(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Prepared Torah 12: 59 Sefaria bilingual passages + one labeled Hebrew-only Classic Rashbam restoration (aligned 58–72).')


if __name__ == '__main__':
    main()
