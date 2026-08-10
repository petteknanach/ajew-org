#!/usr/bin/env python3
"""Import the frozen Torah 34 bilingual Sefaria witness."""
import html,json,re,time
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/reader/super/likutay-moharan/1/34/torah-study.json'; CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-34.json'
API='https://www.sefaria.org/api/texts/Likutei_Moharan.34.{section}?context=0&commentary=0'; COUNTS=[2,2,3,6,2,3,7,6,9]
CROSS={1:[1],2:[2],3:[3,4],4:[5,6,7],5:[8,9,10,11,12,13],6:[14,15],7:[16,17,18],8:[19,20,21,22,23,24,25],9:[26,27],10:[28,29,30,31],11:[32,33,34,35,36,37,38,39,40]}
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
def main():
 classic=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00','')); assert len(classic['segments'])==11
 reverse={leaf:classic for classic,leaves in CROSS.items() for leaf in leaves}; segs=[]; sections=[]
 for section,expected in enumerate(COUNTS,1):
  d=fetch(API.format(section=section)); he=d.get('he') or []; en=d.get('text') or []
  if d.get('ref')!=f'Likutei Moharan 34:{section}' or len(he)!=expected or len(en)!=expected: raise RuntimeError(f'Sefaria section {section} changed')
  prev='Likutei Moharan 33:9' if section==1 else f'Likutei Moharan 34:{section-1}'; nxt='Likutei Moharan 35:1' if section==9 else f'Likutei Moharan 34:{section+1}'
  if d.get('prev')!=prev or d.get('next')!=nxt: raise RuntimeError(f'Sefaria boundary {section} changed: {d.get("prev")} {d.get("next")}')
  sections.append(d)
  for leaf,(rh,re_) in enumerate(zip(he,en),1):
   hn,e=plain(rh),plain(re_)
   if not hn or not e: raise RuntimeError(f'empty 34:{section}:{leaf}')
   index=len(segs)+1; cs=reverse[index]
   segs.append({'index':index,'sourceSection':section,'sourceComment':leaf,'sourceRef':f'Likutei Moharan 34:{section}:{leaf}','provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English','he':MARKS.sub('',hn),'he_nikud':hn,'en':e,'rawSource':{'he':rh,'en':re_},'classicSegment':cs,'classicSegments':[cs]})
 probe=fetch(API.format(section=10))
 if (probe.get('he') or []) or (probe.get('text') or []) or probe.get('prev')!='Likutei Moharan 34:9' or probe.get('next')!='Likutei Moharan 35:1': raise RuntimeError('upper-bound probe changed')
 first,last=sections[0],sections[-1]
 payload={'id':'super-lm-1-34-study','book':'likutay-moharan','part':1,'torah':34,'displayNumber':'34','title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic.get('keyVerse'),'keyVerseTranslation':segs[0]['en'],'keyVerseRef':classic.get('keyVerseRef'),'themes':classic.get('themes',[]),'segments':segs,'structuralNotes':[],'totalPassages':40,'productionAlignedPassages':40,'productionDisplayRecords':40,'sefariaSections':9,'sefariaSectionCounts':COUNTS,'sefariaPassages':40,'classicFileSegments':11,'classicInScopeSegments':11,'restoredBilingualSupplements':0,'structuralRestorations':0,'hasEnglish':True,'hasNikud':True,'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria)','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)'},'source':{'sefariaRef':'Likutei Moharan 34:1-9','apiPattern':API,'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':first.get('ref'),'prev':first.get('prev'),'lastRef':last.get('ref'),'lastNext':last.get('next'),'versionTitle':first.get('versionTitle'),'license':first.get('license'),'versionSource':first.get('versionSource'),'heVersionTitle':first.get('heVersionTitle'),'heLicense':first.get('heLicense'),'heVersionSource':first.get('heVersionSource'),'versions':first.get('versions',[]),'upperBoundProbe':'Likutei Moharan 34:10'},'alignmentNotes':['Exactly 40 licensed bilingual Sefaria leaves; no supplement or structural restoration.','The 11-key Classic crosswalk is frozen by the Torah 34 production audit.']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print('Prepared Torah 34: 40 exact bilingual Sefaria leaves across sections 1–9.')
if __name__=='__main__': main()
