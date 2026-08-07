#!/usr/bin/env python3
"""Import frozen Torah 18 Sefaria witness, Rashbam supplement, and Hebrew close."""
from __future__ import annotations
import html, json, re
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/reader/super/likutay-moharan/1/18/torah-study.json'
CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-18.json'
COUNTS=[5,12,4,9,3,10,4,7]
API='https://www.sefaria.org/api/texts/Likutei_Moharan.18.{section}?context=0&commentary=0'
MARKS=re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
DOXOLOGY_START='עַד הֵנָּה עֲזָרוּנוּ רַחֲמֶיךָ'
RASHBAM_HE='רשב"ם: קרטליתא - ארגז: דמקרי בירשא - כך שמו: בר אמוראי - אדם שיודע לשוט במים: בעי דנשמטה לאטמא - שבקש לחתך ירכו: זרק לה חלא - חמץ, וברח מריחו לים: למשדיא בה - להצניע בו:'
RASHBAM_EN="(Rashi) Rashbam: Kartalisa - argaz (chest): that are called birsha - that is their name: bar Amora'ai - a man who knows how to swim in the waters: wanted to take off an atma (limb) - that sought to chop his thigh: threw to him vinegar - vinegar, and it fled from its smell to the sea: to put in it - to conceal in it."
PRIMARY=[1,2,4,6,7,7,9,9,9,10,10,10,10,11,11,12,12,12,14,15,15,15,17,17,17,17,17,18,18,18,18,20,20,20,22,22,22,22,22,22,22,22,22,22,24,24,24,24,26,26,26,26,26,26,27]
MERGED={3:[3,4],4:[5,6],7:[8,9],19:[13,14],23:[16,17],32:[19,20],35:[21,22],45:[23,24],49:[25,26]}

def plain(value): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',value or ''))).strip()

def main():
 classic=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00',''))
 if len(classic.get('segments',[]))!=29: raise RuntimeError('Classic Torah 18 must contain 29 physical segments')
 if plain(classic['segments'][1].get('he'))!=RASHBAM_HE or plain(classic['segments'][1].get('en'))!=RASHBAM_EN: raise RuntimeError('Frozen Classic Rashbam text changed')
 if 'ספרא דצניעותא' not in plain(classic['segments'][28].get('he')): raise RuntimeError('Classic 29 Torah 19 boundary changed')
 raw=[]
 for section,count in enumerate(COUNTS,1):
  response=requests.get(API.format(section=section),timeout=45); response.raise_for_status(); data=response.json()
  he,en=list(data.get('he') or []),list(data.get('text') or [])
  if data.get('ref')!=f'Likutei Moharan 18:{section}' or len(he)!=count or len(en)!=count: raise RuntimeError(f'Frozen Sefaria count/ref changed at section {section}')
  expected_next=f'Likutei Moharan 18:{section+1}' if section<8 else 'Likutei Moharan 19:1'
  if data.get('next')!=expected_next: raise RuntimeError(f'Frozen next boundary changed at section {section}')
  raw.append(data)
 passages=[]; edition_close=None
 for section,data in enumerate(raw,1):
  for comment,(raw_he,raw_en) in enumerate(zip(data['he'],data['text']),1):
   visible_raw_he=raw_he
   if section==8 and comment==7:
    if DOXOLOGY_START not in raw_he: raise RuntimeError('Torah 18 doxology boundary changed')
    visible_raw_he,doxology_raw=raw_he.split(DOXOLOGY_START,1)
    doxology_raw=DOXOLOGY_START+doxology_raw
    edition_close={'kind':'hebrew-only-edition-close','classicSegment':28,'sourceRef':'Likutei Moharan 18:8:7 (untranslated remainder)','provenance':'Untouched Hebrew remainder of the raw Sefaria leaf; no English witness supplied','he':MARKS.sub('',plain(doxology_raw)),'he_nikud':plain(doxology_raw),'en':'','rawSource':{'he':doxology_raw}}
   he_nikud,en=plain(visible_raw_he),plain(raw_en)
   if not he_nikud or not en: raise RuntimeError(f'Empty canonical leaf 18:{section}:{comment}')
   item={'sourceSection':section,'sourceComment':comment,'sourceRef':f'Likutei Moharan 18:{section}:{comment}','provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English','he':MARKS.sub('',he_nikud),'he_nikud':he_nikud,'en':en,'rawSource':{'he':raw_he,'en':raw_en}}
   passages.append(item)
   if section==1 and comment==1:
    passages.append({'sourceSection':None,'sourceComment':'Rashbam supplement','sourceRef':None,'provenance':'Exact Classic segment 2 Rashbam supplement absent from Sefaria','sourceCitation':'Rashbam gloss printed with Bava Batra 74a','insertedSupplement':True,'he':RASHBAM_HE,'he_nikud':RASHBAM_HE,'en':RASHBAM_EN})
 if len(passages)!=55 or edition_close is None: raise RuntimeError('Frozen Torah 18 production alignment failed')
 for index,(item,classic_segment) in enumerate(zip(passages,PRIMARY),1):
  item['index']=index; item['classicSegment']=classic_segment
  if index in MERGED: item['classicSegments']=MERGED[index]
 if passages[1].get('sourceRef') is not None or passages[-1]['sourceRef']!='Likutei Moharan 18:8:7': raise RuntimeError('Rashbam/ref order mismatch')
 if any(not x.get('he') or not x.get('en') for x in passages): raise RuntimeError('Every aligned passage must be bilingual')
 if not edition_close['he'].startswith('עד הנה עזרונו רחמיך') or not edition_close['he'].endswith('בריך שמה לעלא מן כל ברכתא ושירתא:'): raise RuntimeError('Hebrew close clipping failed')
 first=raw[0]
 payload={'id':'super-lm-1-18-study','book':'likutay-moharan','part':1,'torah':18,'displayNumber':'18','title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic['keyVerse'],'keyVerseTranslation':passages[0]['en'],'keyVerseRef':'Bava Batra 74a','themes':classic.get('themes',[]),'segments':passages,'editionClose':edition_close,'totalPassages':55,'sefariaSections':8,'sefariaSectionCounts':COUNTS,'sefariaPassages':54,'classicFileSegments':29,'classicInScopeSegments':28,'restoredBilingualSupplements':1,'hasEnglish':True,'hasNikud':True,'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria)','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)','supplement':'Exact Classic segment 2 / Rashbam bilingual gloss'},'source':{'sefariaRef':'Likutei Moharan 18:1-8','sefariaSourceRanges':[f'Likutei Moharan 18:{s}:1-{n}' for s,n in enumerate(COUNTS,1)],'apiPattern':API,'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':first.get('ref'),'prev':first.get('prev'),'lastNext':raw[-1].get('next'),'versionTitle':first.get('versionTitle'),'license':first.get('license'),'versionSource':first.get('versionSource'),'heVersionTitle':first.get('heVersionTitle'),'heLicense':first.get('heLicense'),'heVersionSource':first.get('heVersionSource'),'versions':first.get('versions',[])},'alignmentNotes':['Visible bilingual witness is 54 Sefaria leaves plus the exact restored Rashbam gloss.','The visible Hebrew of 18:8:7 is clipped to its translated bracketed note; its untranslated close is retained separately as Hebrew-only edition material.','Classic segment 29 is the Torah 19 heading and is excluded.']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Prepared Torah 18: 54 Sefaria bilingual leaves + exact Rashbam supplement = 55 aligned passages; clipped 18:8:7 and retained Classic 28 doxology Hebrew-only; excluded Classic 29.')
if __name__=='__main__': main()
