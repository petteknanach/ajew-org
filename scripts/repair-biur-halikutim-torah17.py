#!/usr/bin/env python3
"""Repair/package Biur HaLikutim source section 22 as Torah 17."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/reader/biur-halikutim/section-22.json'
def main():
 data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00',''))
 if len(data.get('segments',[]))!=17 or any(not x.get('he') for x in data['segments']) or any(x.get('en') for x in data['segments']): raise RuntimeError('Biur section 22 must contain 17 Hebrew-only records')
 data.update({'id':'bhl-17','torah':17,'displayNumber':17,'sourceSection':22,'sourceId':'bhl-22','superReaderMetadataRepair':'Source section 22 title identifies סימן י״ז; packaged as Torah 17 while sourceSection/sourceId preserve provenance.'})
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Repaired Biur section-22 metadata to Torah/display 17; preserved source section 22 and 17 Hebrew-only records.')
if __name__=='__main__': main()
