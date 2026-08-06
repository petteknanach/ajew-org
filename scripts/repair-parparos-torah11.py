#!/usr/bin/env python3
"""Repair Torah 11 Parparos from the first four canonical Finished-HTML groups."""
from __future__ import annotations
import json
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
HTML=Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Parparaos LaChuchmuh/090 Parpara_os_Simanim_11_12.html');OUT=ROOT/'public/reader/parparos-lechochma/section-12.json'
def main():
 soup=BeautifulSoup(HTML.read_text(encoding='utf-8'),'html.parser');heads=[h for h in soup.select('h3') if h.get_text(' ',strip=True).startswith('Section ')][:4];groups=[]
 if len(heads)!=4:raise RuntimeError(f'Expected first four Torah 11 headings, got {len(heads)}')
 for heading in heads:
  paragraphs=[]
  for node in heading.find_all_next():
   if node is not heading and node.name in {'h2','h3','h4'}:break
   if node.name=='p':
    text=node.get_text('\n',strip=True)
    if text:paragraphs.append(text)
  groups.append('\n\n'.join(paragraphs))
 if any(not x for x in groups):raise RuntimeError('Empty Torah 11 Parparos group')
 data=json.loads(OUT.read_text(encoding='utf-8'));segs=data['segments']
 if len(segs)!=4 or [int(x['index']) for x in segs]!=[2,4,6,8]:raise RuntimeError('Unexpected Torah 11 Parparos records')
 for seg,en in zip(segs,groups):seg['en']=en
 data.update({'id':'plc-11','torah':11,'displayNumber':11,'hasEnglish':True,'superReaderRepairSource':str(HTML)})
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print('Reparsed four authoritative Torah 11 Parparos groups; excluded summary and Torah 12.')
if __name__=='__main__':main()
