#!/usr/bin/env python3
"""Import frozen Torah 25 bilingual Sefaria witness plus the exact Classic Rashi supplement."""
import html,json,re
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/reader/super/likutay-moharan/1/25/torah-study.json'
CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-25.json'
COUNTS=[10,2,5,22,1,3,3,3,1]
API='https://www.sefaria.org/api/texts/Likutei_Moharan.25.{section}?context=0&commentary=0'
MARKS=re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
def plain(v): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',v or ''))).strip()
def classic(sec,leaf):
 if sec==1: return 1 if leaf==1 else (3 if leaf==2 else 4)
 return {2:5,3:6,4:7,5:9,6:10,7:11,8:12,9:13}[sec] if not (sec==4 and leaf>=16) else 8
def main():
 c=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00','')); assert len(c['segments'])==13
 raw=[]
 for sec,n in enumerate(COUNTS,1):
  d=requests.get(API.format(section=sec),timeout=45).json(); he,en=d.get('he') or [],d.get('text') or []
  if d.get('ref')!=f'Likutei Moharan 25:{sec}' or len(he)!=n or len(en)!=n: raise RuntimeError(f'Sefaria changed {sec}')
  if sec==1 and d.get('prev')!='Likutei Moharan 24:10': raise RuntimeError('prev')
  if d.get('next')!=(f'Likutei Moharan 25:{sec+1}' if sec<9 else 'Likutei Moharan 26:1'): raise RuntimeError(f'next {sec}: {d.get("next")}')
  raw.append(d)
 segs=[]
 for sec,d in enumerate(raw,1):
  for leaf,(rh,re_) in enumerate(zip(d['he'],d['text']),1):
   hn,en=plain(rh),plain(re_); ref=f'Likutei Moharan 25:{sec}:{leaf}'
   if not hn or not en: raise RuntimeError(f'empty {ref}')
   segs.append({'index':len(segs)+1,'sourceSection':sec,'sourceComment':leaf,'sourceRef':ref,'provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English','he':MARKS.sub('',hn),'he_nikud':hn,'en':en,'rawSource':{'he':rh,'en':re_},'classicSegment':classic(sec,leaf)})
   if sec==1 and leaf==1:
    segs.append({'index':2,'type':'classicSupplement','afterSefariaRef':'Likutei Moharan 25:1:1','sourceSection':1,'sourceComment':None,'sourceRef':None,'provenance':'Exact separately attributed Classic printed-Rashi supplement','he':'רש"י: אחוי לן מנא דלא שויא לחבלא, הראנו כלי שאינו שוה ההפסד שהוא מפסיד: בודיא, מחצלת: לא עיל בתרעא, שהיה ארך ורחב יותר מן הפתח: איתו מרא וסתרו, בנין הפתח והכתל עד שיכנס:','he_nikud':'רש"י: אחוי לן מנא דלא שויא לחבלא, הראנו כלי שאינו שוה ההפסד שהוא מפסיד: בודיא, מחצלת: לא עיל בתרעא, שהיה ארך ורחב יותר מן הפתח: איתו מרא וסתרו, בנין הפתח והכתל עד שיכנס:','en':'[Rashi: Show us a vessel that is not worth the chabalah [damage] it causes – a vessel whose value is less than the harm it inflicts. budyah – a mat. Did not enter the gate – it was too long and wide for the opening. Bring a marah and sisru – break down the opening and the wall to let it pass.]','rawSource':None,'classicSegment':2,'source':'/reader/likutay-moharan/part-1/torah-25.json#segments-2-3'})
 # Reindex because the insertion shifts all later Sefaria leaves.
 for i,z in enumerate(segs,1): z['index']=i
 first=raw[0]
 payload={'id':'super-lm-1-25-study','book':'likutay-moharan','part':1,'torah':25,'displayNumber':'25','title':c['title'],'hebrewTitle':c['hebrewTitle'],'keyVerse':c.get('keyVerse'),'keyVerseTranslation':segs[0]['en'],'keyVerseRef':c.get('keyVerseRef'),'themes':c.get('themes',[]),'segments':segs,'structuralNotes':[],'totalPassages':51,'productionAlignedPassages':51,'productionDisplayRecords':51,'sefariaSections':9,'sefariaSectionCounts':COUNTS,'sefariaPassages':50,'classicFileSegments':13,'classicInScopeSegments':13,'restoredBilingualSupplements':1,'structuralRestorations':0,'hasEnglish':True,'hasNikud':True,'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria; Classic supplement separately attributed)','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria; Classic supplement separately attributed)'},'source':{'sefariaRef':'Likutei Moharan 25:1-9','apiPattern':API,'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':first.get('ref'),'prev':first.get('prev'),'lastNext':raw[-1].get('next'),'versionTitle':first.get('versionTitle'),'license':first.get('license'),'versionSource':first.get('versionSource'),'heVersionTitle':first.get('heVersionTitle'),'heLicense':first.get('heLicense'),'heVersionSource':first.get('heVersionSource'),'versions':first.get('versions',[])},'alignmentNotes':['50 licensed bilingual Sefaria leaves plus one exact separately attributed Classic printed-Rashi supplement.','The Classic supplement follows 25:1:1 and is not attributed to Sefaria.','Shifted coarse Classic English is otherwise unused.']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n'); print('Prepared Torah 25: 50 Sefaria leaves + 1 exact bilingual Classic Rashi supplement (51 passages).')
if __name__=='__main__': main()
