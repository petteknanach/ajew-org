#!/usr/bin/env python3
"""Import the frozen Torah 31 bilingual Sefaria witness plus exact bilingual Classic Rashi supplement."""
import html, json, re, time
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/reader/super/likutay-moharan/1/31/torah-study.json'
CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-31.json'
API='https://www.sefaria.org/api/texts/Likutei_Moharan.31.{section}?context=0&commentary=0'
COUNTS=[5,7,2,4,6,5,3,4,9,9,3,8,11,4,10,2,10,6]
MARKS=re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
KNOWN_TAGS=re.compile(r'</?(?:i|b|em|strong|span|small|sup|br)(?:\s[^>]*)?>',re.I)
def plain(v): return re.sub(r'\s+',' ',html.unescape(KNOWN_TAGS.sub('',v or ''))).strip()
def fetch(section):
 url=API.format(section=section); last=None
 for attempt in range(6):
  try:
   response=requests.get(url,timeout=60,headers={'User-Agent':'ajew.org Super Reader source audit/1.0'}); response.raise_for_status(); return response.json()
  except (requests.RequestException,ValueError) as exc:
   last=exc
   if attempt<5: time.sleep(2**attempt)
 raise RuntimeError(f'Sefaria request failed after retries: {url}: {last}')
def classic_keys(s,l):
 if s==1:
  if l==1:return [1]
  if l==2:return [3,4]
  return [4]
 if s==2:return [5] if l==1 else [6]
 if s==3:return [7]
 if s==4:return [8]
 if s==5:return [9] if l<=3 else [10] if l==4 else [11]
 if s==6:return [12]
 if s==7:return [13]
 if s==8:return [14]
 if s==9:return [15]
 if s==10:return [16] if l<=7 else [17]
 if s==11:return [18]
 if s==12:return [19]
 if s==13:return [19] if l<=4 else [19,20] if l==5 else [20]
 if s==14:return [21]
 if s==15:return [22]
 if s==16:return [23]
 if s==17:return [24]
 if s==18:return [24] if l<=4 else [25] if l==5 else [25,26]
 raise RuntimeError((s,l))
