#!/usr/bin/env python3
"""Apply the frozen Torah 30 commentary, prayer, Nanach, registry, and language repairs."""
import json,re,shutil
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/30'
AV={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
EXPECTED={1:list(range(1,6)),2:[6],3:[7],4:[8,9],5:list(range(10,14)),6:list(range(14,19)),7:list(range(19,22)),8:list(range(22,26)),9:list(range(26,30)),10:list(range(30,37)),11:list(range(37,50)),12:list(range(50,59)),13:list(range(59,69)),14:list(range(69,80)),15:[80],16:list(range(81,84))}
SOURCE_HTML=Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Lekutay Tefilos 1/likutay_tefilos_30_prayer30.html')
def load(p): return json.loads(Path(p).read_text(encoding='utf-8-sig').replace('\x00',''))
def dump(p,d): Path(p).parent.mkdir(parents=True,exist_ok=True); Path(p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def main():
 study=load(BASE/'torah-study.json')
 if len(study['segments'])!=83: raise RuntimeError('study count')
 by={i:[int(s['index']) for s in study['segments'] if int(s['classicSegment'])==i] for i in range(1,17)}
 if by!=EXPECTED: raise RuntimeError(f'classic crosswalk {by}')
 ppath=ROOT/'public/reader/pettek-nanach-commentary/torah-30.json'; pettek=load(ppath)
 if len(pettek['segments'])!=16 or [int(z['relatedSegment']) for z in pettek['segments']]!=list(range(1,17)): raise RuntimeError('Pettek count/keys')
 for r in pettek['segments']:
  actual={layer:{lang:bool(str((r['layers'].get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in AV}
  if actual!=AV: raise RuntimeError(f'Pettek availability {r["index"]}')
  aligned=EXPECTED[int(r['relatedSegment'])]; r['alignedPassage']=aligned[0]; r['alignedPassages']=aligned
 pettek.update({'totalSegments':16,'inScopeRecords':16,'layerAvailability':AV,'superReaderCoverageNote':'All 16 Classic-keyed records are in scope. Beginner is English-only, intermediate bilingual, and scholarly Hebrew-only; no missing translations are manufactured.'}); dump(ppath,pettek)
 biur_src=load(ROOT/'public/reader/biur-halikutim/section-30.json'); bix={int(z['index']):z for z in biur_src['segments']}
 if len(biur_src['segments'])!=89 or biur_src.get('title')!="מישרא דסכינא-סימן ל'" or 'סימן ל"א' not in bix[86]['he']: raise RuntimeError('Biur source/boundary changed')
 biur=[]
 for i in range(1,86):
  z=bix[i]
  if not z.get('he') or z.get('en'): raise RuntimeError(f'Biur language/index {i}')
  biur.append({**z,'index':i,'sourceIndex':i,'sourceFile':'public/reader/biur-halikutim/section-30.json'})
 dump(BASE/'biur-halikutim.json',{'id':'bhl-30-super','book':'biur-halikutim','part':1,'torah':30,'title':biur_src['title'],'segments':biur,'totalSegments':85,'hasEnglish':False,'availability':'hebrew-only','sourceFile':'/reader/biur-halikutim/section-30.json','nextTorahHeadingIndex':86})
 par_src=load(ROOT/'public/reader/parparos-lechochma/section-30.json'); source_indices=list(range(2,31,2))
 if [int(z['index']) for z in par_src['segments']]!=source_indices or par_src.get('title')!='סימן ל-מישרא דסכינא': raise RuntimeError('Parparos source changed')
 par=[]
 for i,s in enumerate(par_src['segments'],1):
  if not s.get('he'): raise RuntimeError('Parparos Hebrew empty')
  par.append({'index':i,'sourceIndex':int(s['index']),'sourceFile':'public/reader/parparos-lechochma/section-30.json','he':s['he'],'he_nikud':s.get('he_nikud') or s['he'],'en':''})
 dump(BASE/'parparos-lechochma.json',{'id':'plc-30-super','book':'parparos-lechochma','part':1,'torah':30,'title':par_src['title'],'segments':par,'totalSegments':15,'hasEnglish':False,'availability':'hebrew-only','repairNote':'Legacy English is shifted and crosses into Torah 31; it is withheld rather than misrepresented.','sourceIndices':source_indices})
 html_path=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_30_prayer30.html'; html_path.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(SOURCE_HTML,html_path)
 soup=BeautifulSoup(html_path.read_text(encoding='utf-8'),'html.parser'); dates=[re.sub(r'\s+',' ',n.get_text(' ',strip=True).replace('\xa0',' ')).strip() for n in soup.select('.date-bar')]
 expected_dates=['7 Adar · Hilula of Moshe Rabbainu, of blessed memory · 14 Kislev','15 Kislev','16 Kislev','17 Kislev','18 Kislev']
 if dates!=expected_dates or soup.select('.special-bar'): raise RuntimeError(f'date bars {dates}')
 ids=[f'p30{chr(97+i)}' for i in range(17)]; prayers=[]
 for i,div in enumerate(soup.select('div.para'),1):
  hebrew=div.select_one('.heb-text'); english_p=div.find('p',recursive=False)
  if not hebrew or not english_p or i>17 or hebrew.get('id')!=ids[i-1]: raise RuntimeError(f'prayer {i}')
  clone=BeautifulSoup(str(english_p),'html.parser')
  for node in clone.select('.heb-btn,.heb-text'): node.decompose()
  he=hebrew.get_text(' ',strip=True); en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True)); prayers.append({'index':i,'sourceId':hebrew['id'],'he':he,'he_nikud':he,'en':en})
 if len(prayers)!=17 or any(not z['he'] or not z['en'] or 'עברית ▾' in z['en'] for z in prayers): raise RuntimeError('prayer blocks')
 prayer_path=ROOT/'public/reader/likutay-tefilos/part-1/prayer-30.json'; old=load(prayer_path); navigation=old.get('navigation') or {'prevUrl':'/reader/likutay-tefilos/1/29','nextUrl':'/reader/likutay-tefilos/1/31'}
 dump(prayer_path,{'id':'lt-1-30','book':'likutay-tefilos','part':1,'torah':30,'displayNumber':30,'title':'Prayer Thirty','hebrewTitle':'תפילה ל','segments':prayers,'aligned_segments':prayers,'totalParagraphs':17,'totalSegments':17,'hasEnglish':True,'navigation':navigation,'superReaderRepairSource':str(html_path.relative_to(ROOT)),'excludedMetadata':{'dateBars':5,'dateBarText':dates,'specialBars':0,'reason':'Date bars are metadata, not prayer prose'}})
 nd=load(ROOT/'public/reader/likutay-nanach/volume-4/chapter-25.json'); nix={int(z['index']):z for z in nd['segments']}
 if nix[184]['he'].strip()!='תורה ל' or 'תורה לא' not in nix[222]['he']: raise RuntimeError('Nanach boundaries')
 source_indices=list(range(185,222)); nn=[]
 for i,si in enumerate(source_indices,1):
  source=dict(nix[si])
  if not source.get('he') or source.get('en'): raise RuntimeError(f'Nanach language truth {si}')
  source.update({'index':i,'sourceFile':'volume-4/chapter-25.json','sourceIndex':si,'sourceIdentity':f'volume-4/chapter-25.json#index={si}'}); nn.append(source)
 dump(BASE/'likutay-nanach.json',{'id':'likutay-nanach-torah-30','book':'likutay-nanach','part':1,'torah':30,'title':'ליקוטי ננח — תורה ל','segments':nn,'totalSegments':37,'hasEnglish':False,'sourceSlice':{'file':'volume-4/chapter-25.json','ranges':[[185,221]]},'excludedHeadings':[184,222]})
 regp=ROOT/'src/data/lm-commentaries.json'; reg=load(regp); related=reg['1']['30']['related_commentaries']; nreg=[z for z in related if z.get('book')=='likutay-nanach']
 if len(nreg)!=1: raise RuntimeError('registry')
 nreg[0].update({'section':'chapter-25-torah-30-slice','sectionNumber':25,'sectionTitle':'תורה ל','url':'/reader/super/likutay-moharan/1/30/likutay-nanach.json','sourceIndices':source_indices,'totalRecords':37,'superReaderBoundaryNote':'Chapter 25 heading 184 excluded; substantive indices 185–221 only; stop before Torah 31 heading 222.'}); dump(regp,reg)
 print('Repaired Torah 30: Pettek 16 asymmetric, Biur 85 HE-only, Parparos 15 HE-only, prayer 17 bilingual, Nanach 37 HE-only, registry corrected.')
if __name__=='__main__': main()
