#!/usr/bin/env python3
"""Package Torah 22 Parparos section 23 as normalized Hebrew-only records."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'public/reader/parparos-lechochma/section-23.json'; OUT=ROOT/'public/reader/super/likutay-moharan/1/22/parparos-lechochma.json'
SOURCE_INDICES=[2,4,6,8,10,12,14,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49,51,53]
def main():
 data=json.loads(SOURCE.read_text(encoding='utf-8-sig').replace('\x00','')); source=data.get('segments',[])
 if data.get('title')!='סימן כ"ב' or len(source)!=27 or [int(x['index']) for x in source]!=SOURCE_INDICES: raise RuntimeError('Frozen Parparos section 23 identity/indices changed')
 segments=[]
 for index,item in enumerate(source,1):
  he=str(item.get('he') or '').strip()
  if not he: raise RuntimeError(f'Empty Parparos Hebrew at source index {item.get("index")}')
  segments.append({'index':index,'sourceIndex':int(item['index']),'sourceSection':23,'sourceIdentity':f'section-23.json#index={item["index"]}','he':he,'en':''})
 out={'id':'plc-22-super','book':'parparos-lechochma','part':1,'torah':22,'displayNumber':22,'title':data.get('title'),'hebrewTitle':data.get('hebrewTitle'),'sourceSection':23,'sourceId':data.get('id'),'segments':segments,'totalParagraphs':27,'totalSegments':27,'hasEnglish':False,'sourceFile':str(SOURCE.relative_to(ROOT)),'superReaderMetadataRepair':'Normalized irregular physical indices to 1–27 and retained every source index, including continuation record 15. Legacy English is reordered/cross-record polluted and is intentionally not packaged or exposed.'}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Packaged Parparos Torah 22: 27 Hebrew-only records normalized 1–27; preserved irregular source indices including continuation 15; excluded unsafe legacy English.')
if __name__=='__main__': main()
