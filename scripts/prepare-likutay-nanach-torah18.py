#!/usr/bin/env python3
"""Package exact chapter-18 indices 5-9 as Likutay Nanach Torah 18."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; SOURCE=ROOT/'public/reader/likutay-nanach/volume-4/chapter-18.json'; OUT=ROOT/'public/reader/super/likutay-moharan/1/18/likutay-nanach.json'
def main():
 data=json.loads(SOURCE.read_text(encoding='utf-8-sig').replace('\x00','')); by={int(x['index']):x for x in data['segments']}
 if 'תורה יח' not in by[4].get('he','') or 'תורה יט' not in by[10].get('he',''): raise RuntimeError('Nanach Torah 18 heading boundaries changed')
 segments=[]
 for source_index in range(5,10):
  item=dict(by[source_index]); item.update({'index':len(segments)+1,'sourceFile':'volume-4/chapter-18.json','sourceIndex':source_index,'sourceIdentity':f'volume-4/chapter-18.json#index={source_index}'})
  if not item.get('he') or item.get('en'): raise RuntimeError(f'Nanach record must be Hebrew-only: {source_index}')
  segments.append(item)
 out={'id':'likutay-nanach-torah-18','book':'likutay-nanach','part':1,'torah':18,'title':'ליקוטי ננח — תורה יח','segments':segments,'totalSegments':5,'hasEnglish':False,'sourceSlice':{'file':'volume-4/chapter-18.json','start':5,'end':9,'count':5},'excludedBoundaries':['volume-4/chapter-18.json#index=4 (Torah 18 heading)','volume-4/chapter-18.json#index=10 (Torah 19 heading)']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Packaged Likutay Nanach Torah 18: chapter 18 indices 5–9, five Hebrew-only records; excluded headings 4 and 10.')
if __name__=='__main__': main()
