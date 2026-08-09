#!/usr/bin/env python3
"""Import the frozen 124-leaf Torah 22 bilingual Sefaria witness."""
from __future__ import annotations
import html,json,re
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/reader/super/likutay-moharan/1/22/torah-study.json'
CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-22.json'
COUNTS=[8,6,2,6,11,3,7,3,7,23,6,9,12,4,1,1,1,1,1,1,11]
API='https://www.sefaria.org/api/texts/Likutei_Moharan.22.{section}?context=0&commentary=0'
MARKS=re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
CROSSWALK=[(1,1,1),(2,2,2),(3,8,3),(9,14,4),(15,16,5),(17,22,6),(23,33,7),(34,36,8),(37,43,9),(44,46,10),(47,47,11),(48,53,12),(54,60,13),(61,76,14),(77,82,15),(83,91,16),(92,106,17),(107,107,18),(108,108,19),(109,109,20),(110,110,21),(111,111,22),(112,112,23),(113,113,24),(114,116,25),(117,117,26),(118,124,27)]
PRIMARY=[classic for first,last,classic in CROSSWALK for _ in range(first,last+1)]
def plain(value): return re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',value or ''))).strip()
def main():
 classic=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00',''))
 if len(classic.get('segments',[]))!=27 or len(PRIMARY)!=124: raise RuntimeError('Frozen Classic/crosswalk count changed')
 raw=[]
 for section,count in enumerate(COUNTS,1):
  response=requests.get(API.format(section=section),timeout=45); response.raise_for_status(); data=response.json()
  he,en=list(data.get('he') or []),list(data.get('text') or [])
  if data.get('ref')!=f'Likutei Moharan 22:{section}' or len(he)!=count or len(en)!=count: raise RuntimeError(f'Frozen Sefaria count/ref changed at section {section}')
  if section==1 and data.get('prev')!='Likutei Moharan 21:18': raise RuntimeError('Frozen previous boundary changed')
  expected_next=f'Likutei Moharan 22:{section+1}' if section<21 else 'Likutei Moharan 23:1'
  if data.get('next')!=expected_next: raise RuntimeError(f'Frozen next boundary changed at section {section}: {data.get("next")}')
  raw.append(data)
 passages=[]
 for section,data in enumerate(raw,1):
  for comment,(raw_he,raw_en) in enumerate(zip(data['he'],data['text']),1):
   he_nikud,en=plain(raw_he),plain(raw_en)
   if not he_nikud or not en: raise RuntimeError(f'Empty canonical leaf 22:{section}:{comment}')
   passages.append({'sourceSection':section,'sourceComment':comment,'sourceRef':f'Likutei Moharan 22:{section}:{comment}','provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English','he':MARKS.sub('',he_nikud),'he_nikud':he_nikud,'en':en,'rawSource':{'he':raw_he,'en':raw_en}})
 for index,(item,classic_segment) in enumerate(zip(passages,PRIMARY),1): item.update({'index':index,'classicSegment':classic_segment})
 if len(passages)!=124 or passages[0]['sourceRef']!='Likutei Moharan 22:1:1' or passages[-1]['sourceRef']!='Likutei Moharan 22:21:11': raise RuntimeError('Frozen production boundaries changed')
 anomaly=passages[91]
 if anomaly['sourceRef']!='Likutei Moharan 22:13:1' or plain(anomaly['rawSource']['he'])!='וְזֶה פֵּרוּשׁ:' or len(plain(anomaly['rawSource']['en']))!=985 or '{Elazar the Small' not in plain(anomaly['rawSource']['en']) or anomaly['classicSegment']!=17: raise RuntimeError('22:13:1 editorial anomaly changed')
 for ref,needle in [('22:7:2','again st us'),('22:7:6','one st anding outside'),('22:12:1','de st ined')]:
  item=next(x for x in passages if x['sourceRef']==f'Likutei Moharan {ref}')
  if needle not in plain(item['rawSource']['en']): raise RuntimeError(f'{ref} visible source typo changed')
 first=raw[0]
 payload={'id':'super-lm-1-22-study','book':'likutay-moharan','part':1,'torah':22,'displayNumber':'22','title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic['keyVerse'],'keyVerseTranslation':passages[0]['en'],'keyVerseRef':classic.get('keyVerseRef'),'themes':classic.get('themes',[]),'segments':passages,'totalPassages':124,'productionAlignedPassages':124,'sefariaSections':21,'sefariaSectionCounts':COUNTS,'sefariaPassages':124,'classicFileSegments':27,'classicInScopeSegments':27,'restoredBilingualSupplements':0,'hasEnglish':True,'hasNikud':True,'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria)','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)'},'source':{'sefariaRef':'Likutei Moharan 22:1-21','sefariaSourceRanges':[f'Likutei Moharan 22:{s}:1-{n}' for s,n in enumerate(COUNTS,1)],'apiPattern':API,'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':first.get('ref'),'prev':first.get('prev'),'lastNext':raw[-1].get('next'),'versionTitle':first.get('versionTitle'),'license':first.get('license'),'versionSource':first.get('versionSource'),'heVersionTitle':first.get('heVersionTitle'),'heLicense':first.get('heLicense'),'heVersionSource':first.get('heVersionSource'),'versions':first.get('versions',[])},'alignmentNotes':['The visible bilingual witness is exactly the 124 licensed Sefaria leaves; no synthetic restoration is inserted.','Brace-delimited editorial context and visible source typos remain in their raw licensed leaves, especially the extreme 22:13:1 alignment anomaly.','All 27 Classic segments are synchronized through the frozen passage crosswalk.','The shifted 27 legacy Classic aligned_segments are not used as a bilingual witness.']}
 OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Prepared Torah 22: 124 Sefaria bilingual leaves across 21 sections; exact 27-Classic crosswalk; no synthetic restoration.')
if __name__=='__main__': main()
