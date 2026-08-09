#!/usr/bin/env python3
"""Package Torah 21 Parparos section 22 as normalized Hebrew-only records."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'public/reader/parparos-lechochma/section-22.json'; OUT=ROOT/'public/reader/super/likutay-moharan/1/21/parparos-lechochma.json'
SOURCE_INDICES=list(range(2,41,2))
def main():
 data=json.loads(SOURCE.read_text(encoding='utf-8-sig').replace('\x00','')); source=data.get('segments',[])
 if data.get('title')!='סימן כ"א-עתיקא טמיר וסתים' or len(source)!=20 or [int(x['index']) for x in source]!=SOURCE_INDICES: raise RuntimeError('Frozen Parparos section 22 identity/indices changed')
 segments=[]
 for index,item in enumerate(source,1):
  he=str(item.get('he') or '').strip()
  if not he: raise RuntimeError(f'Empty Parparos Hebrew at source index {item.get("index")}')
  segments.append({'index':index,'sourceIndex':int(item['index']),'sourceSection':22,'sourceIdentity':f'section-22.json#index={item["index"]}','he':he,'en':''})
 out={'id':'plc-21-super','book':'parparos-lechochma','part':1,'torah':21,'displayNumber':21,'title':data.get('title'),'hebrewTitle':data.get('hebrewTitle'),'sourceSection':22,'sourceId':data.get('id'),'segments':segments,'totalParagraphs':20,'totalSegments':20,'hasEnglish':False,'sourceFile':str(SOURCE.relative_to(ROOT)),'superReaderMetadataRepair':'Normalized source even indices 2–40 to 1–20 and retained each original index. Legacy English is reordered/cross-record and is intentionally not packaged or exposed.'}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Packaged Parparos Torah 21: 20 Hebrew-only records normalized 1–20; preserved source indices 2–40; excluded unsafe legacy English.')
if __name__=='__main__': main()
