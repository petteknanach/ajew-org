#!/usr/bin/env python3
"""Package exact chapter-18 indices 21-26 as Likutay Nanach Torah 20."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; SOURCE=ROOT/'public/reader/likutay-nanach/volume-4/chapter-18.json'; OUT=ROOT/'public/reader/super/likutay-moharan/1/20/likutay-nanach.json'
def main():
 data=json.loads(SOURCE.read_text(encoding='utf-8-sig').replace('\x00','')); by={int(x['index']):x for x in data['segments']}
 if 'תורה כ' not in by[20].get('he','') or 'תורה כא' not in by[27].get('he',''): raise RuntimeError('Nanach Torah 20 heading boundaries changed')
 segments=[]
 for source_index in range(21,27):
  item=dict(by[source_index]); item.update({'index':len(segments)+1,'sourceFile':'volume-4/chapter-18.json','sourceIndex':source_index,'sourceIdentity':f'volume-4/chapter-18.json#index={source_index}'})
  if not item.get('he') or item.get('en'): raise RuntimeError(f'Nanach record must be Hebrew-only: {source_index}')
  segments.append(item)
 out={'id':'likutay-nanach-torah-20','book':'likutay-nanach','part':1,'torah':20,'title':'ליקוטי ננח — תורה כ','segments':segments,'totalSegments':6,'hasEnglish':False,'sourceSlice':{'file':'volume-4/chapter-18.json','start':21,'end':26,'count':6},'excludedBoundaries':['volume-4/chapter-18.json#index=20 (Torah 20 heading)','volume-4/chapter-18.json#index=27 (Torah 21 heading)']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Packaged Likutay Nanach Torah 20: chapter 18 indices 21–26, six Hebrew-only records; excluded headings 20 and 27.')
if __name__=='__main__': main()
