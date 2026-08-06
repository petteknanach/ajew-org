#!/usr/bin/env python3
"""Repair Torah 10 Parparos English from the authoritative Finished HTML."""
from __future__ import annotations
import json
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
HTML=Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Parparaos LaChuchmuh/080 Parpara_os_Siman_10.html')
OUT=ROOT/'public/reader/parparos-lechochma/section-11.json'
def main():
 soup=BeautifulSoup(HTML.read_text(encoding='utf-8'),'html.parser'); groups=[]
 for heading in soup.select('h3'):
  if not heading.get_text(' ',strip=True).startswith('Section '): continue
  paragraphs=[]
  for node in heading.find_all_next():
   if node is not heading and node.name in {'h3','h4'}: break
   if node.name=='p':
    text=node.get_text('\n',strip=True)
    if text: paragraphs.append(text)
  groups.append('\n\n'.join(paragraphs))
 if len(groups)!=24 or any(not x for x in groups): raise RuntimeError(f'Expected 24 nonempty section groups, found {len(groups)}')
 data=json.loads(OUT.read_text(encoding='utf-8')); by={int(s['index']):s for s in data['segments']}
 expected=set(range(2,49,2))
 if set(by)!=expected: raise RuntimeError(f'Unexpected Parparos indices: {sorted(by)}')
 for pos,index in enumerate(range(2,49,2)): by[index]['en']=groups[pos]
 if any(not s.get('he') or not s.get('en') for s in data['segments']): raise RuntimeError('Incomplete bilingual Parparos coverage')
 data['hasEnglish']=True; data['superReaderRepairSource']=str(HTML)
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Repaired 24 authoritative Torah 10 Parparos section groups.')
if __name__=='__main__': main()
