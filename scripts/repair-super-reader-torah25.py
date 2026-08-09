#!/usr/bin/env python3
"""Apply frozen Torah 25 commentary, prayer, Nanach, registry, and language repairs."""
import json,re
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/25'
AV={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
def load(p): return json.loads(Path(p).read_text(encoding='utf-8-sig').replace('\x00',''))
def dump(p,d): Path(p).parent.mkdir(parents=True,exist_ok=True); Path(p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def main():
 study=load(BASE/'torah-study.json'); segs=study['segments']; pp=ROOT/'public/reader/pettek-nanach-commentary/torah-25.json'; p=load(pp)
 if len(p['segments'])!=13: raise RuntimeError('Pettek count')
 for z in p['segments']:
  actual={l:{k:bool(str((z['layers'].get(l) or {}).get(k) or '').strip()) for k in ('he','en')} for l in AV}
  if actual!=AV: raise RuntimeError(f'Pettek availability {z["index"]}')
  r=int(z['relatedSegment']); matched=[x['index'] for x in segs if int(x['classicSegment'])==r]
  if not matched: raise RuntimeError(f'crosswalk {r}')
  z['alignedPassage']=matched[0]; z['alignedPassages']=matched
 p.update({'totalSegments':13,'inScopeRecords':13,'layerAvailability':AV,'superReaderCoverageNote':'All 13 records are in scope. Beginner is English-only, intermediate bilingual, and scholarly Hebrew-only; no missing translations are manufactured.'}); dump(pp,p)
 dump(BASE/'biur-halikutim.json',{'id':'bhl-25-unavailable','book':'biur-halikutim','part':1,'torah':25,'segments':[],'totalSegments':0,'hasEnglish':False,'availability':'unavailable','reason':'No canonical local Torah 25 Biur HaLikutim package exists; section 26 is a Torah 21/22 aggregate and section 27 belongs to Torah 27.'})
 src=load(ROOT/'public/reader/parparos-lechochma/section-26.json'); inds=[2,4,6]
 if src.get('title')!='סימן כ"ה-אחוי לן מנא' or [int(z['index']) for z in src['segments']]!=inds: raise RuntimeError('Parparos source')
 out=[{'index':i,'sourceIndex':int(z['index']),'sourceSection':26,'sourceIdentity':f'section-26.json#index={z["index"]}','he':str(z.get('he') or '').strip(),'en':''} for i,z in enumerate(src['segments'],1)]
 if any(not z['he'] for z in out): raise RuntimeError('empty Parparos')
 dump(BASE/'parparos-lechochma.json',{'id':'plc-25-super','book':'parparos-lechochma','part':1,'torah':25,'title':src['title'],'sourceSection':26,'segments':out,'totalParagraphs':3,'totalSegments':3,'hasEnglish':False,'sourceFile':'public/reader/parparos-lechochma/section-26.json','superReaderMetadataRepair':'Normalized physical indices 2, 4, 6 to 1–3; legacy English withheld because sentence-level correspondence is not frozen.'})
 hp=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_25_prayer25.html'; soup=BeautifulSoup(hp.read_text(),'html.parser'); dates=[z.get_text(' ',strip=True).replace('\xa0',' ') for z in soup.select('.date-bar')]
 if len(dates)!=1 or '26th of Cheshvan' not in dates[0]: raise RuntimeError(f'date bars {dates}')
 ids=[f'p25{chr(97+i)}' for i in range(7)]; prs=[]
 for i,div in enumerate(soup.select('div.para'),1):
  h=div.select_one('.heb-text'); ep=div.find('p',recursive=False)
  if not h or not ep or h.get('id')!=ids[i-1]: raise RuntimeError(f'prayer {i}')
  clone=BeautifulSoup(str(ep),'html.parser')
  for n in clone.select('.heb-btn,.heb-text'): n.decompose()
  he=h.get_text(' ',strip=True); en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True)); prs.append({'index':i,'sourceId':h['id'],'he':he,'he_nikud':he,'en':en})
 if len(prs)!=7 or any(not z['he'] or not z['en'] or 'עברית ▾' in z['en'] for z in prs): raise RuntimeError('prayer blocks')
 op=ROOT/'public/reader/likutay-tefilos/part-1/prayer-25.json'; old=load(op); nav=old.get('navigation') or {'prevUrl':'/reader/likutay-tefilos/1/24','nextUrl':'/reader/likutay-tefilos/1/26'}
 dump(op,{'id':'lt-1-25','book':'likutay-tefilos','part':1,'torah':25,'displayNumber':25,'title':'Prayer Twenty-Five','hebrewTitle':'תפילה כה','segments':prs,'aligned_segments':prs,'totalParagraphs':7,'totalSegments':7,'hasEnglish':True,'navigation':nav,'superReaderRepairSource':str(hp.relative_to(ROOT)),'excludedMetadata':{'dateBars':1,'dateBarText':dates,'reason':'Date bar is metadata, not prayer prose'}})
 np=ROOT/'public/reader/likutay-nanach/volume-4/chapter-25.json'; nd=load(np); by={int(z['index']):z for z in nd['segments']}; ninds=list(range(43,76))
 if by[42]['he'].strip()!='תורה כה' or by[76]['he'].strip()!='תורה כו': raise RuntimeError('Nanach boundaries')
 ns=[]
 for i,n in enumerate(ninds,1):
  z=dict(by[n]); z.update({'index':i,'sourceFile':'volume-4/chapter-25.json','sourceIndex':n,'sourceIdentity':f'volume-4/chapter-25.json#index={n}'})
  if not z.get('he') or z.get('en'): raise RuntimeError(f'Nanach {n}')
  ns.append(z)
 dump(BASE/'likutay-nanach.json',{'id':'likutay-nanach-torah-25','book':'likutay-nanach','part':1,'torah':25,'title':'ליקוטי ננח — תורה כה','segments':ns,'totalSegments':33,'hasEnglish':False,'sourceSlice':{'file':'volume-4/chapter-25.json','firstIndex':43,'lastIndex':75},'excludedBoundaries':[42,76]})
 rp=ROOT/'src/data/lm-commentaries.json'; reg=load(rp); rel=reg['1']['25']['related_commentaries']; rel[:]=[z for z in rel if z.get('book')!='biur-halikutim']; nn=[z for z in rel if z.get('book')=='likutay-nanach']
 if len(nn)!=1: raise RuntimeError('registry')
 nn[0].update({'section':'chapter-25-torah-25-slice','sectionNumber':25,'sectionTitle':'תורה כה','url':'/reader/super/likutay-moharan/1/25/likutay-nanach.json','sourceIndices':ninds,'totalRecords':33,'superReaderBoundaryNote':'Chapter 25 heading 42 excluded; substantive indices 43–75; stop before Torah 26 heading 76. Stale chapter 29 is unrelated.'}); dump(rp,reg)
 print('Repaired Torah 25: Pettek 13 asymmetric, Biur unavailable, Parparos 3 HE-only, prayer 7 bilingual, Nanach 33 HE-only, registry corrected.')
if __name__=='__main__': main()
