#!/usr/bin/env python3
"""Import the frozen Torah 30 bilingual Sefaria witness plus Hebrew-only Classic Rashi restoration."""
import html, json, re
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/reader/super/likutay-moharan/1/30/torah-study.json'
CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-30.json'
API='https://www.sefaria.org/api/texts/Likutei_Moharan.30.{section}?context=0&commentary=0'
COUNTS=[8,4,12,4,7,13,9,10,12,3]
MARKS=re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
KNOWN_TAGS=re.compile(r'</?(?:i|b|em|strong|span|small|sup|br)(?:\s[^>]*)?>',re.I)
def plain(v): return re.sub(r'\s+',' ',html.unescape(KNOWN_TAGS.sub('',v or ''))).strip()
def classic_segment(s,l):
 if s==1:
  if l<=5: return 1
  if l==6: return 3
  return 4
 if s==2: return 5
 if s==3: return 6 if l<=5 else 7 if l<=8 else 8
 return {4:9,5:10,6:11,7:12,8:13}[s] if s<=8 else (14 if l<=11 else 15) if s==9 else 16
def main():
 classic=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00',''))
 if len(classic['segments'])!=16: raise RuntimeError('Classic Torah 30 witness changed')
 restoration=classic['segments'][1]
 she=plain(restoration.get('he')); she_nikud=plain(restoration.get('he_nikud') or restoration.get('he'))
 if not she.startswith('רש"י: במאי קטלי לה') or not she.endswith('וקוצצין אותה:'): raise RuntimeError('Classic Rashi restoration changed')
 segments=[]; sections=[]
 for section,expected in enumerate(COUNTS,1):
  data=requests.get(API.format(section=section),timeout=45).json(); he=data.get('he') or []; en=data.get('text') or []
  if data.get('ref')!=f'Likutei Moharan 30:{section}' or len(he)!=expected or len(en)!=expected: raise RuntimeError(f'Sefaria Torah 30 section {section} changed')
  prev='Likutei Moharan 29:12' if section==1 else f'Likutei Moharan 30:{section-1}'; nxt='Likutei Moharan 31:1' if section==10 else f'Likutei Moharan 30:{section+1}'
  if data.get('prev')!=prev or data.get('next')!=nxt: raise RuntimeError(f'Sefaria boundary changed at section {section}')
  sections.append(data)
  for leaf,(rh,re_) in enumerate(zip(he,en),1):
   hn,english=plain(rh),plain(re_)
   if not hn or not english: raise RuntimeError(f'empty 30:{section}:{leaf}')
   segments.append({'index':len(segments)+1,'sourceSection':section,'sourceComment':leaf,'sourceRef':f'Likutei Moharan 30:{section}:{leaf}','provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English','he':MARKS.sub('',hn),'he_nikud':hn,'en':english,'rawSource':{'he':rh,'en':re_},'classicSegment':classic_segment(section,leaf)})
   if section==1 and leaf==5:
    segments.append({'index':len(segments)+1,'sourceSection':1,'sourceComment':'classic-structural-restoration','sourceRef':'Classic Torah 30 physical segment 2','provenance':'Local Classic Hebrew-only Rashi structural restoration; separately sourced, not attributed to Sefaria/BRI','he':she,'he_nikud':she_nikud,'en':'','rawSource':{'he':restoration.get('he_nikud') or restoration.get('he'),'en':''},'classicSegment':2,'supplementType':'hebrew-only-classic-rashi-structural-restoration'})
 for i,z in enumerate(segments,1): z['index']=i
 probe=requests.get(API.format(section=11),timeout=45).json()
 if (probe.get('he') or []) or (probe.get('text') or []) or probe.get('prev')!='Likutei Moharan 30:10' or probe.get('next')!='Likutei Moharan 31:1': raise RuntimeError('section 11 upper-bound probe changed')
 if len(segments)!=83: raise RuntimeError('display count')
 first,last=sections[0],sections[-1]
 payload={'id':'super-lm-1-30-study','book':'likutay-moharan','part':1,'torah':30,'displayNumber':'30','title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic.get('keyVerse'),'keyVerseTranslation':segments[0]['en'],'keyVerseRef':classic.get('keyVerseRef'),'themes':classic.get('themes',[]),'segments':segments,'structuralNotes':['One Hebrew-only Classic Rashi gloss is restored after 30:1:5; the shifted local English is withheld.'],'totalPassages':83,'productionAlignedPassages':82,'productionDisplayRecords':83,'sefariaSections':10,'sefariaSectionCounts':COUNTS,'sefariaPassages':82,'classicFileSegments':16,'classicInScopeSegments':16,'restoredBilingualSupplements':0,'structuralRestorations':1,'hasEnglish':True,'hasNikud':True,'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria); local Classic Hebrew restoration separately sourced','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)'},'source':{'sefariaRef':'Likutei Moharan 30:1-10','apiPattern':API,'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':first.get('ref'),'prev':first.get('prev'),'lastRef':last.get('ref'),'lastNext':last.get('next'),'versionTitle':first.get('versionTitle'),'license':first.get('license'),'versionSource':first.get('versionSource'),'heVersionTitle':first.get('heVersionTitle'),'heLicense':first.get('heLicense'),'heVersionSource':first.get('heVersionSource'),'versions':first.get('versions',[]),'upperBoundProbe':'Likutei Moharan 30:11'},'alignmentNotes':['Exactly 82 licensed bilingual Sefaria leaves plus one Hebrew-only Classic Rashi structural restoration after 30:1:5.','Classic segments establish the frozen coarse crosswalk; shifted coarse Classic English is unused.']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Prepared Torah 30: 82 exact bilingual Sefaria leaves plus 1 Hebrew-only Classic Rashi restoration (83 display records).')
if __name__=='__main__': main()
