#!/usr/bin/env python3
"""Import the frozen Torah 23 Sefaria witness plus exact Classic/Rashi supplement."""
from __future__ import annotations
import html,json,re
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/reader/super/likutay-moharan/1/23/torah-study.json'; CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-23.json'
COUNTS=[20,3,11,8,23,17,3,7,3,4,1,1,2]; API='https://www.sefaria.org/api/texts/Likutei_Moharan.23.{section}?context=0&commentary=0'; MARKS=re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
SUP={'type':'classicSupplement','afterSefariaRef':'Likutei Moharan 23:1:8','classicSegment':3,'he':'רש"י: מלי דכדיבי. דבר כזב: כדניתא. פרדה: תלא פתקא. שטר בצוארו של הולד: הי נינהו מלי דכדיבי. אלו הם דברי כזב: סילותא. שליא:','en':'[Rashi: Words of falsehood – lies. kadnaysah – mule. Hanging a piskah – a document on the offspring’s neck. These are the words of falsehood – lies. silusah – placenta.]','source':'/reader/likutay-moharan/part-1/torah-23.json#segments-3-5','sefariaRef':None}
def plain(v): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',v or ''))).strip()
def classic_for(ref):
 s,l=map(int,ref.split(':')[1:]);
 if s==1 and l==1:return 2
 if s==1 and l<=8:return 2
 if s==1:return 5 if l==9 else 6
 ranges=[(2,7),(3,8),(4,9)];
 if s in (2,3,4):return dict(ranges)[s]
 if s==5:return 10 if l<=3 else 11
 if s==6:return 12 if l<=3 else 13
 if s in (7,8):return 14
 return {9:15,10:16,11:17,12:17,13:17}[s]
def main():
 classic=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00','')); assert len(classic['segments'])==17
 raw=[]
 for s,n in enumerate(COUNTS,1):
  d=requests.get(API.format(section=s),timeout=45).json(); he,en=d.get('he') or [],d.get('text') or []
  if d.get('ref')!=f'Likutei Moharan 23:{s}' or len(he)!=n or len(en)!=n: raise RuntimeError(f'frozen Sefaria section changed: {s}')
  if s==1 and d.get('prev')!='Likutei Moharan 22:21': raise RuntimeError('previous boundary changed')
  if d.get('next')!=(f'Likutei Moharan 23:{s+1}' if s<13 else 'Likutei Moharan 24:1'): raise RuntimeError(f'next boundary changed: {s}')
  raw.append(d)
 segs=[]
 for s,d in enumerate(raw,1):
  for l,(rh,re_) in enumerate(zip(d['he'],d['text']),1):
   ref=f'Likutei Moharan 23:{s}:{l}'; hn,en=plain(rh),plain(re_)
   if not hn or not en: raise RuntimeError(f'empty {ref}')
   item={'sourceSection':s,'sourceComment':l,'sourceRef':ref,'provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English','he':MARKS.sub('',hn),'he_nikud':hn,'en':en,'rawSource':{'he':rh,'en':re_},'classicSegment':classic_for(ref)}
   if ref=='Likutei Moharan 23:1:1': item['classicSegments']=[1,2,4]
   segs.append(item)
   if ref==SUP['afterSefariaRef']:
    x=dict(SUP); x.update({'sourceRef':'Classic supplement: Torah 23 Rashi','provenance':'Local Classic printed Rashi gloss; exact Hebrew segment 3 and English boundary sequence segments 3–5','he_nikud':SUP['he'],'rawSource':{'he':SUP['he'],'en':SUP['en']},'classicSupplement':True}); segs.append(x)
 for i,x in enumerate(segs,1):x['index']=i
 if len(segs)!=104 or segs[8].get('classicSupplement') is not True: raise RuntimeError('production supplement/count mismatch')
 first=raw[0]; payload={'id':'super-lm-1-23-study','book':'likutay-moharan','part':1,'torah':23,'displayNumber':'23','title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic.get('keyVerse'),'keyVerseTranslation':segs[9]['en'],'keyVerseRef':classic.get('keyVerseRef'),'themes':classic.get('themes',[]),'segments':segs,'totalPassages':104,'productionAlignedPassages':104,'sefariaSections':13,'sefariaSectionCounts':COUNTS,'sefariaPassages':103,'classicFileSegments':17,'classicInScopeSegments':17,'restoredBilingualSupplements':1,'hasEnglish':True,'hasNikud':True,'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria)','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)'},'source':{'sefariaRef':'Likutei Moharan 23:1-13','apiPattern':API,'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':first.get('ref'),'prev':first.get('prev'),'lastNext':raw[-1].get('next'),'versionTitle':first.get('versionTitle'),'license':first.get('license'),'versionSource':first.get('versionSource'),'heVersionTitle':first.get('heVersionTitle'),'heLicense':first.get('heLicense'),'heVersionSource':first.get('heVersionSource'),'versions':first.get('versions',[])},'alignmentNotes':['103 licensed Sefaria leaves plus one exact separately attributed Classic/Rashi supplement.','Raw source markup, braces, duplication, spaced typos, and edition-order merge are retained.','Shifted Classic aligned_segments are not used as the bilingual witness.']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print('Prepared Torah 23: 103 Sefaria leaves + 1 exact Classic/Rashi supplement = 104 bilingual passages.')
if __name__=='__main__':main()
