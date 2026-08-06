#!/usr/bin/env python3
"""Rebuild Prayer 16 from exactly three authoritative bilingual .para blocks."""
from __future__ import annotations
import json
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_16_prayer16.html'
OUT=ROOT/'public/reader/likutay-tefilos/part-1/prayer-16.json'
def main():
    soup=BeautifulSoup(HTML.read_text(encoding='utf-8'),'html.parser')
    if len(soup.select('.date-bar'))!=1: raise RuntimeError('Prayer 16 must retain one date-bar as non-record metadata')
    segments=[]
    for index,div in enumerate(soup.select('div.para'),1):
        hebrew=div.select_one('.heb-text'); paragraph=div.find('p')
        if hebrew is None or paragraph is None: raise RuntimeError(f'Incomplete prayer block {index}')
        clone=BeautifulSoup(str(paragraph),'html.parser')
        for node in clone.select('.heb-btn,.heb-text'): node.decompose()
        he=hebrew.get_text(' ',strip=True); en=clone.get_text(' ',strip=True)
        if not he or not en or 'עברית ▾' in en or he==en: raise RuntimeError(f'Unclean prayer block {index}')
        segments.append({'index':index,'he':he,'he_nikud':he,'en':en})
    if len(segments)!=3: raise RuntimeError(f'Expected exactly 3 authoritative .para blocks, got {len(segments)}')
    data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00',''))
    data.update({'id':'lt-1-16','book':'likutay-tefilos','part':1,'torah':16,'displayNumber':16,'segments':segments,'aligned_segments':segments,'totalParagraphs':3,'totalSegments':3,'hasEnglish':True,'superReaderRepairSource':str(HTML.relative_to(ROOT)),'excludedMetadata':{'dateBars':1,'reason':'4th of Cheshvan is a divider, not a prayer record'}})
    OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Rebuilt Prayer 16 as exactly three authoritative bilingual .para blocks; excluded one date-bar.')
if __name__=='__main__': main()
