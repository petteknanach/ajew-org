#!/usr/bin/env python3
"""Apply the frozen Torah 29 commentary, prayer, Nanach, registry, and language repairs."""
import json,re
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/29'
AV={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
EXPECTED={1:[1],2:[2],3:[3],4:list(range(4,7)),5:list(range(7,10)),6:list(range(10,21)),7:list(range(21,30)),8:list(range(30,33)),9:list(range(33,38)),10:list(range(38,43)),11:list(range(43,46)),12:list(range(46,48)),13:list(range(48,56)),14:[56],15:list(range(57,71)),16:list(range(71,77))}
def load(p): return json.loads(Path(p).read_text(encoding='utf-8-sig').replace('\x00',''))
def dump(p,d): Path(p).parent.mkdir(parents=True,exist_ok=True); Path(p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def main():
 study=load(BASE/'torah-study.json')
 if len(study['segments'])!=76: raise RuntimeError('study count')
 by={i:[int(s['index']) for s in study['segments'] if int(s['classicSegment'])==i] for i in range(1,17)}
 if by!=EXPECTED: raise RuntimeError(f'classic crosswalk {by}')
 ppath=ROOT/'public/reader/pettek-nanach-commentary/torah-29.json'; pettek=load(ppath)
 if len(pettek['segments'])!=16 or [int(z['relatedSegment']) for z in pettek['segments']]!=list(range(1,17)): raise RuntimeError('Pettek count/keys')
 for r in pettek['segments']:
  actual={layer:{lang:bool(str((r['layers'].get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in AV}
  if actual!=AV: raise RuntimeError(f'Pettek availability {r["index"]}')
  aligned=EXPECTED[int(r['relatedSegment'])]; r['alignedPassage']=aligned[0]; r['alignedPassages']=aligned
 pettek.update({'totalSegments':16,'inScopeRecords':16,'layerAvailability':AV,'superReaderCoverageNote':'All 16 Classic-keyed records are in scope. Beginner is English-only, intermediate bilingual, and scholarly Hebrew-only; no missing translations are manufactured.'}); dump(ppath,pettek)
 biur_src=load(ROOT/'public/reader/biur-halikutim/section-29.json')
 if len(biur_src['segments'])!=3 or biur_src.get('title')!='האי גברא וכו\'-סימן כ"ט': raise RuntimeError('Biur source changed')
 biur=[]
 for i,z in enumerate(biur_src['segments'],1):
  if int(z['index'])!=i or not z.get('he') or z.get('en'): raise RuntimeError('Biur language/index')
  biur.append({**z,'index':i,'sourceIndex':i,'sourceFile':'public/reader/biur-halikutim/section-29.json'})
 dump(BASE/'biur-halikutim.json',{'id':'bhl-29-super','book':'biur-halikutim','part':1,'torah':29,'title':biur_src['title'],'segments':biur,'totalSegments':3,'hasEnglish':False,'availability':'hebrew-only','sourceFile':'/reader/biur-halikutim/section-29.json'})
 par_src=load(ROOT/'public/reader/parparos-lechochma/section-29.json'); source_indices=[2,3,5,7,9,11,13,15,17,19,21,23,25]
 if [int(z['index']) for z in par_src['segments']]!=source_indices or par_src.get('title')!='סימן כ"ט': raise RuntimeError('Parparos source changed')
 par=[]
 for i,s in enumerate(par_src['segments'],1):
  if not s.get('he'): raise RuntimeError('Parparos Hebrew empty')
  par.append({'index':i,'sourceIndex':int(s['index']),'sourceFile':'public/reader/parparos-lechochma/section-29.json','he':s['he'],'he_nikud':s.get('he_nikud') or s['he'],'en':''})
 dump(BASE/'parparos-lechochma.json',{'id':'plc-29-super','book':'parparos-lechochma','part':1,'torah':29,'title':par_src['title'],'segments':par,'totalSegments':13,'hasEnglish':False,'availability':'hebrew-only','repairNote':'Legacy English is shifted, duplicated, and cross-Torah contaminated; it is withheld rather than misrepresented.','sourceIndices':source_indices})
 html_path=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_29_prayer29.html'; soup=BeautifulSoup(html_path.read_text(encoding='utf-8'),'html.parser'); dates=[re.sub(r'\s+',' ',n.get_text(' ',strip=True).replace('\xa0',' ')).strip() for n in soup.select('.date-bar')]
 if dates!=['Recite any time · בְּכָל עֵת']: raise RuntimeError(f'date bars {dates}')
 ids=[f'p29{chr(97+i)}' for i in range(13)]; prayers=[]
 for i,div in enumerate(soup.select('div.para'),1):
  hebrew=div.select_one('.heb-text'); english_p=div.find('p',recursive=False)
  if not hebrew or not english_p or i>13 or hebrew.get('id')!=ids[i-1]: raise RuntimeError(f'prayer {i}')
  clone=BeautifulSoup(str(english_p),'html.parser')
  for node in clone.select('.heb-btn,.heb-text'): node.decompose()
  he=hebrew.get_text(' ',strip=True); en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True)); prayers.append({'index':i,'sourceId':hebrew['id'],'he':he,'he_nikud':he,'en':en})
 if len(prayers)!=13 or any(not z['he'] or not z['en'] or 'עברית ▾' in z['en'] for z in prayers): raise RuntimeError('prayer blocks')
 prayer_path=ROOT/'public/reader/likutay-tefilos/part-1/prayer-29.json'; old=load(prayer_path); navigation=old.get('navigation') or {'prevUrl':'/reader/likutay-tefilos/1/28','nextUrl':'/reader/likutay-tefilos/1/30'}
 dump(prayer_path,{'id':'lt-1-29','book':'likutay-tefilos','part':1,'torah':29,'displayNumber':29,'title':'Prayer Twenty-Nine','hebrewTitle':'תפילה כט','segments':prayers,'aligned_segments':prayers,'totalParagraphs':13,'totalSegments':13,'hasEnglish':True,'navigation':navigation,'superReaderRepairSource':str(html_path.relative_to(ROOT)),'excludedMetadata':{'dateBars':1,'dateBarText':dates,'specialBars':0,'reason':'Date bar is metadata, not prayer prose'}})
 nd=load(ROOT/'public/reader/likutay-nanach/volume-4/chapter-25.json'); bix={int(z['index']):z for z in nd['segments']}
 if bix[138]['he'].strip()!='תורה כט' or bix[184]['he'].strip()!='תורה ל': raise RuntimeError('Nanach boundaries')
 source_indices=list(range(139,184)); nn=[]
 for i,si in enumerate(source_indices,1):
  source=dict(bix[si])
  if not source.get('he') or source.get('en'): raise RuntimeError(f'Nanach language truth {si}')
  source.update({'index':i,'sourceFile':'volume-4/chapter-25.json','sourceIndex':si,'sourceIdentity':f'volume-4/chapter-25.json#index={si}'}); nn.append(source)
 dump(BASE/'likutay-nanach.json',{'id':'likutay-nanach-torah-29','book':'likutay-nanach','part':1,'torah':29,'title':'ליקוטי ננח — תורה כט','segments':nn,'totalSegments':45,'hasEnglish':False,'sourceSlice':{'file':'volume-4/chapter-25.json','ranges':[[139,183]]},'excludedHeadings':[136,137,138,184]})
 regp=ROOT/'src/data/lm-commentaries.json'; reg=load(regp); related=reg['1']['29']['related_commentaries']; nreg=[z for z in related if z.get('book')=='likutay-nanach']
 if len(nreg)!=1: raise RuntimeError('registry')
 nreg[0].update({'section':'chapter-25-torah-29-slice','sectionNumber':25,'sectionTitle':'תורה כט','url':'/reader/super/likutay-moharan/1/29/likutay-nanach.json','sourceIndices':source_indices,'totalRecords':45,'superReaderBoundaryNote':'Chapter 25 heading 138 excluded; substantive indices 139–183 only; stop before Torah 30 heading 184. Indices 136–137 belong to the Torah 28 boundary/adjacency.'}); dump(regp,reg)
 print('Repaired Torah 29: Pettek 16 asymmetric, Biur 3 HE-only, Parparos 13 HE-only, prayer 13 bilingual, Nanach 45 HE-only, registry corrected.')
if __name__=='__main__': main()
