#!/usr/bin/env python3
"""Import the frozen Torah 29 bilingual Sefaria witness plus exact Classic Rashi supplement."""
import html, json, re
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/reader/super/likutay-moharan/1/29/torah-study.json'
CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-29.json'
API='https://www.sefaria.org/api/texts/Likutei_Moharan.29.{section}?context=0&commentary=0'
COUNTS=[5,3,11,9,8,5,3,2,8,1,14,6]
MARKS=re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
KNOWN_TAGS=re.compile(r'</?(?:i|b|em|strong|span|small|sup|br)(?:\s[^>]*)?>',re.I)
def plain(v): return re.sub(r'\s+',' ',html.unescape(KNOWN_TAGS.sub('',v or ''))).strip()
def classic_segment(s,l):
 if s==1: return 1 if l==1 else 3 if l==2 else 4
 if s==2: return 5
 if s==3: return 6
 if s==4: return 7
 if s==5: return 8 if l<=3 else 9
 return {6:10,7:11,8:12,9:13,10:14,11:15,12:16}[s]
def main():
 classic=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00',''))
 if len(classic['segments'])!=16: raise RuntimeError('Classic Torah 29 witness changed')
 supplement=classic['segments'][1]
 she=plain(supplement.get('he')); she_nikud=plain(supplement.get('he_nikud') or supplement.get('he')); sen=plain(supplement.get('en'))
 if not she.startswith('רש"י: דמדליה מנה') or not sen.startswith('Rashi: To a place higher than her'): raise RuntimeError('Classic Rashi supplement changed')
 segments=[]; sections=[]
 for section,expected in enumerate(COUNTS,1):
  data=requests.get(API.format(section=section),timeout=45).json(); he=data.get('he') or []; en=data.get('text') or []
  if data.get('ref')!=f'Likutei Moharan 29:{section}' or len(he)!=expected or len(en)!=expected: raise RuntimeError(f'Sefaria Torah 29 section {section} changed')
  prev='Likutei Moharan 28:6' if section==1 else f'Likutei Moharan 29:{section-1}'; nxt='Likutei Moharan 30:1' if section==12 else f'Likutei Moharan 29:{section+1}'
  if data.get('prev')!=prev or data.get('next')!=nxt: raise RuntimeError(f'Sefaria boundary changed at section {section}')
  sections.append(data)
  for leaf,(rh,re_) in enumerate(zip(he,en),1):
   hn,english=plain(rh),plain(re_)
   if not hn or not english: raise RuntimeError(f'empty 29:{section}:{leaf}')
   segments.append({'index':len(segments)+1,'sourceSection':section,'sourceComment':leaf,'sourceRef':f'Likutei Moharan 29:{section}:{leaf}','provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English','he':MARKS.sub('',hn),'he_nikud':hn,'en':english,'rawSource':{'he':rh,'en':re_},'classicSegment':classic_segment(section,leaf)})
   if section==1 and leaf==1:
    segments.append({'index':2,'sourceSection':1,'sourceComment':'classic-supplement','sourceRef':'Classic Torah 29 physical segment 2','provenance':'Local Classic bilingual Rashi supplement; separately sourced, not attributed to Sefaria/BRI','he':she,'he_nikud':she_nikud,'en':sen,'rawSource':{'he':supplement.get('he_nikud') or supplement.get('he'),'en':supplement.get('en')},'classicSegment':2,'supplementType':'exact-bilingual-classic-rashi'})
 for i,z in enumerate(segments,1): z['index']=i
 probe=requests.get(API.format(section=13),timeout=45).json()
 if (probe.get('he') or []) or (probe.get('text') or []) or probe.get('prev')!='Likutei Moharan 29:12' or probe.get('next')!='Likutei Moharan 30:1': raise RuntimeError('section 13 upper-bound probe changed')
 if len(segments)!=76: raise RuntimeError('display count')
 first,last=sections[0],sections[-1]
 payload={'id':'super-lm-1-29-study','book':'likutay-moharan','part':1,'torah':29,'displayNumber':'29','title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic.get('keyVerse'),'keyVerseTranslation':segments[0]['en'],'keyVerseRef':classic.get('keyVerseRef'),'themes':classic.get('themes',[]),'segments':segments,'structuralNotes':[],'totalPassages':76,'productionAlignedPassages':76,'productionDisplayRecords':76,'sefariaSections':12,'sefariaSectionCounts':COUNTS,'sefariaPassages':75,'classicFileSegments':16,'classicInScopeSegments':16,'restoredBilingualSupplements':1,'structuralRestorations':0,'hasEnglish':True,'hasNikud':True,'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria); local Classic supplement separately sourced','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria); local Classic supplement separately sourced'},'source':{'sefariaRef':'Likutei Moharan 29:1-12','apiPattern':API,'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':first.get('ref'),'prev':first.get('prev'),'lastRef':last.get('ref'),'lastNext':last.get('next'),'versionTitle':first.get('versionTitle'),'license':first.get('license'),'versionSource':first.get('versionSource'),'heVersionTitle':first.get('heVersionTitle'),'heLicense':first.get('heLicense'),'heVersionSource':first.get('heVersionSource'),'versions':first.get('versions',[]),'upperBoundProbe':'Likutei Moharan 29:13'},'alignmentNotes':['Exactly 75 licensed bilingual Sefaria leaves plus one exact local Classic bilingual Rashi supplement after 29:1:1.','Classic segments establish the frozen coarse crosswalk; shifted coarse Classic English is otherwise unused.']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Prepared Torah 29: 75 exact bilingual Sefaria leaves plus 1 Classic Rashi supplement (76 records).')
if __name__=='__main__': main()
