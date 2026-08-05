#!/usr/bin/env python3
"""Repair Torah 8's coarse Likutay Tefilos records from its authoritative bilingual HTML."""
from __future__ import annotations
import json
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / 'public/teachings/likutay-tefilos/likutay_tefilos_08_prayer8.html'
OUT = ROOT / 'public/reader/likutay-tefilos/part-1/prayer-8.json'

def main() -> None:
    soup = BeautifulSoup(HTML.read_text(encoding='utf-8'), 'html.parser')
    segments = []
    for index, div in enumerate(soup.select('div.para'), start=1):
        hebrew = div.select_one('.heb-text')
        paragraph = div.find('p')
        if hebrew is None or paragraph is None:
            raise RuntimeError(f'Incomplete prayer block {index}')
        he = hebrew.get_text(' ', strip=True)
        english_soup = BeautifulSoup(str(paragraph), 'html.parser')
        for node in english_soup.select('.heb-btn, .heb-text'):
            node.decompose()
        en = english_soup.get_text(' ', strip=True)
        if not he or not en:
            raise RuntimeError(f'Empty prayer block {index}')
        segments.append({'index': index, 'he': he, 'he_nikud': he, 'en': en})
    if len(segments) != 5:
        raise RuntimeError(f'Expected 5 bilingual prayer blocks, found {len(segments)}')
    data = json.loads(OUT.read_text(encoding='utf-8'))
    data['segments'] = segments
    data['hasEnglish'] = True
    data['superReaderRepairSource'] = str(HTML.relative_to(ROOT))
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Repaired Torah 8 Likutay Tefilos as 5 authoritative bilingual prayer blocks.')

if __name__ == '__main__': main()
