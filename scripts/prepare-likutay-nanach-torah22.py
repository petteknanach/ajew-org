#!/usr/bin/env python3
"""Package the exact seven-file Likutay Nanach semantic range for Torah 22."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; SOURCE=ROOT/'public/reader/likutay-nanach/volume-4'; OUT=ROOT/'public/reader/super/likutay-moharan/1/22/likutay-nanach.json'
RANGES=[('chapter-19.json',1,15),('chapter-20.json',1,1),('chapter-21.json',1,2),('chapter-22.json',1,1),('chapter-23.json',1,1),('chapter-24.json',1,1),('chapter-25.json',1,12)]
def load(name): return json.loads((SOURCE/name).read_text(encoding='utf-8-sig').replace('\x00',''))
def main():
 before={int(x['index']):x for x in load('chapter-18.json')['segments']}; after={int(x['index']):x for x in load('chapter-25.json')['segments']}
 if str(before[53].get('he') or '').strip()!='תורה כב חותם בתוך חותם' or str(after[13].get('he') or '').strip()!='תורה כג': raise RuntimeError('Nanach Torah 22 semantic headings changed')
 segments=[]
 for filename,first,last in RANGES:
  data=load(filename); by={int(x['index']):x for x in data['segments']}
  for source_index in range(first,last+1):
   item=dict(by[source_index]); item.update({'index':len(segments)+1,'sourceFile':f'volume-4/{filename}','sourceIndex':source_index,'sourceIdentity':f'volume-4/{filename}#index={source_index}'})
   if not item.get('he') or item.get('en'): raise RuntimeError(f'Nanach record must be Hebrew-only: {filename}#{source_index}')
   segments.append(item)
 if len(segments)!=33: raise RuntimeError('Expected exactly 33 substantive Nanach records')
 out={'id':'likutay-nanach-torah-22','book':'likutay-nanach','part':1,'torah':22,'title':'ליקוטי ננח — תורה כב','segments':segments,'totalSegments':33,'hasEnglish':False,'sourceSlices':[{'file':f'volume-4/{name}','start':first,'end':last,'count':last-first+1} for name,first,last in RANGES],'excludedBoundaries':['volume-4/chapter-18.json#index=53 (Torah 22 heading)','volume-4/chapter-25.json#index=13 (Torah 23 heading)']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Packaged Likutay Nanach Torah 22: 33 Hebrew-only records across chapters 19–25; excluded heading boundaries chapter 18 index 53 and chapter 25 index 13.')
if __name__=='__main__': main()
