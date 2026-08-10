#!/usr/bin/env python3
"""Crosswalk Torah 1 phrase-study anchors onto the aligned source passages."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TORAH = ROOT / 'public/reader/super/likutay-moharan/1/1/torah-study.json'
PHRASES = ROOT / 'public/reader/super/likutay-moharan/1/1/phrase-study.json'
SOURCE_VARIANTS = {
    '8-2': 'תמימי דרך בחינת (בראשית כ״ה:כ״ז): יעקב איש תם',
}


def hebrew_key(value: str) -> str:
    return re.sub(r'[^א-ת]', '', value)


def main() -> None:
    torah = json.loads(TORAH.read_text(encoding='utf-8'))
    study = json.loads(PHRASES.read_text(encoding='utf-8'))

    for phrase in study['phrases']:
        classic_segment = int(phrase.get('classicSegment', phrase['segment']))
        phrase['classicSegment'] = classic_segment
        if phrase['id'] in SOURCE_VARIANTS:
            phrase['he'] = SOURCE_VARIANTS[phrase['id']]
        key = hebrew_key(phrase['he'])
        matches = [
            passage for passage in torah['segments']
            if passage['classicSegment'] == classic_segment
            and key in hebrew_key(passage['he'])
        ]
        if len(matches) != 1:
            raise RuntimeError(f"Phrase {phrase['id']} has {len(matches)} aligned matches")
        phrase['segment'] = matches[0]['index']
        phrase['sourceRef'] = matches[0]['sourceRef']

    if len({phrase['id'] for phrase in study['phrases']}) != len(study['phrases']):
        raise RuntimeError('Duplicate phrase IDs')
    PHRASES.write_text(json.dumps(study, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Aligned {len(study['phrases'])} Torah 1 phrase anchors to {len(torah['segments'])} passages")


if __name__ == '__main__':
    main()
