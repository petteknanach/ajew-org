#!/usr/bin/env python3
"""Apply frozen Torah 23 commentary, prayer, Nanach, registry, and availability repairs."""
import json,re
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/23'
AV={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
def load(p):return json.loads(Path(p).read_text(encoding='utf-8-sig').replace('\x00',''))
def dump(p,d):Path(p).parent.mkdir(parents=True,exist_ok=True);Path(p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def main():
 study=load(BASE/'torah-study.json'); segs=study['segments']
 # Pettek: preserve authored text, expose only genuinely present languages, crosswalk by Classic segment.
 pp=ROOT/'public/reader/pettek-nanach-commentary/torah-23.json'; p=load(pp)
 if len(p['segments'])!=17:raise RuntimeError('Pettek count changed')
 for x in p['segments']:
  actual={layer:{lang:bool(str((x.get('layers',{}).get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in AV}
  if actual!=AV:raise RuntimeError(f'Pettek availability changed at {x["index"]}')
  matched=[s['index'] for s in segs if int(s.get('classicSegment',0))==int(x['relatedSegment']) or int(x['relatedSegment']) in s.get('classicSegments',[])]
  if not matched:raise RuntimeError(f'unmapped Pettek {x["index"]}')
  x['alignedPassage']=matched[0];x['alignedPassages']=matched
 p.update({'totalSegments':17,'inScopeRecords':17,'layerAvailability':AV,'superReaderCoverageNote':'All 17 records are in scope. Beginner is English-only, intermediate bilingual, scholarly Hebrew-only; unavailable translations are not fabricated.'});dump(pp,p)
 # Biur is truthfully unavailable.
 dump(BASE/'biur-halikutim.json',{'id':'bhl-23-unavailable','book':'biur-halikutim','part':1,'torah':23,'segments':[],'totalSegments':0,'hasEnglish':False,'availability':'unavailable','reason':'No canonical local Torah 23 Biur HaLikutim package was found in the audited semantic sequence.'})
 # Parparos exact irregular indices, Hebrew only.
 src=load(ROOT/'public/reader/parparos-lechochma/section-24.json'); inds=[2,3,5,6,8,10,12,14,16,18,20,22,24,25,27,29,31]
 if src.get('title')!='סימן כ"ג' or [int(x['index']) for x in src['segments']]!=inds:raise RuntimeError('Parparos source changed')
 out=[]
 for i,x in enumerate(src['segments'],1):
  if not str(x.get('he') or '').strip():raise RuntimeError('empty Parparos')
  out.append({'index':i,'sourceIndex':int(x['index']),'sourceSection':24,'sourceIdentity':f'section-24.json#index={x["index"]}','he':x['he'].strip(),'en':''})
 dump(BASE/'parparos-lechochma.json',{'id':'plc-23-super','book':'parparos-lechochma','part':1,'torah':23,'title':src['title'],'hebrewTitle':src.get('hebrewTitle'),'sourceSection':24,'sourceId':src.get('id'),'segments':out,'totalParagraphs':17,'totalSegments':17,'hasEnglish':False,'sourceFile':'public/reader/parparos-lechochma/section-24.json','superReaderMetadataRepair':'Normalized irregular physical indices 2,3,5,6,...31; retained all 17 Hebrew records and excluded unsafe shifted/cross-Torah English.'})
 # Prayer from exact paired HTML containers.
 hp=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_23_prayer23.html'; soup=BeautifulSoup(hp.read_text(encoding='utf-8'),'html.parser'); dates=[x.get_text(' ',strip=True).replace('\xa0',' ') for x in soup.select('.date-bar')]
 if len(dates)!=1 or '23rd of Cheshvan' not in dates[0] or soup.select('.special-bar'):raise RuntimeError(f'prayer bars changed {dates}')
 prayers=[];ids=[f'p23{chr(97+i)}' for i in range(12)]
 for i,div in enumerate(soup.select('div.para'),1):
  h=div.select_one('.heb-text'); ep=div.find('p',recursive=False)
  if not h or not ep or h.get('id')!=ids[i-1]:raise RuntimeError(f'prayer pairing {i}')
  clone=BeautifulSoup(str(ep),'html.parser')
  for n in clone.select('.heb-btn,.heb-text'):n.decompose()
  he=h.get_text(' ',strip=True);en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True))
  if not he or not en or 'עברית ▾' in en:raise RuntimeError(f'unclean prayer {i}')
  prayers.append({'index':i,'sourceId':h['id'],'he':he,'he_nikud':he,'en':en})
 if len(prayers)!=12:raise RuntimeError('prayer count')
 oldp=ROOT/'public/reader/likutay-tefilos/part-1/prayer-23.json'; old=load(oldp);nav=old.get('navigation') or {'prevUrl':'/reader/likutay-tefilos/1/22','nextUrl':'/reader/likutay-tefilos/1/24'}
 dump(oldp,{'id':'lt-1-23','book':'likutay-tefilos','part':1,'torah':23,'displayNumber':23,'title':'Prayer Twenty-Three','hebrewTitle':'תפילה כג','segments':prayers,'aligned_segments':prayers,'totalParagraphs':12,'totalSegments':12,'hasEnglish':True,'navigation':nav,'superReaderRepairSource':str(hp.relative_to(ROOT)),'excludedMetadata':{'dateBars':1,'dateBarText':dates,'specialBars':0,'reason':'The date bar is metadata, not a prayer record'}})
 # Nanach exact physical indices.
 np=ROOT/'public/reader/likutay-nanach/volume-4/chapter-25.json'; nd=load(np); by={int(x['index']):x for x in nd['segments']}; ninds=[14,15,16,17,18,19,21,22,23,24,25,26,27,28,29,30,31]
 if by[13]['he'].strip()!='תורה כג' or by[20]['he'].strip()!='תורה כג.' or by[32]['he'].strip()!='תורה כד':raise RuntimeError('Nanach boundaries changed')
 ns=[]
 for i,n in enumerate(ninds,1):
  x=dict(by[n]);x.update({'index':i,'sourceFile':'volume-4/chapter-25.json','sourceIndex':n,'sourceIdentity':f'volume-4/chapter-25.json#index={n}'}); 
  if not x.get('he') or x.get('en'):raise RuntimeError(f'Nanach language {n}')
  ns.append(x)
 dump(BASE/'likutay-nanach.json',{'id':'likutay-nanach-torah-23','book':'likutay-nanach','part':1,'torah':23,'title':'ליקוטי ננח — תורה כג','segments':ns,'totalSegments':17,'hasEnglish':False,'sourceSlice':{'file':'volume-4/chapter-25.json','indices':ninds},'excludedBoundaries':[13,20,32]})
 # Commentary discovery: no Biur association; corrected bounded Nanach.
 rp=ROOT/'src/data/lm-commentaries.json'; reg=load(rp); rel=reg['1']['23']['related_commentaries']; rel[:]=[x for x in rel if x.get('book')!='biur-halikutim']; nn=[x for x in rel if x.get('book')=='likutay-nanach']
 if len(nn)!=1:raise RuntimeError('Nanach association count')
 nn[0].update({'section':'chapter-25-torah-23-slice','sectionNumber':25,'sectionTitle':'תורה כג','url':'/reader/super/likutay-moharan/1/23/likutay-nanach.json','sourceIndices':ninds,'totalRecords':17,'superReaderBoundaryNote':'Chapter 25 headings at 13 and 20 are excluded; substantive indices 14–19 and 21–31; stop before Torah 24 heading 32. Stale chapter 27 is unrelated.'});dump(rp,reg)
 print('Repaired Torah 23: Pettek 17 asymmetric, Biur unavailable, Parparos 17 HE-only, prayer 12 bilingual, Nanach 17 HE-only, registry corrected.')
if __name__=='__main__':main()
