#!/usr/bin/env python3
"""Rebuild Torah 11 Likutay Tefilos from six canonical bilingual HTML blocks."""
from __future__ import annotations
import json
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1];HTML=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_11_prayer11.html';OUT=ROOT/'public/reader/likutay-tefilos/part-1/prayer-11.json'
def main():
 soup=BeautifulSoup(HTML.read_text(encoding='utf-8'),'html.parser');segments=[]
 for i,div in enumerate(soup.select('div.para'),1):
  he=div.select_one('.heb-text');p=div.find('p')
  if he is None or p is None:raise RuntimeError(f'Incomplete prayer block {i}')
  clone=BeautifulSoup(str(p),'html.parser')
  for n in clone.select('.heb-btn,.heb-text'):n.decompose()
  h=he.get_text(' ',strip=True);e=clone.get_text(' ',strip=True)
  if not h or not e or 'עברית ▾' in e:raise RuntimeError(f'Unclean prayer block {i}')
  segments.append({'index':i,'he':h,'he_nikud':h,'en':e})
 if len(segments)!=6:raise RuntimeError(f'Expected 6 bilingual blocks, got {len(segments)}')
 data=json.loads(OUT.read_text(encoding='utf-8'));data.update({'id':'lt-1-11','book':'likutay-tefilos','part':1,'torah':11,'displayNumber':11,'segments':segments,'aligned_segments':segments,'totalParagraphs':6,'totalSegments':6,'hasEnglish':True,'superReaderRepairSource':str(HTML.relative_to(ROOT))})
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print('Rebuilt Torah 11 prayer as six authoritative bilingual blocks (lt-1-11).')
if __name__=='__main__':main()
