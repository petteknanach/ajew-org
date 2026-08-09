#!/usr/bin/env python3
"""Rebuild Prayer 21 from exactly thirteen authoritative bilingual .para blocks."""
from __future__ import annotations
import json,re
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_21_prayer21.html'; OUT=ROOT/'public/reader/likutay-tefilos/part-1/prayer-21.json'
IDS=[f'p21{chr(97+i)}' for i in range(13)]
def main():
 soup=BeautifulSoup(HTML.read_text(encoding='utf-8'),'html.parser')
 dates=[x.get_text(' ',strip=True).replace('\xa0',' ') for x in soup.select('.date-bar')]; special=[x.get_text(' ',strip=True).replace('\xa0',' ') for x in soup.select('.special-bar')]
 if len(dates)!=4 or not all(f'{day}th' in text or (day=='16' and '16th' in text) or (day=='17' and '17th' in text) or (day=='18' and '18th' in text) or (day=='19' and '19th' in text) for day,text in zip(('16','17','18','19'),dates)) or len(special)!=2: raise RuntimeError(f'Prayer 21 structural bars changed: {dates} / {special}')
 segments=[]
 for index,div in enumerate(soup.select('div.para'),1):
  hebrew=div.select_one('.heb-text'); paragraph=div.find('p',recursive=False)
  if hebrew is None or paragraph is None or index>len(IDS) or hebrew.get('id')!=IDS[index-1]: raise RuntimeError(f'Prayer block identity/pairing mismatch at {index}')
  clone=BeautifulSoup(str(paragraph),'html.parser')
  for node in clone.select('.heb-btn,.heb-text'): node.decompose()
  he=hebrew.get_text(' ',strip=True); en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True))
  if not he or not en or he==en or 'עברית ▾' in en or 'Cheshvan' in he or 'סֻכּוֹת' in he: raise RuntimeError(f'Unclean prayer block {index}')
  segments.append({'index':index,'sourceId':hebrew['id'],'he':he,'he_nikud':he,'en':en})
 if len(segments)!=13 or [x['sourceId'] for x in segments]!=IDS: raise RuntimeError('Expected clean p21a-p21m exactly')
 old=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')) if OUT.exists() else {}
 navigation=old.get('navigation') or {'prev':'lt-1-20','next':'lt-1-22','prevUrl':'/reader/likutay-tefilos/1/20','nextUrl':'/reader/likutay-tefilos/1/22'}
 if not navigation.get('prevUrl') or not navigation.get('nextUrl'): raise RuntimeError('Prayer navigation URLs missing')
 data={'id':'lt-1-21','book':'likutay-tefilos','part':1,'torah':21,'displayNumber':21,'title':'Prayer Twenty-One','hebrewTitle':'תפילה כא','segments':segments,'aligned_segments':segments,'totalParagraphs':13,'totalSegments':13,'hasEnglish':True,'navigation':navigation,'superReaderRepairSource':str(HTML.relative_to(ROOT)),'excludedMetadata':{'dateBars':4,'dateBarText':dates,'specialBars':2,'specialBarText':special,'reason':'Date, offspring/children, and Sukkos dividers are metadata, not prayer records'}}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Rebuilt Prayer 21 as p21a–p21m: thirteen same-container bilingual blocks; excluded four date bars and two special bars; preserved navigation.')
if __name__=='__main__': main()
