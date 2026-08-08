#!/usr/bin/env python3
"""Verify/package Biur HaLikutim source section 25 as Torah 20."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/reader/biur-halikutim/section-25.json'
def main():
 data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')); segs=data.get('segments',[])
 if data.get('title') != "ט' תיקונין-סימן כ'" or len(segs)!=27 or [int(x['index']) for x in segs]!=list(range(1,28)) or any(not x.get('he') for x in segs) or any(x.get('en') for x in segs): raise RuntimeError('Biur section 25 must be the frozen 27-record Hebrew-only Torah 20 source')
 data.update({'id':'bhl-20','torah':20,'displayNumber':20,'sourceSection':25,'sourceId':'bhl-25','totalParagraphs':27,'totalSegments':27,'hasEnglish':False,'superReaderMetadataRepair':'Source section 25 title identifies סימן כ׳; 27 sequential Hebrew-only records preserved. Section 26 belongs to Torah 21 and is excluded.'})
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Verified Biur section 25 for Torah 20: 27 sequential Hebrew-only records; section 26 excluded.')
if __name__=='__main__': main()
