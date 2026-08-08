#!/usr/bin/env python3
"""Verify/package Biur HaLikutim source section 24 as Torah 19."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/reader/biur-halikutim/section-24.json'
def main():
 data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')); segs=data.get('segments',[])
 if data.get('title')!='תפילה לחבקוק סימן י"ט' or len(segs)!=19 or [int(x['index']) for x in segs]!=list(range(1,20)) or any(not x.get('he') for x in segs) or any(x.get('en') for x in segs): raise RuntimeError('Biur section 24 must be the frozen 19-record Hebrew-only Torah 19 source')
 data.update({'id':'bhl-19','torah':19,'displayNumber':19,'sourceSection':24,'sourceId':'bhl-24','totalParagraphs':19,'totalSegments':19,'hasEnglish':False,'superReaderMetadataRepair':'Source section 24 title identifies סימן י״ט; 19 sequential Hebrew-only records preserved. Section 25 belongs to Torah 20 and is excluded.'})
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Verified Biur section 24 for Torah 19: 19 sequential Hebrew-only records; section 25 excluded.')
if __name__=='__main__': main()
