#!/usr/bin/env python3
"""Rebuild Prayer 19 from exactly twelve authoritative bilingual .para blocks."""
from __future__ import annotations
import json,re
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_19_prayer19.html'; OUT=ROOT/'public/reader/likutay-tefilos/part-1/prayer-19.json'
IDS=[f'p19{chr(97+i)}' for i in range(12)]
def main():
 soup=BeautifulSoup(HTML.read_text(encoding='utf-8'),'html.parser')
 dates=[x.get_text(' ',strip=True).replace('\xa0',' ') for x in soup.select('.date-bar')]; special=[x.get_text(' ',strip=True).replace('\xa0',' ') for x in soup.select('.special-bar')]
 if len(dates)!=3 or not all(token in dates[i] for i,token in enumerate(('10th of Cheshvan','11th of Cheshvan','12th of Cheshvan'))) or len(special)!=1 or 'For Holy Shabbos' not in special[0]: raise RuntimeError('Prayer 19 structural bars changed')
 segments=[]
 for index,div in enumerate(soup.select('div.para'),1):
  hebrew=div.select_one('.heb-text'); paragraph=div.find('p',recursive=False)
  if hebrew is None or paragraph is None or index>len(IDS) or hebrew.get('id')!=IDS[index-1]: raise RuntimeError(f'Prayer block identity/pairing mismatch at {index}')
  clone=BeautifulSoup(str(paragraph),'html.parser')
  for node in clone.select('.heb-btn,.heb-text'): node.decompose()
  he=hebrew.get_text(' ',strip=True); en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True))
  if not he or not en or he==en or 'עברית ▾' in en or 'Cheshvan' in he or 'לְשַׁבָּת קֹדֶשׁ' in he: raise RuntimeError(f'Unclean prayer block {index}')
  segments.append({'index':index,'sourceId':hebrew['id'],'he':he,'he_nikud':he,'en':en})
 if len(segments)!=12 or [x['sourceId'] for x in segments]!=IDS or any('יג חֶשְׁוָן' in x['he'] for x in segments): raise RuntimeError('Expected clean p19a-p19l exactly')
 data={'id':'lt-1-19','book':'likutay-tefilos','part':1,'torah':19,'displayNumber':19,'title':'Prayer Nineteen','hebrewTitle':'תפילה יט','segments':segments,'aligned_segments':segments,'totalParagraphs':12,'totalSegments':12,'hasEnglish':True,'navigation':{'prev':'lt-1-18','next':'lt-1-20','prevUrl':'/reader/likutay-tefilos/1/18','nextUrl':'/reader/likutay-tefilos/1/20'},'superReaderRepairSource':str(HTML.relative_to(ROOT)),'excludedMetadata':{'dateBars':3,'dateBarText':dates,'specialBars':1,'specialBarText':special[0],'reason':'Date and Holy Shabbos dividers are metadata, not prayer records'}}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Rebuilt Prayer 19 as p19a–p19l: twelve same-container bilingual blocks; excluded three date bars and one Holy Shabbos bar.')
if __name__=='__main__': main()
