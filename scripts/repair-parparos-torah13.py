#!/usr/bin/env python3
"""Rebuild Torah 13 Parparos from all 13 authoritative Finished-HTML groups."""
from __future__ import annotations
import json
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
HTML=Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Parparaos LaChuchmuh/100 Parpara_os_Siman_13 (1).html')
OUT=ROOT/'public/reader/parparos-lechochma/section-14.json'
def main():
    soup=BeautifulSoup(HTML.read_text(encoding='utf-8'),'html.parser'); headings=soup.select('h3')
    if len(headings)!=13 or not headings[0].get_text(' ',strip=True).startswith('Section 1') or not headings[-1].get_text(' ',strip=True).startswith('Section 13'): raise RuntimeError('Expected all 13 Torah 13 Finished-HTML groups')
    groups=[]
    for heading in headings:
        parts=[]
        for node in heading.next_siblings:
            if getattr(node,'name',None) in {'h2','h3','h4'}: break
            if getattr(node,'name',None) in {'p','div'}:
                text=node.get_text('\n',strip=True)
                if text: parts.append(text)
        groups.append('\n\n'.join(parts))
    if any(not x for x in groups): raise RuntimeError('Empty Torah 13 Parparos group')
    data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')); segments=data.get('segments',[])
    if len(segments)!=13 or [int(x['index']) for x in segments]!=list(range(3,28,2)): raise RuntimeError('Unexpected Torah 13 Parparos records')
    for segment,english in zip(segments,groups): segment['en']=english
    data.update({'id':'plc-13','torah':13,'displayNumber':13,'hasEnglish':True,'superReaderRepairSource':str(HTML),'superReaderRepairGroups':[1,13]})
    OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Rebuilt 13 authoritative Torah 13 Parparos groups (all Finished HTML sections 1–13).')
if __name__=='__main__': main()
