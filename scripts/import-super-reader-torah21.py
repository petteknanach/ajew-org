#!/usr/bin/env python3
"""Import the frozen 102-leaf Torah 21 bilingual Sefaria witness."""
from __future__ import annotations
import html,json,re
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/reader/super/likutay-moharan/1/21/torah-study.json'
CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-21.json'
COUNTS=[4,5,4,7,3,11,6,7,4,5,16,5,5,8,2,4,1,5]
API='https://www.sefaria.org/api/texts/Likutei_Moharan.21.{section}?context=0&commentary=0'
MARKS=re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
PRIMARY=[2,3]+[5]*2+[7]*5+[9]*4+[10]*2+[11]*5+[12]*3+[13]*2+[14]*4+[15]*5+[17]*6+[19]*7+[20]*3+[21]+[22]*5+[23]*4+[24]*11+[25]+[26]*25+[27]*5
MERGED={1:[1,2],3:[4,5],5:[6,7],10:[8,9],35:[16,17],41:[18,19]}
def plain(value): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',value or ''))).strip()
def main():
 classic=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00',''))
 if len(classic.get('segments',[]))!=27 or len(PRIMARY)!=102: raise RuntimeError('Frozen Classic/crosswalk count changed')
 raw=[]
 for section,count in enumerate(COUNTS,1):
  response=requests.get(API.format(section=section),timeout=45); response.raise_for_status(); data=response.json()
  he,en=list(data.get('he') or []),list(data.get('text') or [])
  if data.get('ref')!=f'Likutei Moharan 21:{section}' or len(he)!=count or len(en)!=count: raise RuntimeError(f'Frozen Sefaria count/ref changed at section {section}')
  if section==1 and data.get('prev')!='Likutei Moharan 20:10': raise RuntimeError('Frozen previous boundary changed')
  expected_next=f'Likutei Moharan 21:{section+1}' if section<18 else 'Likutei Moharan 22:1'
  if data.get('next')!=expected_next: raise RuntimeError(f'Frozen next boundary changed at section {section}')
  raw.append(data)
 passages=[]
 for section,data in enumerate(raw,1):
  for comment,(raw_he,raw_en) in enumerate(zip(data['he'],data['text']),1):
   he_nikud,en=plain(raw_he),plain(raw_en)
   if not he_nikud or not en: raise RuntimeError(f'Empty canonical leaf 21:{section}:{comment}')
   passages.append({'sourceSection':section,'sourceComment':comment,'sourceRef':f'Likutei Moharan 21:{section}:{comment}','provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English','he':MARKS.sub('',he_nikud),'he_nikud':he_nikud,'en':en,'rawSource':{'he':raw_he,'en':raw_en}})
 for index,(item,classic_segment) in enumerate(zip(passages,PRIMARY),1):
  item['index']=index; item['classicSegment']=classic_segment
  if index in MERGED: item['classicSegments']=MERGED[index]
 if len(passages)!=102 or passages[0]['sourceRef']!='Likutei Moharan 21:1:1' or passages[-1]['sourceRef']!='Likutei Moharan 21:18:5': raise RuntimeError('Frozen production boundaries changed')
 anomaly=passages[25]
 if anomaly['sourceRef']!='Likutei Moharan 21:6:3' or not plain(anomaly['rawSource']['en']).startswith('{') or 'mo st tru st ed' not in plain(anomaly['rawSource']['en']) or anomaly['classicSegment']!=14: raise RuntimeError('21:6:3 editorial anomaly changed')
 first=raw[0]
 payload={'id':'super-lm-1-21-study','book':'likutay-moharan','part':1,'torah':21,'displayNumber':'21','title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic['keyVerse'],'keyVerseTranslation':passages[0]['en'],'keyVerseRef':classic.get('keyVerseRef'),'themes':classic.get('themes',[]),'segments':passages,'totalPassages':102,'productionAlignedPassages':102,'sefariaSections':18,'sefariaSectionCounts':COUNTS,'sefariaPassages':102,'classicFileSegments':27,'classicInScopeSegments':27,'restoredBilingualSupplements':0,'hasEnglish':True,'hasNikud':True,'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria)','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)'},'source':{'sefariaRef':'Likutei Moharan 21:1-18','sefariaSourceRanges':[f'Likutei Moharan 21:{s}:1-{n}' for s,n in enumerate(COUNTS,1)],'apiPattern':API,'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':first.get('ref'),'prev':first.get('prev'),'lastNext':raw[-1].get('next'),'versionTitle':first.get('versionTitle'),'license':first.get('license'),'versionSource':first.get('versionSource'),'heVersionTitle':first.get('heVersionTitle'),'heLicense':first.get('heLicense'),'heVersionSource':first.get('heVersionSource'),'versions':first.get('versions',[])},'alignmentNotes':['The visible bilingual witness is exactly the 102 licensed Sefaria leaves; no synthetic restoration is inserted.','21:6:3 intentionally preserves its brace-delimited Numbers 12 editorial quotation, source typo, raw Hebrew/English, and source ref as one leaf.','Standalone Classic headings are represented only through the explicit merged crosswalk.','The corrupted 27 legacy Classic aligned_segments are not used as a bilingual witness.']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Prepared Torah 21: 102 Sefaria bilingual leaves across 18 sections; exact 27-Classic crosswalk; no synthetic restoration.')
if __name__=='__main__': main()
