#!/usr/bin/env python3
"""Package Torah 19 Parparos section 20 as normalized Hebrew-only records."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'public/reader/parparos-lechochma/section-20.json'; OUT=ROOT/'public/reader/super/likutay-moharan/1/19/parparos-lechochma.json'
SOURCE_INDICES=list(range(2,23,2))
def main():
 data=json.loads(SOURCE.read_text(encoding='utf-8-sig').replace('\x00','')); source=data.get('segments',[])
 if data.get('title')!='סימן י"ט-מאמר תפלה לחבקוק' or len(source)!=11 or [int(x['index']) for x in source]!=SOURCE_INDICES: raise RuntimeError('Frozen Parparos section 20 identity/indices changed')
 segments=[]
 for index,item in enumerate(source,1):
  he=str(item.get('he') or '').strip()
  if not he: raise RuntimeError(f'Empty Parparos Hebrew at source index {item.get("index")}')
  segments.append({'index':index,'sourceIndex':int(item['index']),'sourceSection':20,'sourceIdentity':f'section-20.json#index={item["index"]}','he':he,'en':''})
 out={'id':'plc-19-super','book':'parparos-lechochma','part':1,'torah':19,'displayNumber':19,'title':data.get('title'),'hebrewTitle':data.get('hebrewTitle'),'sourceSection':20,'sourceId':data.get('id'),'segments':segments,'totalParagraphs':11,'totalSegments':11,'hasEnglish':False,'sourceFile':str(SOURCE.relative_to(ROOT)),'superReaderMetadataRepair':'Normalized source even indices 2–22 to 1–11 and retained each original index. Legacy English is shifted/cross-Torah and is intentionally not packaged or exposed.'}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Packaged Parparos Torah 19: 11 Hebrew-only records normalized 1–11; preserved source indices 2–22; excluded unsafe legacy English.')
if __name__=='__main__': main()
