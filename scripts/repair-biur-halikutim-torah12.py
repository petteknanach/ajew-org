#!/usr/bin/env python3
"""Repair Biur HaLikutim section 18 metadata: its content is Torah 12."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/reader/biur-halikutim/section-18.json'

def main():
    data = json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00', ''))
    data.update({'id': 'bhl-12', 'torah': 12, 'displayNumber': 12,
                 'superReaderMetadataRepair': 'Section 18 source contains Torah 12; metadata corrected for Super Reader discovery.'})
    if len(data.get('segments', [])) != 18:
        raise RuntimeError('Biur section 18 must contain 18 Hebrew records')
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Repaired Biur section-18 metadata to Torah/display 12; retained 18 Hebrew records.')

if __name__ == '__main__': main()
