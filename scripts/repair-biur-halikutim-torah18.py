#!/usr/bin/env python3
"""Repair/package Biur HaLikutim source section 23 as Torah 18."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/reader/biur-halikutim/section-23.json'
def main():
 data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')); segs=data.get('segments',[])
 if len(segs)!=5 or [int(x['index']) for x in segs]!=list(range(1,6)) or any(not x.get('he') for x in segs) or any(x.get('en') for x in segs): raise RuntimeError('Biur section 23 must contain five sequential Hebrew-only records')
 data.update({'id':'bhl-18','torah':18,'displayNumber':18,'sourceSection':23,'sourceId':'bhl-23','totalParagraphs':5,'totalSegments':5,'hasEnglish':False,'superReaderMetadataRepair':'Source section 23 title identifies סימן י״ח; packaged as Torah 18 while sourceSection/sourceId preserve provenance.'})
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Repaired Biur section 23 metadata to Torah 18; preserved five sequential Hebrew-only records.')
if __name__=='__main__': main()
