#!/usr/bin/env python3
"""Import frozen 45-leaf Torah 24 bilingual Sefaria witness and separate Hebrew structural note."""
import html,json,re
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/reader/super/likutay-moharan/1/24/torah-study.json';CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-24.json';COUNTS=[3,5,2,3,3,4,3,5,7,10];API='https://www.sefaria.org/api/texts/Likutei_Moharan.24.{section}?context=0&commentary=0';MARKS=re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
def plain(v):return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',v or ''))).strip()
def classic(s):return {1:None,2:4,3:5,4:6,5:7,6:8,7:9,8:10,9:11,10:12}[s]
def main():
 c=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00',''));assert len(c['segments'])==12;raw=[]
 for sec,n in enumerate(COUNTS,1):
  d=requests.get(API.format(section=sec),timeout=45).json();he,en=d.get('he') or [],d.get('text') or []
  if d.get('ref')!=f'Likutei Moharan 24:{sec}' or len(he)!=n or len(en)!=n:raise RuntimeError(f'Sefaria changed {sec}')
  if sec==1 and d.get('prev')!='Likutei Moharan 23:13':raise RuntimeError('prev')
  if d.get('next')!=(f'Likutei Moharan 24:{sec+1}' if sec<10 else 'Likutei Moharan 25:1'):raise RuntimeError('next')
  raw.append(d)
 segs=[]
 for sec,d in enumerate(raw,1):
  for leaf,(rh,re_) in enumerate(zip(d['he'],d['text']),1):
   hn,en=plain(rh),plain(re_);ref=f'Likutei Moharan 24:{sec}:{leaf}';cs=(1 if leaf==1 else 3) if sec==1 else classic(sec)
   if not hn or not en:raise RuntimeError('empty')
   segs.append({'index':len(segs)+1,'sourceSection':sec,'sourceComment':leaf,'sourceRef':ref,'provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English','he':MARKS.sub('',hn),'he_nikud':hn,'en':en,'rawSource':{'he':rh,'en':re_},'classicSegment':cs})
 first=raw[0];note={'type':'structuralNote','afterAlignedPassage':1,'classicSegment':2,'he':'(לשון רבנו זכרונו לברכה):','en':None,'source':'/reader/likutay-moharan/part-1/torah-24.json#segment-2'}
 payload={'id':'super-lm-1-24-study','book':'likutay-moharan','part':1,'torah':24,'displayNumber':'24','title':c['title'],'hebrewTitle':c['hebrewTitle'],'keyVerse':c.get('keyVerse'),'keyVerseTranslation':segs[0]['en'],'keyVerseRef':c.get('keyVerseRef'),'themes':c.get('themes',[]),'segments':segs,'structuralNotes':[note],'totalPassages':45,'productionAlignedPassages':45,'productionDisplayRecords':46,'sefariaSections':10,'sefariaSectionCounts':COUNTS,'sefariaPassages':45,'classicFileSegments':12,'classicInScopeSegments':12,'restoredBilingualSupplements':0,'structuralRestorations':1,'hasEnglish':True,'hasNikud':True,'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria)','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)'},'source':{'sefariaRef':'Likutei Moharan 24:1-10','apiPattern':API,'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':first.get('ref'),'prev':first.get('prev'),'lastNext':raw[-1].get('next'),'versionTitle':first.get('versionTitle'),'license':first.get('license'),'versionSource':first.get('versionSource'),'heVersionTitle':first.get('heVersionTitle'),'heLicense':first.get('heLicense'),'heVersionSource':first.get('heVersionSource'),'versions':first.get('versions',[])},'alignmentNotes':['45 licensed bilingual leaves; separate Hebrew-only structural note after passage 1.','The section 9 brace-spanning editorial block remains raw.','Shifted Classic aligned_segments are unused.']};OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n');print('Prepared Torah 24: 45 Sefaria bilingual leaves + 1 separate Hebrew-only structural note.')
if __name__=='__main__':main()
