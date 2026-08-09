#!/usr/bin/env python3
"""Package exact chapter-18 indices 28-52 as Likutay Nanach Torah 21."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; SOURCE=ROOT/'public/reader/likutay-nanach/volume-4/chapter-18.json'; OUT=ROOT/'public/reader/super/likutay-moharan/1/21/likutay-nanach.json'
def main():
 data=json.loads(SOURCE.read_text(encoding='utf-8-sig').replace('\x00','')); by={int(x['index']):x for x in data['segments']}
 if 'תורה כא' not in by[27].get('he','') or 'תורה כב' not in by[53].get('he','') or not by[49].get('he','').startswith('תורה כא:יא חיים נצחיים'): raise RuntimeError('Nanach Torah 21 semantic boundaries changed')
 segments=[]
 for source_index in range(28,53):
  item=dict(by[source_index]); item.update({'index':len(segments)+1,'sourceFile':'volume-4/chapter-18.json','sourceIndex':source_index,'sourceIdentity':f'volume-4/chapter-18.json#index={source_index}'})
  if not item.get('he') or item.get('en'): raise RuntimeError(f'Nanach record must be Hebrew-only: {source_index}')
  segments.append(item)
 out={'id':'likutay-nanach-torah-21','book':'likutay-nanach','part':1,'torah':21,'title':'ליקוטי ננח — תורה כא','segments':segments,'totalSegments':25,'hasEnglish':False,'sourceSlice':{'file':'volume-4/chapter-18.json','start':28,'end':52,'count':25},'excludedBoundaries':['volume-4/chapter-18.json#index=27 (Torah 21 heading)','volume-4/chapter-18.json#index=53 (Torah 22 heading)']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Packaged Likutay Nanach Torah 21: chapter 18 indices 28–52, 25 Hebrew-only records; excluded headings 27 and 53.')
if __name__=='__main__': main()
