#!/usr/bin/env python3
"""Package Torah 18 Parparos section 19 as normalized Hebrew-only records."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'public/reader/parparos-lechochma/section-19.json'; OUT=ROOT/'public/reader/super/likutay-moharan/1/18/parparos-lechochma.json'
SOURCE_INDICES=list(range(2,25,2))
def main():
 data=json.loads(SOURCE.read_text(encoding='utf-8-sig').replace('\x00','')); source=data.get('segments',[])
 if len(source)!=12 or [int(x['index']) for x in source]!=SOURCE_INDICES: raise RuntimeError('Frozen Parparos section 19 indices changed')
 segments=[]
 for index,item in enumerate(source,1):
  he=str(item.get('he') or '').strip()
  if not he: raise RuntimeError(f'Empty Parparos Hebrew at source index {item.get("index")}')
  segments.append({'index':index,'sourceIndex':int(item['index']),'sourceSection':19,'he':he,'en':''})
 out={'id':'plc-18-super','book':'parparos-lechochma','part':1,'torah':18,'displayNumber':18,'title':data.get('title'),'hebrewTitle':data.get('hebrewTitle'),'sourceSection':19,'sourceId':data.get('id'),'segments':segments,'totalParagraphs':12,'totalSegments':12,'hasEnglish':False,'sourceFile':str(SOURCE.relative_to(ROOT)),'superReaderMetadataRepair':'Normalized source even indices 2–24 to 1–12 and retained original indices. Legacy English is shifted/cross-Torah and is intentionally not packaged or exposed.'}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Packaged Parparos Torah 18: 12 Hebrew-only records normalized 1–12; preserved source indices 2–24; excluded unsafe legacy English.')
if __name__=='__main__': main()
