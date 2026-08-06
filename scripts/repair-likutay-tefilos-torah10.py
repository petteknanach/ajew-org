#!/usr/bin/env python3
"""Repair Torah 10 Likutay Tefilos from nine authoritative bilingual HTML blocks."""
from __future__ import annotations
import json
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_I_10_purim.html'
OUT=ROOT/'public/reader/likutay-tefilos/part-1/prayer-10.json'
def main():
 soup=BeautifulSoup(HTML.read_text(encoding='utf-8'),'html.parser'); segments=[]
 for i,div in enumerate(soup.select('div.para'),1):
  he=div.select_one('.heb-text'); p=div.find('p')
  if he is None or p is None: raise RuntimeError(f'Incomplete prayer block {i}')
  clone=BeautifulSoup(str(p),'html.parser')
  for n in clone.select('.heb-btn,.heb-text'): n.decompose()
  h=he.get_text(' ',strip=True); e=clone.get_text(' ',strip=True)
  if not h or not e or 'עברית ▾' in e: raise RuntimeError(f'Unclean prayer block {i}')
  segments.append({'index':i,'he':h,'he_nikud':h,'en':e})
 if len(segments)!=9: raise RuntimeError(f'Expected 9 bilingual prayer blocks, found {len(segments)}')
 data=json.loads(OUT.read_text(encoding='utf-8')); data['segments']=segments; data['hasEnglish']=True; data['superReaderRepairSource']=str(HTML.relative_to(ROOT))
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Repaired Torah 10 Likutay Tefilos as 9 authoritative bilingual prayer blocks.')
if __name__=='__main__': main()
