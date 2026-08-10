#!/usr/bin/env python3
"""Build Torah 8's phrase navigation from aligned text and synchronized commentary."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/reader/super/likutay-moharan/1/8'
SELECTED = [1, 4, 8, 11, 14, 18, 21, 24, 27, 31, 34, 37, 41, 44, 47, 51, 54, 57, 61, 64, 67, 71, 74, 77, 80, 84, 87, 90, 94, 97]


def words(value: str, count: int) -> str:
    return ' '.join(value.replace('\n', ' ').split()[:count]).strip(' ,;:.—–-')


def clean_commentary(value: str) -> str:
    value = re.sub(r'[*_#`]', '', value or '')
    value = re.sub(r'\s+', ' ', value).strip()
    sentences = re.split(r'(?<=[.!?])\s+', value)
    result = ' '.join(sentences[:2])
    return result[:440].rstrip()


def inline(value: str, phrase: str, phrase_id: str) -> str:
    if phrase not in value:
        raise RuntimeError(f'Cannot anchor {phrase_id}: {phrase!r}')
    return value.replace(phrase, f'<span data-inline-phrase="{phrase_id}">{phrase}</span>', 1)


def main() -> None:
    study = json.loads((BASE / 'torah-study.json').read_text(encoding='utf-8'))
    pettek = json.loads((ROOT / 'public/reader/pettek-nanach-commentary/torah-8.json').read_text(encoding='utf-8'))
    pettek_by_segment = {int(item.get('relatedSegment', item['index'])): item for item in pettek['segments']}
    by_index = {int(item['index']): item for item in study['segments']}
    phrases = []
    for position, index in enumerate(SELECTED, start=1):
        segment = by_index[index]
        classic = int(segment['classicSegment'])
        commentary = pettek_by_segment.get(classic, {})
        layers = commentary.get('layers', {})
        commentary_text = clean_commentary(str((layers.get('beginner') or {}).get('en') or (layers.get('intermediate') or {}).get('en') or ''))
        he_phrase = words(segment['he'], 9)
        en_match = words(segment['en'], 14)
        direct_line = words(segment['en'], 11)
        explanation = f'“{direct_line}” — {commentary_text or f"This line develops section {classic} of Torah 8."}'
        phrase_id = f'{index}-1'
        segment['he'] = inline(segment['he'], he_phrase, phrase_id)
        he_nikud_phrase = words(segment['he_nikud'], 9)
        segment['he_nikud'] = inline(segment['he_nikud'], he_nikud_phrase, phrase_id)
        segment['en'] = inline(segment['en'], en_match, phrase_id)
        phrases.append({
            'id': phrase_id, 'segment': index, 'he': he_phrase,
            'en': direct_line, 'enMatch': en_match,
            'info': explanation[:520].rstrip(),
            'source': segment['sourceRef'], 'classicSegment': classic, 'sourceRef': segment['sourceRef'],
        })
    payload = {
        'title': 'Torah 8 phrase-by-phrase study guide',
        'status': 'Editorial navigation aid — the sourced Hebrew and English remain unchanged',
        'phrases': phrases,
    }
    (BASE / 'torah-study.json').write_text(json.dumps(study, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (BASE / 'phrase-study.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {len(phrases)} Torah 8 phrase-study entries.')


if __name__ == '__main__':
    main()
