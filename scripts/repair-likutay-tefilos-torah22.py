#!/usr/bin/env python3
"""Rebuild Prayer 22 from exactly seventeen authoritative bilingual .para blocks."""
from __future__ import annotations
import json,re
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_22_prayer22.html'; OUT=ROOT/'public/reader/likutay-tefilos/part-1/prayer-22.json'
IDS=[f'p22{chr(97+i)}' for i in range(17)]
def main():
 soup=BeautifulSoup(HTML.read_text(encoding='utf-8'),'html.parser')
 dates=[x.get_text(' ',strip=True).replace('\xa0',' ') for x in soup.select('.date-bar')]; special=[x.get_text(' ',strip=True).replace('\xa0',' ') for x in soup.select('.special-bar')]
 if len(dates)!=2 or '21st of Cheshvan' not in dates[0] or '22nd of Cheshvan' not in dates[1] or special!=['Rosh Hashanah  ·  רֹאשׁ הַשָּׁנָה']: raise RuntimeError(f'Prayer 22 structural bars changed: {dates} / {special}')
 segments=[]
 for index,div in enumerate(soup.select('div.para'),1):
  hebrew=div.select_one('.heb-text'); paragraph=div.find('p',recursive=False)
  if hebrew is None or paragraph is None or index>len(IDS) or hebrew.get('id')!=IDS[index-1]: raise RuntimeError(f'Prayer block identity/pairing mismatch at {index}')
  clone=BeautifulSoup(str(paragraph),'html.parser')
  for node in clone.select('.heb-btn,.heb-text'): node.decompose()
  he=hebrew.get_text(' ',strip=True); en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True))
  if not he or not en or he==en or 'עברית ▾' in en or 'Cheshvan' in he or 'רֹאשׁ הַשָּׁנָה' in he: raise RuntimeError(f'Unclean prayer block {index}')
  segments.append({'index':index,'sourceId':hebrew['id'],'he':he,'he_nikud':he,'en':en})
 if len(segments)!=17 or [x['sourceId'] for x in segments]!=IDS: raise RuntimeError('Expected clean p22a-p22q exactly')
 old=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')) if OUT.exists() else {}
 navigation=old.get('navigation') or {'prev':'lt-1-21','next':'lt-1-23','prevUrl':'/reader/likutay-tefilos/1/21','nextUrl':'/reader/likutay-tefilos/1/23'}
 if not navigation.get('prevUrl') or not navigation.get('nextUrl'): raise RuntimeError('Prayer navigation URLs missing')
 data={'id':'lt-1-22','book':'likutay-tefilos','part':1,'torah':22,'displayNumber':22,'title':'Prayer Twenty-Two','hebrewTitle':'תפילה כב','segments':segments,'aligned_segments':segments,'totalParagraphs':17,'totalSegments':17,'hasEnglish':True,'navigation':navigation,'superReaderRepairSource':str(HTML.relative_to(ROOT)),'excludedMetadata':{'dateBars':2,'dateBarText':dates,'specialBars':1,'specialBarText':special,'reason':'The 21st/22nd of Cheshvan and Rosh Hashanah dividers are metadata, not prayer records'}}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Rebuilt Prayer 22 as p22a–p22q: seventeen same-container bilingual blocks; excluded two date bars and one Rosh Hashanah bar; preserved navigation.')
if __name__=='__main__': main()
