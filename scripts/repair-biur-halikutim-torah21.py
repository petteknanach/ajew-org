#!/usr/bin/env python3
"""Verify/package Biur HaLikutim source section 26 as Torah 21."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/reader/biur-halikutim/section-26.json'
def main():
 data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')); segs=data.get('segments',[])
 if data.get('title')!='עתיקא טמיר וסתים-סימן כ"א' or len(segs)!=210 or [int(x['index']) for x in segs]!=list(range(1,211)) or any(not x.get('he') for x in segs) or any(x.get('en') for x in segs): raise RuntimeError('Biur section 26 must be the frozen 210-record Hebrew-only Torah 21 source')
 data.update({'id':'bhl-21','torah':21,'displayNumber':21,'sourceSection':26,'sourceId':'bhl-26','totalParagraphs':210,'totalSegments':210,'hasEnglish':False,'superReaderMetadataRepair':'Source section 26 title identifies סימן כ״א; 210 sequential Hebrew-only records preserved. Generic legacy numeric fields do not determine the association.'})
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Verified Biur section 26 for Torah 21: 210 sequential Hebrew-only records.')
if __name__=='__main__': main()
