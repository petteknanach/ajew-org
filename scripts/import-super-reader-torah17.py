#!/usr/bin/env python3
"""Import the frozen Torah 17 Sefaria witness and restore Classic segment 28."""
from __future__ import annotations
import html, json, re
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/reader/super/likutay-moharan/1/17/torah-study.json'
CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-17.json'
COUNTS=[28,3,5,3,16,11,4,16,13]
API='https://www.sefaria.org/api/texts/Likutei_Moharan.17.{section}?context=0&commentary=0'
MARKS=re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
RASHBAM_EN=('Rashbam: “a light creature” means one of the small creatures of the sea; '
 '“to the mouth of the Leviathan” means that it would eat me today; “the sea-goat” '
 'refers to the teaching that everything found on land is also found in the sea, except '
 'the weasel (Chullin); shin parsah means three hundred parasangs; and “that stirs '
 'things up” means that it digs through the sea with its horns in search of food.')
RANGES={
 1:[(1,1,1),(2,2,3),(3,22,4),(23,28,5)],
 2:[(1,3,7)],3:[(1,5,8)],4:[(1,2,9),(3,3,10)],
 5:[(1,4,12),(5,8,13),(9,10,14),(11,14,15),(15,16,16)],
 6:[(1,2,17),(3,5,18),(6,6,19),(7,7,20),(8,8,21),(9,10,22),(11,11,23)],
 7:[(1,2,24),(3,3,25),(4,4,26)],
 8:[(1,2,27),(3,3,29),(4,7,30),(8,11,31),(12,16,32)],
 9:[(1,4,34),(5,8,35),(9,13,36)],
}
HEADING_SEGMENTS={3:[2,3],7:[6,7],12:[11,12],34:[33,34]}

def plain(value): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',value or ''))).strip()
def classic_for(section,comment):
 for start,end,classic in RANGES[section]:
  if start<=comment<=end:return classic
 raise RuntimeError(f'No Classic crosswalk for 17:{section}:{comment}')

def main():
 classic=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00',''))
 if len(classic.get('segments',[]))!=36: raise RuntimeError('Classic Torah 17 must contain exactly 36 coarse segments')
 raw=[]
 for section,count in enumerate(COUNTS,1):
  response=requests.get(API.format(section=section),timeout=45); response.raise_for_status(); data=response.json()
  he,en=list(data.get('he') or []),list(data.get('text') or [])
  if data.get('ref')!=f'Likutei Moharan 17:{section}' or len(he)!=count or len(en)!=count:
   raise RuntimeError(f'Frozen Sefaria count/ref changed at section {section}')
  expected_next=f'Likutei Moharan 17:{section+1}' if section<9 else 'Likutei Moharan 18:1'
  if data.get('next')!=expected_next: raise RuntimeError(f'Frozen next boundary changed at section {section}')
  raw.append(data)
 passages=[]
 for section,data in enumerate(raw,1):
  for comment,(raw_he,raw_en) in enumerate(zip(data['he'],data['text']),1):
   he_nikud,en=plain(raw_he),plain(raw_en)
   if not he_nikud or not en: raise RuntimeError(f'Empty canonical leaf 17:{section}:{comment}')
   classic_segment=classic_for(section,comment)
   item={'sourceSection':section,'sourceComment':comment,'sourceRef':f'Likutei Moharan 17:{section}:{comment}',
    'classicSegment':classic_segment,'provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English',
    'he':MARKS.sub('',he_nikud),'he_nikud':he_nikud,'en':en,'rawSource':{'he':raw_he,'en':raw_en}}
   if classic_segment in HEADING_SEGMENTS and comment==RANGES[section][0][0]: item['classicSegments']=HEADING_SEGMENTS[classic_segment]
   # Exact heading-bearing leaves that are not the first tuple in their section.
   if (section,comment,classic_segment) in {(1,2,3),(2,1,7),(5,1,12),(9,1,34)}: item['classicSegments']=HEADING_SEGMENTS[classic_segment]
   passages.append(item)
   if section==8 and comment==2:
    rashbam_he=plain(classic['segments'][27]['he'])
    if not rashbam_he.startswith('רשב"ם: בריה קלה'): raise RuntimeError('Classic segment 28 Rashbam source changed')
    passages.append({'sourceSection':None,'sourceComment':'Rashbam supplement','sourceRef':None,'classicSegment':28,
     'provenance':'Classic segment 28 Hebrew; natural English translation repaired from the shifted printed Classic witness; mixed-provenance supplement absent from Sefaria',
     'sourceCitation':'Rashbam gloss printed with Bava Batra 74a','insertedSupplement':True,
     'he':rashbam_he,'he_nikud':rashbam_he,'en':RASHBAM_EN})
 for index,item in enumerate(passages,1): item['index']=index
 if len(passages)!=100 or sum(x.get('sourceRef') is not None for x in passages)!=99: raise RuntimeError('Frozen 100-passage alignment failed')
 supplement=passages[sum(COUNTS[:7])+2]
 if supplement.get('classicSegment')!=28 or supplement.get('sourceRef') is not None: raise RuntimeError('Rashbam insertion point failed')
 if any(not x.get('he') or not x.get('en') for x in passages): raise RuntimeError('Every production passage must be bilingual')
 first=raw[0]
 payload={'id':'super-lm-1-17-study','book':'likutay-moharan','part':1,'torah':17,'displayNumber':'17',
  'title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic['keyVerse'],'keyVerseTranslation':passages[0]['en'],
  'keyVerseRef':classic.get('keyVerseRef','Genesis 42:35-36'),'themes':classic.get('themes',[]),'segments':passages,
  'totalPassages':100,'sefariaSections':9,'sefariaSectionCounts':COUNTS,'sefariaPassages':99,'classicSegments':36,
  'restoredBilingualSupplements':1,'hasEnglish':True,'hasNikud':True,
  'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria)','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)','supplement':'Classic segment 28 / Rashbam gloss; mixed provenance'},
  'source':{'sefariaRef':'Likutei Moharan 17:1-9','sefariaSourceRanges':[f'Likutei Moharan 17:{s}:1-{n}' for s,n in enumerate(COUNTS,1)],
   'apiPattern':API,'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':first.get('ref'),'prev':first.get('prev'),'lastNext':raw[-1].get('next'),
   'versionTitle':first.get('versionTitle'),'license':first.get('license'),'versionSource':first.get('versionSource'),
   'heVersionTitle':first.get('heVersionTitle'),'heLicense':first.get('heLicense'),'heVersionSource':first.get('heVersionSource'),'versions':first.get('versions',[])},
  'alignmentNotes':['The legacy 110-record alignment is not used.','Classic heading-only records 2, 6, 11, and 33 are represented on heading-bearing bilingual leaves and never emitted as empty passages.']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Prepared Torah 17: 99 Sefaria bilingual leaves plus one restored bilingual Rashbam gloss (100 passages; section vector [28, 3, 5, 3, 16, 11, 4, 16, 13]).')
if __name__=='__main__': main()