def main():
 classic=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00',''))
 if len(classic['segments'])!=26: raise RuntimeError('Classic Torah 31 witness changed')
 c1,c2,c3=classic['segments'][:3]
 she=plain(c2.get('he')); she_nikud=plain(c2.get('he_nikud') or c2.get('he'))
 if not she.startswith('רש"י: דפארי. סבין') or not she.endswith('אף אני לא אעשה שאלתכם:'): raise RuntimeError('Classic Rashi Hebrew changed')
 e1,e2,e3=(c1.get('en') or ''),(c2.get('en') or ''),(c3.get('en') or '')
 if '[Rashi:' not in e1 or plain(e2)!='Make for me a rope from bran.' or 'And if you do not fulfill my request, I too will not fulfill your request.]' not in e3: raise RuntimeError('Classic Rashi English fragments changed')
 supplement_en=plain(e1[e1.index('[Rashi:'):])+' '+plain(e2)+' '+plain(e3[:e3.index('And if you do not fulfill my request, I too will not fulfill your request.]')+len('And if you do not fulfill my request, I too will not fulfill your request.]')])
 segments=[]; sections=[]
 for section,expected in enumerate(COUNTS,1):
  data=fetch(section); he=data.get('he') or []; en=data.get('text') or []
  if data.get('ref')!=f'Likutei Moharan 31:{section}' or len(he)!=expected or len(en)!=expected: raise RuntimeError(f'Sefaria Torah 31 section {section} changed')
  prev='Likutei Moharan 30:10' if section==1 else f'Likutei Moharan 31:{section-1}'; nxt='Likutei Moharan 32:1' if section==18 else f'Likutei Moharan 31:{section+1}'
  if data.get('prev')!=prev or data.get('next')!=nxt: raise RuntimeError(f'Sefaria boundary changed at section {section}')
  sections.append(data)
  for leaf,(rh,re_) in enumerate(zip(he,en),1):
   hn,english=plain(rh),plain(re_)
   if not hn or not english: raise RuntimeError(f'empty 31:{section}:{leaf}')
   keys=classic_keys(section,leaf); primary=4 if (section,leaf)==(1,2) else 20 if (section,leaf)==(13,5) else 25 if (section,leaf)==(18,6) else keys[-1]
   segments.append({'index':len(segments)+1,'sourceSection':section,'sourceComment':leaf,'sourceRef':f'Likutei Moharan 31:{section}:{leaf}','provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English','he':MARKS.sub('',hn),'he_nikud':hn,'en':english,'rawSource':{'he':rh,'en':re_},'classicSegment':primary,'classicSegments':keys})
   if section==1 and leaf==1:
    segments.append({'index':len(segments)+1,'sourceSection':1,'sourceComment':'classic-bilingual-supplement','sourceRef':'Classic Torah 31 physical segments 1–3, exact bounded Rashi fragments','provenance':'Local Classic bilingual Rashi supplement; separately sourced, not attributed to Sefaria/BRI','he':she,'he_nikud':she_nikud,'en':supplement_en,'rawSource':{'he':c2.get('he_nikud') or c2.get('he'),'enFragments':[e1[e1.index('[Rashi:'):],e2,e3[:e3.index('And if you do not fulfill my request, I too will not fulfill your request.]')+len('And if you do not fulfill my request, I too will not fulfill your request.]')]]},'classicSegment':2,'classicSegments':[2],'supplementType':'bilingual-classic-rashi-supplement','classicSourceIndices':[1,2,3]})
 for i,z in enumerate(segments,1): z['index']=i
 probe=fetch(19)
 if (probe.get('he') or []) or (probe.get('text') or []) or probe.get('prev')!='Likutei Moharan 31:18' or probe.get('next')!='Likutei Moharan 32:1': raise RuntimeError('section 19 upper-bound probe changed')
 if len(segments)!=109: raise RuntimeError('display count')
 first,last=sections[0],sections[-1]
 payload={'id':'super-lm-1-31-study','book':'likutay-moharan','part':1,'torah':31,'displayNumber':'31','title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic.get('keyVerse'),'keyVerseTranslation':segments[0]['en'],'keyVerseRef':classic.get('keyVerseRef'),'themes':classic.get('themes',[]),'segments':segments,'structuralNotes':['One exact bilingual Classic Rashi gloss is restored after 31:1:1 from bounded fragments in physical records 1–3.'],'totalPassages':109,'productionAlignedPassages':109,'productionDisplayRecords':109,'sefariaSections':18,'sefariaSectionCounts':COUNTS,'sefariaPassages':108,'classicFileSegments':26,'classicInScopeSegments':26,'restoredBilingualSupplements':1,'structuralRestorations':0,'hasEnglish':True,'hasNikud':True,'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria); local Classic bilingual supplement separately sourced','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria); local Classic bilingual supplement separately sourced'},'source':{'sefariaRef':'Likutei Moharan 31:1-18','apiPattern':API,'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':first.get('ref'),'prev':first.get('prev'),'lastRef':last.get('ref'),'lastNext':last.get('next'),'versionTitle':first.get('versionTitle'),'license':first.get('license'),'versionSource':first.get('versionSource'),'heVersionTitle':first.get('heVersionTitle'),'heLicense':first.get('heLicense'),'heVersionSource':first.get('heVersionSource'),'versions':first.get('versions',[]),'upperBoundProbe':'Likutei Moharan 31:19'},'alignmentNotes':['Exactly 108 licensed bilingual Sefaria leaves plus one exact bilingual Classic Rashi supplement after 31:1:1.','Merged Sefaria leaves at 31:1:2, 31:13:5, and 31:18:6 retain all applicable Classic keys.']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Prepared Torah 31: 108 exact bilingual Sefaria leaves plus 1 exact bilingual Classic Rashi supplement (109 records).')
if __name__=='__main__': main()
