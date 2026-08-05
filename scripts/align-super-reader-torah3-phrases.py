#!/usr/bin/env python3
"""Snap Torah 3 phrase anchors to exact aligned-source substrings."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STUDY = ROOT / 'public/reader/super/likutay-moharan/1/3/torah-study.json'
PHRASES = ROOT / 'public/reader/super/likutay-moharan/1/3/phrase-study.json'


def mapped(value: str, language: str) -> tuple[str, list[int]]:
    chars: list[str] = []
    positions: list[int] = []
    for index, character in enumerate(str(value or '')):
        keep = bool(re.match(r'[א-ת]', character)) if language == 'he' else character.isascii() and character.isalnum()
        if keep:
            chars.append(character if language == 'he' else character.lower())
            positions.append(index)
    return ''.join(chars), positions


def exact_slice(haystack: str, needle: str, language: str, phrase_id: str) -> str:
    haystack_key, positions = mapped(haystack, language)
    needle_key, _ = mapped(needle, language)
    start = haystack_key.find(needle_key)
    if start < 0 or not needle_key:
        raise RuntimeError(f'{language} phrase {phrase_id} is not in its aligned passage')
    return haystack[positions[start]:positions[start + len(needle_key) - 1] + 1]


def main() -> None:
    study = json.loads(STUDY.read_text(encoding='utf-8'))
    phrase_data = json.loads(PHRASES.read_text(encoding='utf-8'))
    by_index = {int(item['index']): item for item in study['segments']}
    seen = set()
    for phrase in phrase_data['phrases']:
        phrase_id = phrase['id']
        if phrase_id in seen:
            raise RuntimeError(f'Duplicate phrase id {phrase_id}')
        seen.add(phrase_id)
        segment = by_index[int(phrase['segment'])]
        phrase['he'] = exact_slice(segment['he'], phrase['he'], 'he', phrase_id)
        phrase['enMatch'] = exact_slice(segment['en'], phrase.get('enMatch') or phrase['en'], 'en', phrase_id)
        phrase['classicSegment'] = int(segment['classicSegment'])
        phrase['sourceRef'] = segment['sourceRef']
    PHRASES.write_text(json.dumps(phrase_data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Aligned {len(phrase_data['phrases'])} Torah 3 phrase anchors to exact Hebrew and English source substrings.")


if __name__ == '__main__':
    main()
