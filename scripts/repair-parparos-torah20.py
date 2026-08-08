#!/usr/bin/env python3
"""Package Torah 20 Parparos section 21 as normalized Hebrew-only records."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'public/reader/parparos-lechochma/section-21.json'; OUT=ROOT/'public/reader/super/likutay-moharan/1/20/parparos-lechochma.json'
SOURCE_INDICES=list(range(2,35,2))
def main():
 data=json.loads(SOURCE.read_text(encoding='utf-8-sig').replace('\x00','')); source=data.get('segments',[])
 if data.get('title') != "סימן כ-ט' תיקונין" or len(source)!=17 or [int(x['index']) for x in source]!=SOURCE_INDICES: raise RuntimeError('Frozen Parparos section 21 identity/indices changed')
 segments=[]
 for index,item in enumerate(source,1):
  he=str(item.get('he') or '').strip()
  if not he: raise RuntimeError(f'Empty Parparos Hebrew at source index {item.get("index")}')
  segments.append({'index':index,'sourceIndex':int(item['index']),'sourceSection':21,'sourceIdentity':f'section-21.json#index={item["index"]}','he':he,'en':''})
 out={'id':'plc-20-super','book':'parparos-lechochma','part':1,'torah':20,'displayNumber':20,'title':data.get('title'),'hebrewTitle':data.get('hebrewTitle'),'sourceSection':21,'sourceId':data.get('id'),'segments':segments,'totalParagraphs':17,'totalSegments':17,'hasEnglish':False,'sourceFile':str(SOURCE.relative_to(ROOT)),'superReaderMetadataRepair':'Normalized source even indices 2–34 to 1–17 and retained each original index. Legacy English is shifted/cross-Torah and is intentionally not packaged or exposed.'}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Packaged Parparos Torah 20: 17 Hebrew-only records normalized 1–17; preserved source indices 2–34; excluded unsafe legacy English.')
if __name__=='__main__': main()
