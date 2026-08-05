#!/usr/bin/env python3
"""Validate Torah 3 aligned text, classic crosswalk, and phrase anchors."""
from __future__ import annotations

import json
import re
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
STUDY = ROOT / 'public/reader/super/likutay-moharan/1/3/torah-study.json'
PHRASES = ROOT / 'public/reader/super/likutay-moharan/1/3/phrase-study.json'
CLASSIC = ROOT / 'public/reader/likutay-moharan/part-1/torah-3.json'
URL = 'https://www.sefaria.org/api/texts/Likutei_Moharan.3.{section}?lang=bi&context=0'


def hebrew_key(value: str) -> str:
    return ''.join(re.findall(r'[א-ת]', str(value or '')))


def english_key(value: str) -> str:
    return ''.join(re.findall(r'[a-z0-9]', str(value or '').lower()))


def main() -> None:
    study = json.loads(STUDY.read_text(encoding='utf-8'))
    classic = json.loads(CLASSIC.read_text(encoding='utf-8'))
    segments = study['segments']
    if len(segments) != 34 or [item['index'] for item in segments] != list(range(1, 35)):
        raise RuntimeError('Torah 3 must contain 34 contiguous aligned passages')
    if not all(item.get('he') and item.get('en') and item.get('he_nikud') for item in segments):
        raise RuntimeError('Every aligned passage must have Hebrew, vocalized Hebrew, and English')

    covered = set()
    for item in segments:
        covered.update(int(value) for value in item.get('classicSegments', [item['classicSegment']]))
    if covered != set(range(1, 13)):
        raise RuntimeError(f'Classic crosswalk coverage mismatch: {sorted(covered)}')

    sefaria_segments = [item for item in segments if item.get('source') == 'Sefaria API']
    source_cursor = 0
    for section in range(1, 9):
        response = requests.get(URL.format(section=section), timeout=45)
        response.raise_for_status()
        data = response.json()
        if len(data.get('he', [])) != len(data.get('text', [])):
            raise RuntimeError(f'Sefaria section {section} is not bilingual-aligned')
        for comment, (he, en) in enumerate(zip(data['he'], data['text']), start=1):
            item = sefaria_segments[source_cursor]
            source_cursor += 1
            if (item['sourceSection'], item['sourceComment']) != (section, comment):
                raise RuntimeError(f'Source order mismatch at {section}:{comment}')
            if hebrew_key(item['he']) != hebrew_key(he) or not item['en']:
                raise RuntimeError(f'Source witness mismatch at {section}:{comment}')
    if source_cursor != 33:
        raise RuntimeError(f'Expected 33 Sefaria passages, found {source_cursor}')

    rashbam = next(item for item in segments if item.get('source') == 'Classic reader / Rashbam gloss')
    classic_by_index = {int(item['index']): item for item in classic['segments']}
    expected_rashbam = classic_by_index[2]['he'] + classic_by_index[3]['he']
    if hebrew_key(rashbam['he']) != hebrew_key(expected_rashbam) or rashbam.get('classicSegments') != [2, 3]:
        raise RuntimeError('Rashbam gloss is not preserved exactly from classic segments 2–3')

    phrase_data = json.loads(PHRASES.read_text(encoding='utf-8'))
    phrases = phrase_data.get('phrases', [])
    if not phrases:
        raise RuntimeError('Phrase study is empty')
    by_index = {item['index']: item for item in segments}
    ids = set()
    for phrase in phrases:
        if phrase['id'] in ids:
            raise RuntimeError(f"Duplicate phrase id {phrase['id']}")
        ids.add(phrase['id'])
        segment = by_index.get(int(phrase['segment']))
        if not segment:
            raise RuntimeError(f"Phrase {phrase['id']} points to a missing passage")
        if phrase['he'] not in segment['he'] or hebrew_key(phrase['he']) not in hebrew_key(segment['he']):
            raise RuntimeError(f"Hebrew phrase {phrase['id']} is not an exact source substring in passage {phrase['segment']}")
        if (phrase.get('enMatch') or phrase['en']) not in segment['en'] or english_key(phrase.get('enMatch') or phrase['en']) not in english_key(segment['en']):
            raise RuntimeError(f"English phrase {phrase['id']} is not an exact source substring in passage {phrase['segment']}")
        if not phrase.get('info') or not phrase.get('source'):
            raise RuntimeError(f"Phrase {phrase['id']} lacks explanation or citation")

    print(f'Validated Torah 3: 34 aligned passages, 12 classic segments, {len(phrases)} phrase anchors.')


if __name__ == '__main__':
    main()
