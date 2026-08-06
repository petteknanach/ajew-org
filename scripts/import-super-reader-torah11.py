#!/usr/bin/env python3
"""Import Torah 11's licensed Sefaria witness and the labeled Classic supplement."""
from __future__ import annotations
import html,json,re
from datetime import datetime,timezone
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/reader/super/likutay-moharan/1/11/torah-study.json'
CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-11.json'
MARKS=re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
SECTION_COUNTS=[7,4,3,4,3,3,7]
CLASSIC_MAP=[1]+[3]*6+[5]*4+[7]*3+[8]*4+[9]*3+[10]*3+[11]*7

def plain(v): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',v or ''))).strip()
def supplement_classic(i):
 for lo,hi,c in [(34,42,12),(43,48,13),(49,60,14),(61,61,15)]:
  if lo<=i<=hi:return c
 raise ValueError(i)
def main():
 classic=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00',''))
 passages=[]; versions=[]
 for section,count in enumerate(SECTION_COUNTS,1):
  r=requests.get(f'https://www.sefaria.org/api/texts/Likutei_Moharan.11.{section}?lang=bi&context=0',timeout=45);r.raise_for_status();d=r.json()
  he=list(d.get('he') or []);en=list(d.get('text') or [])
  if len(he)!=count or len(en)!=count: raise RuntimeError(f'Section {section}: expected {count}, got HE {len(he)}, EN {len(en)}')
  if not versions: versions=d.get('versions',[])
  for comment,(h,e) in enumerate(zip(he,en),1):
   i=len(passages)+1; hn=plain(h); ee=plain(e)
   if not hn or not ee: raise RuntimeError(f'Empty Sefaria passage 11:{section}:{comment}')
   passages.append({'index':i,'sourceSection':section,'sourceComment':comment,'sourceRef':f'Likutei Moharan 11:{section}:{comment}','classicSegment':CLASSIC_MAP[i-1],'provenance':'Sefaria bilingual witness','he':MARKS.sub('',hn),'he_nikud':hn,'en':ee})
 aligned=classic.get('aligned_segments') or []
 if len(aligned)!=61: raise RuntimeError(f'Expected 61 Classic aligned records, got {len(aligned)}')
 for record in aligned[33:61]:
  source_index=int(record['index']); h=str(record.get('he') or '').strip(); e=str(record.get('en') or '').strip()
  if not h or not e: raise RuntimeError(f'Classic supplement record {source_index} is incomplete')
  passages.append({'index':len(passages)+1,'classicAlignedIndex':source_index,'sourceRef':f'Classic aligned record {source_index} — supplement absent from Sefaria','classicSegment':supplement_classic(source_index),'provenance':'Classic-reader supplement absent from Sefaria; repository English preserved verbatim','he':h,'he_nikud':h,'en':e})
 if len(passages)!=59: raise RuntimeError(f'Expected 59 displayed passages, got {len(passages)}')
 payload={'id':'super-lm-1-11-study','book':'likutay-moharan','part':1,'torah':11,'displayNumber':'11','title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic['keyVerse'],'keyVerseTranslation':classic.get('keyVerseTranslation') or 'I am Hashem — that is My Name; My glory I will not give to another, nor My praise to idols.','keyVerseRef':classic['keyVerseRef'],'themes':classic.get('themes',[]),'segments':passages,'totalPassages':59,'sefariaPassages':31,'classicSupplementRange':[34,61],'hasEnglish':True,'hasNikud':True,'license':{'he':'Public Domain (rabenubook.com edition via Sefaria); Classic supplement from repository witness','en':'CC BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria); Classic supplement preserves repository English','notes':['Passages 1–31 are the complete seven-section Sefaria bilingual witness.','Passages 32–59 are clearly labeled Classic-reader supplement records 34–61, absent from Sefaria. Repository English is preserved verbatim; no English was synthesized.']},'source':{'sefariaRef':'Likutei Moharan 11','classicFile':str(CLASSIC.relative_to(ROOT)),'versions':versions},'generatedAt':datetime.now(timezone.utc).isoformat()}
 OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Prepared Torah 11: 31 Sefaria bilingual passages + 28 labeled Classic supplement records (34–61).')
if __name__=='__main__':main()
