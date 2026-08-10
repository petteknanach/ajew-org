#!/usr/bin/env python3
"""Import the frozen 78-leaf Torah 20 bilingual Sefaria witness."""
from __future__ import annotations
import html,json,re
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/reader/super/likutay-moharan/1/20/torah-study.json'
CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-20.json'
COUNTS=[8,4,2,8,10,2,1,1,3,39]
API='https://www.sefaria.org/api/texts/Likutei_Moharan.20.{section}?context=0&commentary=0'
MARKS=re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
PRIMARY=[2,3]+[5]*6+[7]*4+[9]*2+[11]*4+[12]*2+[13]*2+[15]*2+[16]*8+[18]*2+[20,22]+[24]*3+[26]+[27]*18+[28]*19+[29]
MERGED={1:[1,2],3:[4,5],9:[6,7],13:[8,9],15:[10,11],23:[14,15],33:[17,18],35:[19,20],36:[21,22],37:[23,24],40:[25,26]}
def plain(value): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',value or ''))).strip()
def main():
 classic=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00',''))
 if len(classic.get('segments',[]))!=29: raise RuntimeError('Classic Torah 20 must contain exactly 29 physical segments')
 if len(PRIMARY)!=78: raise RuntimeError(f'Internal crosswalk length is {len(PRIMARY)}, expected 78')
 raw=[]
 for section,count in enumerate(COUNTS,1):
  response=requests.get(API.format(section=section),timeout=45); response.raise_for_status(); data=response.json()
  he,en=list(data.get('he') or []),list(data.get('text') or [])
  if data.get('ref')!=f'Likutei Moharan 20:{section}' or len(he)!=count or len(en)!=count: raise RuntimeError(f'Frozen Sefaria count/ref changed at section {section}')
  if section==1 and data.get('prev')!='Likutei Moharan 19:9': raise RuntimeError('Frozen previous boundary changed')
  expected_next=f'Likutei Moharan 20:{section+1}' if section<10 else 'Likutei Moharan 21:1'
  if data.get('next')!=expected_next: raise RuntimeError(f'Frozen next boundary changed at section {section}')
  raw.append(data)
 passages=[]
 for section,data in enumerate(raw,1):
  for comment,(raw_he,raw_en) in enumerate(zip(data['he'],data['text']),1):
   he_nikud,en=plain(raw_he),plain(raw_en)
   if not he_nikud or not en: raise RuntimeError(f'Empty canonical leaf 20:{section}:{comment}')
   passages.append({'sourceSection':section,'sourceComment':comment,'sourceRef':f'Likutei Moharan 20:{section}:{comment}','provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English','he':MARKS.sub('',he_nikud),'he_nikud':he_nikud,'en':en,'rawSource':{'he':raw_he,'en':raw_en}})
 if len(passages)!=78: raise RuntimeError('Frozen Torah 20 production alignment must equal 78')
 for index,(item,classic_segment) in enumerate(zip(passages,PRIMARY),1):
  item['index']=index; item['classicSegment']=classic_segment
  if index in MERGED: item['classicSegments']=MERGED[index]
 if passages[0]['sourceRef']!='Likutei Moharan 20:1:1' or passages[-1]['sourceRef']!='Likutei Moharan 20:10:39': raise RuntimeError('Frozen ref boundaries changed')
 if not plain(passages[39]['rawSource']['he']).startswith('יא') or passages[39].get('classicSegments')!=[25,26]: raise RuntimeError('20:10:1 heading disagreement changed')
 if plain(passages[40]['rawSource']['he'])!='וְזֶהוּ:' or len(plain(passages[40]['rawSource']['en']))<800 or 'mi st reated' not in plain(passages[40]['rawSource']['en']): raise RuntimeError('20:10:2 anomaly changed')
 first=raw[0]
 payload={'id':'super-lm-1-20-study','book':'likutay-moharan','part':1,'torah':20,'displayNumber':'20','title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic['keyVerse'],'keyVerseTranslation':passages[0]['en'],'keyVerseRef':classic.get('keyVerseRef'),'themes':classic.get('themes',[]),'segments':passages,'totalPassages':78,'productionAlignedPassages':78,'sefariaSections':10,'sefariaSectionCounts':COUNTS,'sefariaPassages':78,'classicFileSegments':29,'classicInScopeSegments':29,'restoredBilingualSupplements':0,'hasEnglish':True,'hasNikud':True,'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria)','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)'},'source':{'sefariaRef':'Likutei Moharan 20:1-10','sefariaSourceRanges':[f'Likutei Moharan 20:{s}:1-{n}' for s,n in enumerate(COUNTS,1)],'apiPattern':API,'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':first.get('ref'),'prev':first.get('prev'),'lastNext':raw[-1].get('next'),'versionTitle':first.get('versionTitle'),'license':first.get('license'),'versionSource':first.get('versionSource'),'heVersionTitle':first.get('heVersionTitle'),'heLicense':first.get('heLicense'),'heVersionSource':first.get('heVersionSource'),'versions':first.get('versions',[])},'alignmentNotes':['The visible bilingual witness is exactly the 78 licensed Sefaria leaves; no synthetic restoration is inserted.','20:10:1 preserves raw Sefaria Hebrew יא and records the Classic י heading disagreement through classicSegments 25 and 26.','20:10:2 intentionally retains its tiny Hebrew leaf and expanded licensed English editorial bridge, including source wording.','The 67 shifted legacy Classic aligned_segments are not used as a bilingual witness.']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Prepared Torah 20: 78 Sefaria bilingual leaves across 10 sections; exact 29-Classic crosswalk; no synthetic restoration.')
if __name__=='__main__': main()
