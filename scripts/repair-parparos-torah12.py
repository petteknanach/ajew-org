#!/usr/bin/env python3
"""Rebuild Torah 12 Parparos from canonical Finished-HTML groups 5–17."""
from __future__ import annotations
import json
from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]
HTML = Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Parparaos LaChuchmuh/090 Parpara_os_Simanim_11_12.html')
OUT = ROOT / 'public/reader/parparos-lechochma/section-13.json'

def main():
    soup = BeautifulSoup(HTML.read_text(encoding='utf-8'), 'html.parser')
    # Four Torah 11 h3 groups precede Torah 12; global h3 groups 5–17 are Torah 12.
    headings = soup.select('h3')[4:17]
    if len(headings) != 13 or not headings[0].get_text(' ', strip=True).startswith('Section 1') or not headings[-1].get_text(' ', strip=True).startswith('Section 13'):
        raise RuntimeError('Expected canonical Torah 12 Finished-HTML groups 5–17')
    groups = []
    for heading in headings:
        paragraphs = []
        for node in heading.find_all_next():
            if node is not heading and node.name in {'h2', 'h3', 'h4'}:
                break
            if node.name == 'p':
                text = node.get_text('\n', strip=True)
                if text:
                    paragraphs.append(text)
        groups.append('\n\n'.join(paragraphs))
    if any(not group for group in groups):
        raise RuntimeError('Empty Torah 12 Parparos group')
    data = json.loads(OUT.read_text(encoding='utf-8'))
    segments = data.get('segments', [])
    if len(segments) != 13 or [int(x['index']) for x in segments] != list(range(2, 27, 2)):
        raise RuntimeError('Unexpected Torah 12 Parparos records')
    for segment, english in zip(segments, groups):
        segment['en'] = english
    data.update({'id': 'plc-12', 'torah': 12, 'displayNumber': 12, 'hasEnglish': True,
                 'superReaderRepairSource': str(HTML), 'superReaderRepairGroups': [5, 17]})
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Rebuilt 13 authoritative Torah 12 Parparos groups (canonical Finished HTML groups 5–17).')

if __name__ == '__main__': main()
