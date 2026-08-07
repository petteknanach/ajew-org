#!/usr/bin/env python3
"""Rebuild Prayer 18 from exactly ten authoritative bilingual .para blocks."""
from __future__ import annotations
import json,re
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_18_prayer18.html'; OUT=ROOT/'public/reader/likutay-tefilos/part-1/prayer-18.json'
IDS=[f'p18{chr(97+i)}' for i in range(10)]
def main():
 soup=BeautifulSoup(HTML.read_text(encoding='utf-8'),'html.parser'); dates=[x.get_text(' ',strip=True).replace('\xa0',' ') for x in soup.select('.date-bar')]
 if len(dates)!=1 or '8th of Cheshvan' not in dates[0] or 'ח חֶשְׁוָן' not in dates[0]: raise RuntimeError('Prayer 18 date bar changed')
 segments=[]
 for index,div in enumerate(soup.select('div.para'),1):
  hebrew=div.select_one('.heb-text'); paragraph=div.find('p',recursive=False)
  if hebrew is None or paragraph is None or index>len(IDS) or hebrew.get('id')!=IDS[index-1]: raise RuntimeError(f'Prayer block identity/pairing mismatch at {index}')
  clone=BeautifulSoup(str(paragraph),'html.parser')
  for node in clone.select('.heb-btn,.heb-text'): node.decompose()
  he=hebrew.get_text(' ',strip=True); en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True))
  if not he or not en or he==en or 'עברית ▾' in en: raise RuntimeError(f'Unclean prayer block {index}')
  segments.append({'index':index,'sourceId':hebrew['id'],'he':he,'he_nikud':he,'en':en})
 if len(segments)!=10 or [x['sourceId'] for x in segments]!=IDS: raise RuntimeError('Expected p18a-p18j exactly')
 data={'id':'lt-1-18','book':'likutay-tefilos','part':1,'torah':18,'displayNumber':18,'title':'Prayer Eighteen','hebrewTitle':'תפילה יח','segments':segments,'aligned_segments':segments,'totalParagraphs':10,'totalSegments':10,'hasEnglish':True,'navigation':{'prev':'lt-1-17','next':'lt-1-19','prevUrl':'/reader/likutay-tefilos/1/17','nextUrl':'/reader/likutay-tefilos/1/19'},'superReaderRepairSource':str(HTML.relative_to(ROOT)),'excludedMetadata':{'dateBars':1,'dateBarText':dates[0],'reason':'Date divider is metadata, not a prayer record'}}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Rebuilt Prayer 18 as p18a–p18j: ten same-container bilingual blocks; excluded one 8th of Cheshvan date bar.')
if __name__=='__main__': main()
