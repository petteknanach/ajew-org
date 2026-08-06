#!/usr/bin/env python3
"""Repair Biur HaLikutim section 20 metadata: its content is Torah 14."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/reader/biur-halikutim/section-20.json'
def main():
    data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00',''))
    data.update({'id':'bhl-14','torah':14,'displayNumber':14,'superReaderMetadataRepair':'Section 20 source title identifies סימן י״ד; metadata corrected for Super Reader discovery.'})
    if len(data.get('segments',[]))!=27 or any(not x.get('he') for x in data['segments']) or any(x.get('en') for x in data['segments']): raise RuntimeError('Biur section 20 must contain 27 Hebrew-only records')
    OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Repaired Biur section-20 metadata to Torah/display 14; retained 27 Hebrew-only records.')
if __name__=='__main__': main()
