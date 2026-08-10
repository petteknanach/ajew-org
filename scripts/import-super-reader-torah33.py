#!/usr/bin/env python3
"""Import the frozen Torah 33 bilingual Sefaria witness."""
import html,json,re,time
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/reader/super/likutay-moharan/1/33/torah-study.json'; CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-33.json'
API='https://www.sefaria.org/api/texts/Likutei_Moharan.33.{section}?context=0&commentary=0'; COUNTS=[3,6,13,6,8,4,2,4,7]
MARKS=re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]'); TAGS=re.compile(r'</?(?:i|b|em|strong|span|small|sup|br)(?:\s[^>]*)?>',re.I)
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
def classic_segment(section,leaf):
 if section==1: return 1 if leaf==1 else 2
 if section==2: return 3
 if section==3: return 4
 if section==4: return 5
 if section==5: return 6
 if section==6: return 7 if leaf<=2 else 8
 if section==7: return 9
 if section==8: return 10
 return 11
def main():
 classic=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00','')); assert len(classic['segments'])==11
 segs=[]; sections=[]
 for section,expected in enumerate(COUNTS,1):
  d=fetch(API.format(section=section)); he=d.get('he') or []; en=d.get('text') or []
  if d.get('ref')!=f'Likutei Moharan 33:{section}' or len(he)!=expected or len(en)!=expected: raise RuntimeError(f'Sefaria section {section} changed')
  prev='Likutei Moharan 32:1' if section==1 else f'Likutei Moharan 33:{section-1}'; nxt='Likutei Moharan 34:1' if section==9 else f'Likutei Moharan 33:{section+1}'
  if d.get('prev')!=prev or d.get('next')!=nxt: raise RuntimeError(f'Sefaria boundary {section} changed')
  sections.append(d)
  for leaf,(rh,re_) in enumerate(zip(he,en),1):
   hn,e=plain(rh),plain(re_)
   if not hn or not e: raise RuntimeError(f'empty 33:{section}:{leaf}')
   cs=classic_segment(section,leaf)
   segs.append({'index':len(segs)+1,'sourceSection':section,'sourceComment':leaf,'sourceRef':f'Likutei Moharan 33:{section}:{leaf}','provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English','he':MARKS.sub('',hn),'he_nikud':hn,'en':e,'rawSource':{'he':rh,'en':re_},'classicSegment':cs,'classicSegments':[cs]})
 probe=fetch(API.format(section=10))
 if (probe.get('he') or []) or (probe.get('text') or []) or probe.get('prev')!='Likutei Moharan 33:9' or probe.get('next')!='Likutei Moharan 34:1': raise RuntimeError('upper-bound probe changed')
 first,last=sections[0],sections[-1]
 payload={'id':'super-lm-1-33-study','book':'likutay-moharan','part':1,'torah':33,'displayNumber':'33','title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic.get('keyVerse'),'keyVerseTranslation':segs[0]['en'],'keyVerseRef':classic.get('keyVerseRef'),'themes':classic.get('themes',[]),'segments':segs,'structuralNotes':[],'totalPassages':53,'productionAlignedPassages':53,'productionDisplayRecords':53,'sefariaSections':9,'sefariaSectionCounts':COUNTS,'sefariaPassages':53,'classicFileSegments':11,'classicInScopeSegments':11,'restoredBilingualSupplements':0,'structuralRestorations':0,'hasEnglish':True,'hasNikud':True,'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria)','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)'},'source':{'sefariaRef':'Likutei Moharan 33:1-9','apiPattern':API,'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':first.get('ref'),'prev':first.get('prev'),'lastRef':last.get('ref'),'lastNext':last.get('next'),'versionTitle':first.get('versionTitle'),'license':first.get('license'),'versionSource':first.get('versionSource'),'heVersionTitle':first.get('heVersionTitle'),'heLicense':first.get('heLicense'),'heVersionSource':first.get('heVersionSource'),'versions':first.get('versions',[]),'upperBoundProbe':'Likutei Moharan 33:10'},'alignmentNotes':['Exactly 53 licensed bilingual Sefaria leaves; no supplement or structural restoration.','The 11-key Classic crosswalk is frozen by section, with section 6 split after leaf 2.']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print('Prepared Torah 33: 53 exact bilingual Sefaria leaves across sections 1–9.')
if __name__=='__main__': main()
