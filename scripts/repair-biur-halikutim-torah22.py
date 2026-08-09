#!/usr/bin/env python3
"""Package the exact Torah 22 semantic slice from shared Biur section 26."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'public/reader/biur-halikutim/section-26.json'; OUT=ROOT/'public/reader/super/likutay-moharan/1/22/biur-halikutim.json'
def main():
 data=json.loads(SOURCE.read_text(encoding='utf-8-sig').replace('\x00','')); source=data.get('segments',[]); by={int(x['index']):x for x in source}
 if data.get('title')!='עתיקא טמיר וסתים-סימן כ"א' or len(source)!=210 or [int(x['index']) for x in source]!=list(range(1,211)): raise RuntimeError('Frozen shared Biur section 26 identity/count changed')
 if 'חותם בתוך חותם' not in str(by[142].get('he') or '') or any(not by[i].get('he') or by[i].get('en') for i in range(143,211)): raise RuntimeError('Biur Torah 22 heading/substantive slice changed')
 segments=[]
 for source_index in range(143,211):
  item=by[source_index]
  segments.append({'index':len(segments)+1,'sourceIndex':source_index,'sourceSection':26,'sourceIdentity':f'section-26.json#index={source_index}','he':str(item['he']).strip(),'en':''})
 out={'id':'bhl-22-super','book':'biur-halikutim','part':1,'torah':22,'displayNumber':22,'title':'חותם בתוך חותם סימן כ"ב','hebrewTitle':'ביאור הליקוטים — תורה כב','sourceSection':26,'sourceId':data.get('sourceId') or data.get('id'),'sourceFile':str(SOURCE.relative_to(ROOT)),'segments':segments,'totalParagraphs':68,'totalSegments':68,'hasEnglish':False,'excludedBoundary':{'sourceIndex':142,'text':str(by[142].get('he') or ''),'reason':'Torah 22 heading, not substantive commentary'},'superReaderMetadataRepair':'Packaged only physical indices 143–210 as Torah 22, normalized to 1–68 with physical provenance. The shared source remains intact so Torah 21 behavior is not damaged.'}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Packaged Biur Torah 22: section 26 physical indices 143–210 normalized to 68 Hebrew-only records; heading 142 excluded; shared source unchanged.')
if __name__=='__main__': main()
