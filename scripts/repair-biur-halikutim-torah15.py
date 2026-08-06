#!/usr/bin/env python3
"""Repair Biur HaLikutim section 21 metadata: its content is Torah 15."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/reader/biur-halikutim/section-21.json'
def main():
    data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00',''))
    data.update({'id':'bhl-15','torah':15,'displayNumber':15,'superReaderMetadataRepair':'Section 21 source title identifies סימן ט״ו; metadata corrected for Super Reader discovery.'})
    if len(data.get('segments',[]))!=10 or any(not x.get('he') for x in data['segments']) or any(x.get('en') for x in data['segments']): raise RuntimeError('Biur section 21 must contain 10 Hebrew-only records')
    OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Repaired Biur section-21 metadata to Torah/display 15; retained 10 Hebrew-only records.')
if __name__=='__main__': main()
