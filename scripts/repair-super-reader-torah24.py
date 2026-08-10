#!/usr/bin/env python3
"""Apply frozen Torah 24 commentary, prayer, Nanach, registry, and language repairs."""
import json,re
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'public/reader/super/likutay-moharan/1/24';AV={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
def load(p):return json.loads(Path(p).read_text(encoding='utf-8-sig').replace('\x00',''))
def dump(p,d):Path(p).parent.mkdir(parents=True,exist_ok=True);Path(p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def main():
 study=load(BASE/'torah-study.json');segs=study['segments'];pp=ROOT/'public/reader/pettek-nanach-commentary/torah-24.json';p=load(pp)
 if len(p['segments'])!=12:raise RuntimeError('Pettek count')
 for z in p['segments']:
  actual={l:{k:bool(str((z['layers'].get(l) or {}).get(k) or '').strip()) for k in ('he','en')} for l in AV}
  if actual!=AV:raise RuntimeError(f'Pettek availability {z["index"]}')
  r=int(z['relatedSegment']);matched=[x['index'] for x in segs if x['classicSegment']==r]
  if r==2: z['alignedPassage']=1;z['alignedPassages']=[];z['structuralNote']=0
  else:
   if not matched:raise RuntimeError(f'crosswalk {r}')
   z['alignedPassage']=matched[0];z['alignedPassages']=matched
 p.update({'totalSegments':12,'inScopeRecords':12,'layerAvailability':AV,'superReaderCoverageNote':'All 12 records are in scope; Classic 2 maps to the Hebrew-only structural note. Beginner is EN-only, intermediate bilingual, scholarly HE-only.'});dump(pp,p)
 dump(BASE/'biur-halikutim.json',{'id':'bhl-24-unavailable','book':'biur-halikutim','part':1,'torah':24,'segments':[],'totalSegments':0,'hasEnglish':False,'availability':'unavailable','reason':'No canonical local Torah 24 Biur HaLikutim package exists; neighboring sections are unrelated.'})
 src=load(ROOT/'public/reader/parparos-lechochma/section-25.json');inds=list(range(2,31,2))
 if src.get('title')!='סימן כ"ד-אמצעותא דעלמא' or [int(z['index']) for z in src['segments']]!=inds:raise RuntimeError('Parparos source')
 out=[{'index':i,'sourceIndex':int(z['index']),'sourceSection':25,'sourceIdentity':f'section-25.json#index={z["index"]}','he':str(z.get('he') or '').strip(),'en':''} for i,z in enumerate(src['segments'],1)]
 if any(not z['he'] for z in out):raise RuntimeError('empty Parparos')
 dump(BASE/'parparos-lechochma.json',{'id':'plc-24-super','book':'parparos-lechochma','part':1,'torah':24,'title':src['title'],'sourceSection':25,'segments':out,'totalParagraphs':15,'totalSegments':15,'hasEnglish':False,'sourceFile':'public/reader/parparos-lechochma/section-25.json','superReaderMetadataRepair':'Normalized physical even indices 2–30 to 1–15; unsafe shifted/cross-Torah English excluded.'})
 hp=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_24_prayer24.html';soup=BeautifulSoup(hp.read_text(),'html.parser');dates=[z.get_text(' ',strip=True).replace('\xa0',' ') for z in soup.select('.date-bar')]
 if len(dates)!=1 or '25th of Cheshvan' not in dates[0]:raise RuntimeError(f'date bars {dates}')
 ids=[f'p24{chr(97+i)}' for i in range(4)];prs=[]
 for i,div in enumerate(soup.select('div.para'),1):
  h=div.select_one('.heb-text');ep=div.find('p',recursive=False)
  if not h or not ep or h.get('id')!=ids[i-1]:raise RuntimeError(f'prayer {i}')
  clone=BeautifulSoup(str(ep),'html.parser')
  for n in clone.select('.heb-btn,.heb-text'):n.decompose()
  he=h.get_text(' ',strip=True);en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True));prs.append({'index':i,'sourceId':h['id'],'he':he,'he_nikud':he,'en':en})
 if len(prs)!=4 or any(not z['he'] or not z['en'] or 'עברית ▾' in z['en'] for z in prs):raise RuntimeError('prayer blocks')
 op=ROOT/'public/reader/likutay-tefilos/part-1/prayer-24.json';old=load(op);nav=old.get('navigation') or {'prevUrl':'/reader/likutay-tefilos/1/23','nextUrl':'/reader/likutay-tefilos/1/25'};dump(op,{'id':'lt-1-24','book':'likutay-tefilos','part':1,'torah':24,'displayNumber':24,'title':'Prayer Twenty-Four','hebrewTitle':'תפילה כד','segments':prs,'aligned_segments':prs,'totalParagraphs':4,'totalSegments':4,'hasEnglish':True,'navigation':nav,'superReaderRepairSource':str(hp.relative_to(ROOT)),'excludedMetadata':{'dateBars':1,'dateBarText':dates,'reason':'Date bar is metadata, not prayer prose'}})
 np=ROOT/'public/reader/likutay-nanach/volume-4/chapter-25.json';nd=load(np);by={int(z['index']):z for z in nd['segments']};ninds=[33,35,36,37,38,39,40,41]
 if by[32]['he'].strip()!='תורה כד' or not by[34]['he'].strip().startswith('תורה כד:') or by[42]['he'].strip()!='תורה כה':raise RuntimeError('Nanach boundaries')
 ns=[]
 for i,n in enumerate(ninds,1):
  z=dict(by[n]);z.update({'index':i,'sourceFile':'volume-4/chapter-25.json','sourceIndex':n,'sourceIdentity':f'volume-4/chapter-25.json#index={n}'})
  if not z.get('he') or z.get('en'):raise RuntimeError(f'Nanach {n}')
  ns.append(z)
 dump(BASE/'likutay-nanach.json',{'id':'likutay-nanach-torah-24','book':'likutay-nanach','part':1,'torah':24,'title':'ליקוטי ננח — תורה כד','segments':ns,'totalSegments':8,'hasEnglish':False,'sourceSlice':{'file':'volume-4/chapter-25.json','indices':ninds},'excludedBoundaries':[32,34,42]})
 rp=ROOT/'src/data/lm-commentaries.json';reg=load(rp);rel=reg['1']['24']['related_commentaries'];rel[:]=[z for z in rel if z.get('book')!='biur-halikutim'];nn=[z for z in rel if z.get('book')=='likutay-nanach']
 if len(nn)!=1:raise RuntimeError('registry')
 nn[0].update({'section':'chapter-25-torah-24-slice','sectionNumber':25,'sectionTitle':'תורה כד','url':'/reader/super/likutay-moharan/1/24/likutay-nanach.json','sourceIndices':ninds,'totalRecords':8,'superReaderBoundaryNote':'Chapter 25 headings 32 and 34 are excluded; substantive indices 33 and 35–41; stop before Torah 25 heading 42. Stale chapter 28 is unrelated.'});dump(rp,reg);print('Repaired Torah 24: Pettek 12 asymmetric, Biur unavailable, Parparos 15 HE-only, prayer 4 bilingual, Nanach 8 HE-only, registry corrected.')
if __name__=='__main__':main()
