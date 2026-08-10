#!/usr/bin/env python3
"""Import the frozen 90-leaf Torah 19 bilingual Sefaria witness."""
from __future__ import annotations
import html,json,re
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/reader/super/likutay-moharan/1/19/torah-study.json'
CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-19.json'
COUNTS=[3,1,19,8,10,3,3,9,34]
API='https://www.sefaria.org/api/texts/Likutei_Moharan.19.{section}?context=0&commentary=0'
MARKS=re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
PRIMARY=[1,2,4,6]+[8]*19+[10]+[11]*7+[13]*3+[14]*7+[16]*3+[18]*3+[20]*9+[22]*2+[23]*3+[24]*3+[25]*2+[26]*8+[28]*2+[29]*3+[30]*4+[31]+[32]*3+[33]+[34]*2
MERGED={3:[3,4],4:[5,6],5:[7,8],24:[9,10],32:[12,13],42:[15,16],45:[17,18],48:[19,20],57:[21,22],74:[26,27]}
def plain(value): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',value or ''))).strip()
def main():
 classic=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00',''))
 if len(classic.get('segments',[]))!=34: raise RuntimeError('Classic Torah 19 must contain exactly 34 physical segments')
 if len(PRIMARY)!=90: raise RuntimeError(f'Internal crosswalk length is {len(PRIMARY)}, expected 90')
 raw=[]
 for section,count in enumerate(COUNTS,1):
  response=requests.get(API.format(section=section),timeout=45); response.raise_for_status(); data=response.json()
  he,en=list(data.get('he') or []),list(data.get('text') or [])
  if data.get('ref')!=f'Likutei Moharan 19:{section}' or len(he)!=count or len(en)!=count: raise RuntimeError(f'Frozen Sefaria count/ref changed at section {section}')
  if section==1 and data.get('prev')!='Likutei Moharan 18:8': raise RuntimeError('Frozen previous boundary changed')
  expected_next=f'Likutei Moharan 19:{section+1}' if section<9 else 'Likutei Moharan 20:1'
  if data.get('next')!=expected_next: raise RuntimeError(f'Frozen next boundary changed at section {section}')
  raw.append(data)
 passages=[]
 for section,data in enumerate(raw,1):
  for comment,(raw_he,raw_en) in enumerate(zip(data['he'],data['text']),1):
   he_nikud,en=plain(raw_he),plain(raw_en)
   if not he_nikud or not en: raise RuntimeError(f'Empty canonical leaf 19:{section}:{comment}')
   passages.append({'sourceSection':section,'sourceComment':comment,'sourceRef':f'Likutei Moharan 19:{section}:{comment}','provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English','he':MARKS.sub('',he_nikud),'he_nikud':he_nikud,'en':en,'rawSource':{'he':raw_he,'en':raw_en}})
 if len(passages)!=90: raise RuntimeError('Frozen Torah 19 production alignment must equal 90')
 for index,(item,classic_segment) in enumerate(zip(passages,PRIMARY),1):
  item['index']=index; item['classicSegment']=classic_segment
  if index in MERGED: item['classicSegments']=MERGED[index]
 if passages[0]['sourceRef']!='Likutei Moharan 19:1:1' or passages[-1]['sourceRef']!='Likutei Moharan 19:9:34': raise RuntimeError('Frozen ref boundaries changed')
 if plain(passages[66]['rawSource']['he'])!='וְזֶה:' or len(plain(passages[66]['rawSource']['en']))<200: raise RuntimeError('19:9:11 tiny-Hebrew/expanded-English anomaly changed')
 if passages[73].get('classicSegments')!=[26,27]: raise RuntimeError('19:9:18 omissions-heading merge missing')
 first=raw[0]
 payload={'id':'super-lm-1-19-study','book':'likutay-moharan','part':1,'torah':19,'displayNumber':'19','title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic['keyVerse'],'keyVerseTranslation':passages[0]['en'],'keyVerseRef':classic.get('keyVerseRef') or 'Habakkuk 3','themes':classic.get('themes',[]),'segments':passages,'totalPassages':90,'productionAlignedPassages':90,'sefariaSections':9,'sefariaSectionCounts':COUNTS,'sefariaPassages':90,'classicFileSegments':34,'classicInScopeSegments':34,'restoredBilingualSupplements':0,'hasEnglish':True,'hasNikud':True,'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria)','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)'},'source':{'sefariaRef':'Likutei Moharan 19:1-9','sefariaSourceRanges':[f'Likutei Moharan 19:{s}:1-{n}' for s,n in enumerate(COUNTS,1)],'apiPattern':API,'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':first.get('ref'),'prev':first.get('prev'),'lastNext':raw[-1].get('next'),'versionTitle':first.get('versionTitle'),'license':first.get('license'),'versionSource':first.get('versionSource'),'heVersionTitle':first.get('heVersionTitle'),'heLicense':first.get('heLicense'),'heVersionSource':first.get('heVersionSource'),'versions':first.get('versions',[])},'alignmentNotes':['The visible bilingual witness is exactly the 90 licensed Sefaria leaves; no synthetic restoration is inserted.','19:9:11 intentionally retains its tiny Hebrew leaf and expanded licensed English editorial bridge.','Standalone Classic headings are merged only through the explicit classicSegments crosswalk; 19:9:18 carries Classic segments 26 and 27.','The 70 shifted legacy Classic aligned_segments are not used as a bilingual witness.']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Prepared Torah 19: 90 Sefaria bilingual leaves across 9 sections; exact 34-Classic crosswalk; no synthetic restoration.')
if __name__=='__main__': main()
