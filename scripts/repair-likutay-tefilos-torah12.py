#!/usr/bin/env python3
"""Rebuild Torah 12 Likutay Tefilos from four canonical bilingual HTML blocks."""
from __future__ import annotations
import json
from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'public/teachings/likutay-tefilos/likutay_tefilos_12_prayer12.html'
OUT = ROOT / 'public/reader/likutay-tefilos/part-1/prayer-12.json'

def main():
    soup = BeautifulSoup(HTML.read_text(encoding='utf-8'), 'html.parser')
    segments = []
    for index, div in enumerate(soup.select('div.para'), 1):
        hebrew = div.select_one('.heb-text')
        paragraph = div.find('p')
        if hebrew is None or paragraph is None:
            raise RuntimeError(f'Incomplete prayer block {index}')
        clone = BeautifulSoup(str(paragraph), 'html.parser')
        for node in clone.select('.heb-btn,.heb-text'):
            node.decompose()
        he = hebrew.get_text(' ', strip=True)
        en = clone.get_text(' ', strip=True)
        if not he or not en or 'עברית ▾' in en or he == en:
            raise RuntimeError(f'Unclean prayer block {index}')
        segments.append({'index': index, 'he': he, 'he_nikud': he, 'en': en})
    if len(segments) != 4:
        raise RuntimeError(f'Expected 4 bilingual blocks, got {len(segments)}')
    data = json.loads(OUT.read_text(encoding='utf-8'))
    data.update({'id': 'lt-1-12', 'book': 'likutay-tefilos', 'part': 1, 'torah': 12,
                 'displayNumber': 12, 'segments': segments, 'aligned_segments': segments,
                 'totalParagraphs': 4, 'totalSegments': 4, 'hasEnglish': True,
                 'superReaderRepairSource': str(HTML.relative_to(ROOT))})
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Rebuilt Torah 12 prayer as four authoritative bilingual blocks (lt-1-12).')

if __name__ == '__main__': main()
