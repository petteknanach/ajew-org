#!/usr/bin/env python3
"""Package the exact six-file, 58-record Likutay Nanach Torah 17 block."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/reader/super/likutay-moharan/1/17/likutay-nanach.json'
SLICES=[('chapter-13.json',84,128),('chapter-14.json',1,1),('chapter-15.json',1,2),('chapter-16.json',1,2),('chapter-17.json',1,5),('chapter-18.json',1,3)]
def load(name): return json.loads((ROOT/'public/reader/likutay-nanach/volume-4'/name).read_text(encoding='utf-8-sig').replace('\x00',''))
def main():
 segments=[]
 chapter13=load('chapter-13.json'); c13={int(x['index']):x for x in chapter13['segments']}
 chapter18=load('chapter-18.json'); c18={int(x['index']):x for x in chapter18['segments']}
 if 'תורה יז' not in c13[83].get('he','') or 'תורה יח' not in c18[4].get('he',''): raise RuntimeError('Nanach Torah 17 heading boundaries changed')
 for name,start,end in SLICES:
  source=load(name); by_index={int(x['index']):x for x in source['segments']}
  for source_index in range(start,end+1):
   item=dict(by_index[source_index]); item.update({'index':len(segments)+1,'sourceFile':f'volume-4/{name}','sourceIndex':source_index,'sourceIdentity':f'volume-4/{name}#index={source_index}'})
   if not item.get('he') or item.get('en'): raise RuntimeError(f'Nanach record must be Hebrew-only: {item["sourceIdentity"]}')
   segments.append(item)
 if len(segments)!=58 or len({x['sourceIdentity'] for x in segments})!=58: raise RuntimeError('Nanach frozen count/composite identity failed')
 data={'id':'likutay-nanach-torah-17','book':'likutay-nanach','part':1,'torah':17,'title':'ליקוטי ננח — תורה יז','segments':segments,'totalSegments':58,'hasEnglish':False,'sourceSlices':[{'file':f'volume-4/{n}','start':a,'end':b,'count':b-a+1} for n,a,b in SLICES],'excludedBoundaries':['volume-4/chapter-13.json#index=83 (Torah 17 heading)','volume-4/chapter-18.json#index=4 (Torah 18 heading)']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Packaged Likutay Nanach Torah 17: 58 Hebrew-only records across chapters 13–18; excluded headings 13#83 and 18#4.')
if __name__=='__main__': main()
