#!/usr/bin/env python3
"""Rebuild Prayer 20 from exactly seven authoritative bilingual .para blocks."""
from __future__ import annotations
import json,re
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_20_prayer20.html'; OUT=ROOT/'public/reader/likutay-tefilos/part-1/prayer-20.json'
IDS=[f'p20{chr(97+i)}' for i in range(7)]
def main():
 soup=BeautifulSoup(HTML.read_text(encoding='utf-8'),'html.parser')
 dates=[x.get_text(' ',strip=True).replace('\xa0',' ') for x in soup.select('.date-bar')]; special=[x.get_text(' ',strip=True).replace('\xa0',' ') for x in soup.select('.special-bar')]
 if len(dates)!=1 or '13th of Cheshvan' not in dates[0] or len(special)!=1 or 'Pesach' not in special[0]: raise RuntimeError('Prayer 20 structural bars changed')
 segments=[]
 for index,div in enumerate(soup.select('div.para'),1):
  hebrew=div.select_one('.heb-text'); paragraph=div.find('p',recursive=False)
  if hebrew is None or paragraph is None or index>len(IDS) or hebrew.get('id')!=IDS[index-1]: raise RuntimeError(f'Prayer block identity/pairing mismatch at {index}')
  clone=BeautifulSoup(str(paragraph),'html.parser')
  for node in clone.select('.heb-btn,.heb-text'): node.decompose()
  he=hebrew.get_text(' ',strip=True); en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True))
  if not he or not en or he==en or 'עברית ▾' in en or 'Cheshvan' in he or 'פֶּסַח' in he: raise RuntimeError(f'Unclean prayer block {index}')
  segments.append({'index':index,'sourceId':hebrew['id'],'he':he,'he_nikud':he,'en':en})
 if len(segments)!=7 or [x['sourceId'] for x in segments]!=IDS or any(any(t in x['he'] for t in ('יג חֶשְׁוָן','יד חֶשְׁוָן','טו חֶשְׁוָן','פֶּסַח')) for x in segments): raise RuntimeError('Expected clean p20a-p20g exactly')
 data={'id':'lt-1-20','book':'likutay-tefilos','part':1,'torah':20,'displayNumber':20,'title':'Prayer Twenty','hebrewTitle':'תפילה כ','segments':segments,'aligned_segments':segments,'totalParagraphs':7,'totalSegments':7,'hasEnglish':True,'navigation':{'prev':'lt-1-19','next':'lt-1-21','prevUrl':'/reader/likutay-tefilos/1/19','nextUrl':'/reader/likutay-tefilos/1/21'},'superReaderRepairSource':str(HTML.relative_to(ROOT)),'excludedMetadata':{'dateBars':1,'dateBarText':dates,'specialBars':1,'specialBarText':special[0],'reason':'Date and Pesach dividers are metadata, not prayer records'}}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Rebuilt Prayer 20 as p20a–p20g: seven same-container bilingual blocks; excluded one date bar and one Pesach bar.')
if __name__=='__main__': main()
