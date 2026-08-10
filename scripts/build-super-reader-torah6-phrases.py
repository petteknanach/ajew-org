#!/usr/bin/env python3
"""Build Torah 6's phrase navigation from aligned text and synchronized commentary."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/reader/super/likutay-moharan/1/6'
SELECTED = [1, 2, 3, 6, 9, 10, 13, 16, 19, 22, 25, 28, 31, 34, 37, 38, 40, 43, 46, 49, 52, 55, 58, 61, 64, 67, 70, 74, 85, 94]


def words(value: str, count: int) -> str:
    return ' '.join(value.replace('\n', ' ').split()[:count]).strip(' ,;:.—–-')


def clean_commentary(value: str) -> str:
    value = re.sub(r'[*_#`]', '', value or '')
    value = re.sub(r'\s+', ' ', value).strip()
    sentences = re.split(r'(?<=[.!?])\s+', value)
    result = ' '.join(sentences[:2])
    return result[:440].rstrip()


def main() -> None:
    study = json.loads((BASE / 'torah-study.json').read_text(encoding='utf-8'))
    pettek = json.loads((ROOT / 'public/reader/pettek-nanach-commentary/torah-6.json').read_text(encoding='utf-8'))
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
        explanation = f'“{direct_line}” — {commentary_text or f"This line develops section {classic} of Torah 6."}'
        phrases.append({
            'id': f'{index}-1', 'segment': index, 'he': he_phrase,
            'en': words(segment['en'], 11), 'enMatch': en_match,
            'info': explanation[:520].rstrip(),
            'source': segment['sourceRef'], 'classicSegment': classic, 'sourceRef': segment['sourceRef'],
        })
    payload = {
        'title': 'Torah 6 phrase-by-phrase study guide',
        'status': 'Editorial navigation aid — the sourced Hebrew and English remain unchanged',
        'phrases': phrases,
    }
    (BASE / 'phrase-study.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {len(phrases)} Torah 6 phrase-study entries.')


if __name__ == '__main__':
    main()
