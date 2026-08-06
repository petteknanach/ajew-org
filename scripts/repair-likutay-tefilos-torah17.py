#!/usr/bin/env python3
"""Rebuild Prayer 17 from exactly fourteen authoritative bilingual .para blocks."""
from __future__ import annotations
import json,re
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_17_prayer17.html'; OUT=ROOT/'public/reader/likutay-tefilos/part-1/prayer-17.json'
IDS=[f'p17{chr(97+i)}' for i in range(14)]
def main():
 soup=BeautifulSoup(HTML.read_text(encoding='utf-8'),'html.parser')
 if len(soup.select('.date-bar'))!=5: raise RuntimeError('Prayer 17 must contain five excluded date bars')
 segments=[]
 for index,div in enumerate(soup.select('div.para'),1):
  hebrew=div.select_one('.heb-text'); paragraph=div.find('p')
  if hebrew is None or paragraph is None or hebrew.get('id')!=IDS[index-1]: raise RuntimeError(f'Prayer block identity/pairing mismatch at {index}')
  clone=BeautifulSoup(str(paragraph),'html.parser')
  for node in clone.select('.heb-btn,.heb-text'): node.decompose()
  he=hebrew.get_text(' ',strip=True); en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True))
  if not he or not en or he==en or 'עברית ▾' in en: raise RuntimeError(f'Unclean prayer block {index}')
  segments.append({'index':index,'sourceId':hebrew['id'],'he':he,'he_nikud':he,'en':en})
 if len(segments)!=14 or [x['sourceId'] for x in segments]!=IDS: raise RuntimeError('Expected p17a-p17n exactly')
 data={'id':'lt-1-17','book':'likutay-tefilos','part':1,'torah':17,'displayNumber':17,'title':'Prayer Seventeen','hebrewTitle':'תפילה יז','segments':segments,'aligned_segments':segments,'totalParagraphs':14,'totalSegments':14,'hasEnglish':True,'superReaderRepairSource':str(HTML.relative_to(ROOT)),'excludedMetadata':{'dateBars':5,'reason':'Date dividers are metadata, not prayer records'},'dateGroups':{'4 Cheshvan':['p17a','p17g'],'5 Cheshvan':['p17h','p17i'],'6 Cheshvan':['p17j','p17l'],'7 Cheshvan':['p17m','p17m'],'8 Cheshvan':['p17n','p17n']}}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Rebuilt Prayer 17 as p17a–p17n: 14 same-container bilingual blocks; excluded five date bars.')
if __name__=='__main__': main()
