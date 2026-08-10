#!/usr/bin/env python3
"""Apply the frozen Torah 28 commentary, prayer, Nanach, registry, and language repairs."""
import json,re
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/28'
AV={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
def load(p): return json.loads(Path(p).read_text(encoding='utf-8-sig').replace('\x00',''))
def dump(p,d): Path(p).parent.mkdir(parents=True,exist_ok=True); Path(p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def main():
 study=load(BASE/'torah-study.json');
 if len(study['segments'])!=36: raise RuntimeError('study count')
 by={}
 for s in study['segments']: by.setdefault(int(s['classicSegment']),[]).append(int(s['index']))
 expected={1:[1],2:[],3:list(range(2,7)),4:list(range(7,11)),5:list(range(11,15)),6:list(range(15,27)),7:list(range(27,37))}
 if by!={k:v for k,v in expected.items() if v}: raise RuntimeError(f'classic crosswalk {by}')
 ppath=ROOT/'public/reader/pettek-nanach-commentary/torah-28.json'; pettek=load(ppath)
 if len(pettek['segments'])!=7: raise RuntimeError('Pettek count')
 for r in pettek['segments']:
  actual={layer:{lang:bool(str((r['layers'].get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in AV}
  if actual!=AV: raise RuntimeError(f'Pettek availability {r["index"]}')
  related=int(r['relatedSegment']); aligned=[1] if related in (1,2) else expected[related]
  r['alignedPassage']=aligned[0]; r['alignedPassages']=aligned
 pettek.update({'totalSegments':7,'inScopeRecords':7,'layerAvailability':AV,'superReaderCoverageNote':'All 7 records are in scope. Classic heading/anecdote records 1 and 2 both synchronize to passage 1. Beginner is English-only, intermediate bilingual, and scholarly Hebrew-only; no missing translations are manufactured.'}); dump(ppath,pettek)
 biur_src=load(ROOT/'public/reader/biur-halikutim/section-28.json')
 if len(biur_src['segments'])!=1 or biur_src.get('title')!='בני לן ביתא סימן כ"ח': raise RuntimeError('Biur source changed')
 z=biur_src['segments'][0]
 if int(z['index'])!=1 or not z.get('he') or z.get('en'): raise RuntimeError('Biur language/index')
 dump(BASE/'biur-halikutim.json',{'id':'bhl-28-super','book':'biur-halikutim','part':1,'torah':28,'title':biur_src['title'],'segments':[{**z,'index':1,'sourceIndex':1,'sourceFile':'public/reader/biur-halikutim/section-28.json'}],'totalSegments':1,'hasEnglish':False,'availability':'hebrew-only','sourceFile':'/reader/biur-halikutim/section-28.json'})
 par_src=load(ROOT/'public/reader/parparos-lechochma/section-28.json'); indices=[int(z['index']) for z in par_src['segments']]
 if indices!=[2,4,6,8] or par_src.get('title')!='סימן כ"ח-בני לן ביתא': raise RuntimeError('Parparos source changed')
 par=[]
 for i,s in enumerate(par_src['segments'],1):
  if not s.get('he'): raise RuntimeError('Parparos Hebrew empty')
  par.append({'index':i,'sourceIndex':int(s['index']),'sourceFile':'public/reader/parparos-lechochma/section-28.json','he':s['he'],'he_nikud':s.get('he_nikud') or s['he'],'en':''})
 dump(BASE/'parparos-lechochma.json',{'id':'plc-28-super','book':'parparos-lechochma','part':1,'torah':28,'title':par_src['title'],'segments':par,'totalSegments':4,'hasEnglish':False,'availability':'hebrew-only','repairNote':'Legacy English is shifted and includes explicit Torah 29 contamination; it is withheld rather than misrepresented.','sourceIndices':[2,4,6,8]})
 html_path=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_28_prayer28.html'; soup=BeautifulSoup(html_path.read_text(encoding='utf-8'),'html.parser'); dates=[n.get_text(' ',strip=True).replace('\xa0',' ') for n in soup.select('.date-bar')]
 if len(dates)!=1 or '8th of Kislev' not in dates[0]: raise RuntimeError(f'date bars {dates}')
 ids=[f'p28{chr(97+i)}' for i in range(5)]; prayers=[]
 for i,div in enumerate(soup.select('div.para'),1):
  hebrew=div.select_one('.heb-text'); english_p=div.find('p',recursive=False)
  if not hebrew or not english_p or i>5 or hebrew.get('id')!=ids[i-1]: raise RuntimeError(f'prayer {i}')
  clone=BeautifulSoup(str(english_p),'html.parser')
  for node in clone.select('.heb-btn,.heb-text'): node.decompose()
  he=hebrew.get_text(' ',strip=True); en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True)); prayers.append({'index':i,'sourceId':hebrew['id'],'he':he,'he_nikud':he,'en':en})
 if len(prayers)!=5 or any(not z['he'] or not z['en'] or 'עברית ▾' in z['en'] for z in prayers): raise RuntimeError('prayer blocks')
 prayer_path=ROOT/'public/reader/likutay-tefilos/part-1/prayer-28.json'; old=load(prayer_path); navigation=old.get('navigation') or {'prevUrl':'/reader/likutay-tefilos/1/27','nextUrl':'/reader/likutay-tefilos/1/29'}
 dump(prayer_path,{'id':'lt-1-28','book':'likutay-tefilos','part':1,'torah':28,'displayNumber':28,'title':'Prayer Twenty-Eight','hebrewTitle':'תפילה כח','segments':prayers,'aligned_segments':prayers,'totalParagraphs':5,'totalSegments':5,'hasEnglish':True,'navigation':navigation,'superReaderRepairSource':str(html_path.relative_to(ROOT)),'excludedMetadata':{'dateBars':1,'dateBarText':dates,'specialBars':0,'reason':'Date bar is metadata, not prayer prose'}})
 nd=load(ROOT/'public/reader/likutay-nanach/volume-4/chapter-25.json'); bix={int(z['index']):z for z in nd['segments']}
 if bix[83]['he'].strip()!='תורה כח' or bix[138]['he'].strip()!='תורה כט': raise RuntimeError('Nanach boundaries')
 source_indices=list(range(84,128))+list(range(129,136))+[137]; nn=[]
 for i,si in enumerate(source_indices,1):
  source=dict(bix[si])
  if not source.get('he') or source.get('en'): raise RuntimeError(f'Nanach language truth {si}')
  source.update({'index':i,'sourceFile':'volume-4/chapter-25.json','sourceIndex':si,'sourceIdentity':f'volume-4/chapter-25.json#index={si}'}); nn.append(source)
 dump(BASE/'likutay-nanach.json',{'id':'likutay-nanach-torah-28','book':'likutay-nanach','part':1,'torah':28,'title':'ליקוטי ננח — תורה כח','segments':nn,'totalSegments':52,'hasEnglish':False,'sourceSlice':{'file':'volume-4/chapter-25.json','ranges':[[84,127],[129,135],[137,137]]},'excludedHeadings':[83,128,136,138]})
 regp=ROOT/'src/data/lm-commentaries.json'; reg=load(regp); related=reg['1']['28']['related_commentaries']; nreg=[z for z in related if z.get('book')=='likutay-nanach']
 if len(nreg)!=1: raise RuntimeError('registry')
 nreg[0].update({'section':'chapter-25-torah-28-slice','sectionNumber':25,'sectionTitle':'תורה כח','url':'/reader/super/likutay-moharan/1/28/likutay-nanach.json','sourceIndices':source_indices,'totalRecords':52,'superReaderBoundaryNote':'Chapter 25 heading 83 excluded; substantive indices 84–127, 129–135, and 137 only; internal headings 128/136 excluded; stop before Torah 29 heading 138. Stale chapter 32 is unrelated.'}); dump(regp,reg)
 print('Repaired Torah 28: Pettek 7 asymmetric, Biur 1 HE-only, Parparos 4 HE-only, prayer 5 bilingual, Nanach 52 HE-only, registry corrected.')
if __name__=='__main__': main()
