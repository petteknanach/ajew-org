#!/usr/bin/env python3
"""Import the frozen Torah 32 bilingual Sefaria witness."""
import html,json,re,time
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/reader/super/likutay-moharan/1/32/torah-study.json'; CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-32.json'
API='https://www.sefaria.org/api/texts/Likutei_Moharan.32.1?context=0&commentary=0'; MARKS=re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]'); TAGS=re.compile(r'</?(?:i|b|em|strong|span|small|sup|br)(?:\s[^>]*)?>',re.I)
def plain(v): return re.sub(r'\s+',' ',html.unescape(TAGS.sub('',v or ''))).strip()
def fetch(url):
 last=None
 for n in range(6):
  try:
   r=requests.get(url,timeout=60,headers={'User-Agent':'ajew.org Super Reader source audit/1.0'}); r.raise_for_status(); return r.json()
  except Exception as e:
   last=e
   if n<5: time.sleep(2**n)
 raise RuntimeError(last)
def main():
 classic=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00','')); assert len(classic['segments'])==2
 d=fetch(API); he=d.get('he') or []; en=d.get('text') or []
 if d.get('ref')!='Likutei Moharan 32:1' or d.get('prev')!='Likutei Moharan 31:18' or d.get('next')!='Likutei Moharan 33:1' or len(he)!=7 or len(en)!=7: raise RuntimeError('Sefaria Torah 32 boundary/count changed')
 segs=[]
 for leaf,(rh,re_) in enumerate(zip(he,en),1):
  hn,e=plain(rh),plain(re_)
  if not hn or not e: raise RuntimeError(f'empty 32:1:{leaf}')
  keys=[1,2] if leaf==1 else [2]
  segs.append({'index':leaf,'sourceSection':1,'sourceComment':leaf,'sourceRef':f'Likutei Moharan 32:1:{leaf}','provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English','he':MARKS.sub('',hn),'he_nikud':hn,'en':e,'rawSource':{'he':rh,'en':re_},'classicSegment':2,'classicSegments':keys})
 probe=fetch('https://www.sefaria.org/api/texts/Likutei_Moharan.32.2?context=0&commentary=0')
 if (probe.get('he') or []) or (probe.get('text') or []) or probe.get('prev')!='Likutei Moharan 32:1' or probe.get('next')!='Likutei Moharan 33:1': raise RuntimeError('upper-bound probe changed')
 payload={'id':'super-lm-1-32-study','book':'likutay-moharan','part':1,'torah':32,'displayNumber':'32','title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic.get('keyVerse'),'keyVerseTranslation':segs[0]['en'],'keyVerseRef':classic.get('keyVerseRef'),'themes':classic.get('themes',[]),'segments':segs,'structuralNotes':['The first licensed leaf crosses Classic heading key 1 and substantive key 2 and remains intact.'],'totalPassages':7,'productionAlignedPassages':7,'productionDisplayRecords':7,'sefariaSections':1,'sefariaSectionCounts':[7],'sefariaPassages':7,'classicFileSegments':2,'classicInScopeSegments':2,'restoredBilingualSupplements':0,'structuralRestorations':0,'hasEnglish':True,'hasNikud':True,'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria)','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)'},'source':{'sefariaRef':'Likutei Moharan 32:1','apiPattern':API,'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':d.get('ref'),'prev':d.get('prev'),'lastRef':d.get('ref'),'lastNext':d.get('next'),'versionTitle':d.get('versionTitle'),'license':d.get('license'),'versionSource':d.get('versionSource'),'heVersionTitle':d.get('heVersionTitle'),'heLicense':d.get('heLicense'),'heVersionSource':d.get('heVersionSource'),'versions':d.get('versions',[]),'upperBoundProbe':'Likutei Moharan 32:2'},'alignmentNotes':['Exactly seven licensed bilingual Sefaria leaves; no supplement or structural restoration.','Passage 1 retains Classic keys 1 and 2 with substantive primary key 2.']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print('Prepared Torah 32: 7 exact bilingual Sefaria leaves (7 records).')
if __name__=='__main__': main()
