#!/usr/bin/env python3
"""Apply the frozen Torah 31 commentary, prayer, Nanach, registry, and language repairs."""
import json,re,shutil
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/31'
AV={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
EXPECTED={1:[1],2:[2],3:[3],4:list(range(3,7)),5:[7],6:list(range(8,14)),7:list(range(14,16)),8:list(range(16,20)),9:list(range(20,23)),10:[23],11:list(range(24,26)),12:list(range(26,31)),13:list(range(31,34)),14:list(range(34,38)),15:list(range(38,47)),16:list(range(47,54)),17:list(range(54,56)),18:list(range(56,59)),19:list(range(59,72)),20:list(range(71,78)),21:list(range(78,82)),22:list(range(82,92)),23:list(range(92,94)),24:list(range(94,108)),25:[108,109],26:[109]}
SOURCE_HTML=Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Lekutay Tefilos 1/likutay_tefilos_31_prayer31.html')
def load(p): return json.loads(Path(p).read_text(encoding='utf-8-sig').replace('\x00',''))
def dump(p,d): Path(p).parent.mkdir(parents=True,exist_ok=True); Path(p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def main():
 study=load(BASE/'torah-study.json')
 if len(study['segments'])!=109: raise RuntimeError('study count')
 by={i:[int(s['index']) for s in study['segments'] if i in set(map(int,s.get('classicSegments',[s['classicSegment']])))] for i in range(1,27)}
 if by!=EXPECTED: raise RuntimeError(f'classic crosswalk {by}')
 ppath=ROOT/'public/reader/pettek-nanach-commentary/torah-31.json'; pettek=load(ppath)
 if len(pettek['segments'])!=26 or [int(z['relatedSegment']) for z in pettek['segments']]!=list(range(1,27)): raise RuntimeError('Pettek count/keys')
 for r in pettek['segments']:
  actual={layer:{lang:bool(str((r['layers'].get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in AV}
  if actual!=AV: raise RuntimeError(f'Pettek availability {r["index"]}')
  aligned=EXPECTED[int(r['relatedSegment'])]; r['alignedPassage']=aligned[0]; r['alignedPassages']=aligned
 pettek.update({'totalSegments':26,'inScopeRecords':26,'layerAvailability':AV,'superReaderCoverageNote':'All 26 Classic-keyed records are in scope. Beginner is English-only, intermediate bilingual, and scholarly Hebrew-only; no missing translations are manufactured.'}); dump(ppath,pettek)
 biur_src=load(ROOT/'public/reader/biur-halikutim/section-30.json'); bix={int(z['index']):z for z in biur_src['segments']}
 if len(biur_src['segments'])!=89 or 'סימן ל"א' not in bix[86]['he'] or load(ROOT/'public/reader/biur-halikutim/section-31.json').get('title')!='אשרי העם זרקא-סימן ל"ה': raise RuntimeError('Biur source anomaly changed')
 biur=[]
 for n,si in enumerate(range(86,90),1):
  z=bix[si]
  if not z.get('he') or z.get('en'): raise RuntimeError(f'Biur language/index {si}')
  biur.append({**z,'index':n,'sourceIndex':si,'sourceFile':'public/reader/biur-halikutim/section-30.json'})
 dump(BASE/'biur-halikutim.json',{'id':'bhl-31-super','book':'biur-halikutim','part':1,'torah':31,'title':'אית לן בירא-סימן ל"א','segments':biur,'totalSegments':4,'hasEnglish':False,'availability':'hebrew-only','sourceFile':'/reader/biur-halikutim/section-30.json','sourceIndices':[86,87,88,89],'excludedMisfiledFile':'/reader/biur-halikutim/section-31.json','repairNote':'Torah 31 survives at the tail of section-30.json; section-31.json is Torah 35 and is excluded.'})
 par_src=load(ROOT/'public/reader/parparos-lechochma/section-31.json'); source_indices=list(range(2,27,2))
 if [int(z['index']) for z in par_src['segments']]!=source_indices or par_src.get('title')!='סימן ל"א-אית לן בירא': raise RuntimeError('Parparos source changed')
 par=[]
 for i,s in enumerate(par_src['segments'],1):
  if not s.get('he'): raise RuntimeError('Parparos Hebrew empty')
  par.append({'index':i,'sourceIndex':int(s['index']),'sourceFile':'public/reader/parparos-lechochma/section-31.json','he':s['he'],'he_nikud':s.get('he_nikud') or s['he'],'en':''})
 dump(BASE/'parparos-lechochma.json',{'id':'plc-31-super','book':'parparos-lechochma','part':1,'torah':31,'title':par_src['title'],'segments':par,'totalSegments':13,'hasEnglish':False,'availability':'hebrew-only','repairNote':'Legacy English is shifted and cross-Torah contaminated (Torahs 33–36); it is withheld rather than misrepresented.','sourceIndices':source_indices})
 html_path=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_31_prayer31.html'; html_path.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(SOURCE_HTML,html_path)
 soup=BeautifulSoup(html_path.read_text(encoding='utf-8'),'html.parser'); dates=[re.sub(r'\s+',' ',n.get_text(' ',strip=True).replace('\xa0',' ')).strip() for n in soup.select('.date-bar')]
 expected_dates=['For Shabbos Kodesh · לְשַׁבָּת קֹדֶשׁ · 19 Kislev','20 Kislev','21 Kislev','22 Kislev']
 if dates!=expected_dates or soup.select('.special-bar'): raise RuntimeError(f'date bars {dates}')
 ids=[f'p31{chr(97+i)}' for i in range(18)]; prayers=[]; containers=soup.select('div.para')
 if len(containers)!=18: raise RuntimeError('prayer container count')
 for i,div in enumerate(containers,1):
  hebrew=div.select_one('.heb-text'); english_p=div.find('p',recursive=False)
  if not hebrew or not english_p: raise RuntimeError(f'prayer {i}')
  clone=BeautifulSoup(str(english_p),'html.parser')
  for node in clone.select('.heb-btn,.heb-text'): node.decompose()
  he=hebrew.get_text(' ',strip=True); en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True)); prayers.append({'index':i,'assignedPackageId':ids[i-1],'sourceContainerOrdinal':i,'he':he,'he_nikud':he,'en':en})
 if any(not z['he'] or not z['en'] or 'עברית ▾' in z['en'] for z in prayers): raise RuntimeError('prayer blocks')
 prayer_path=ROOT/'public/reader/likutay-tefilos/part-1/prayer-31.json'; old=load(prayer_path); navigation=old.get('navigation') or {'prevUrl':'/reader/likutay-tefilos/1/30','nextUrl':'/reader/likutay-tefilos/1/32'}
 dump(prayer_path,{'id':'lt-1-31','book':'likutay-tefilos','part':1,'torah':31,'displayNumber':31,'title':'Prayer Thirty-One','hebrewTitle':'תפילה לא','segments':prayers,'aligned_segments':prayers,'totalParagraphs':18,'totalSegments':18,'hasEnglish':True,'navigation':navigation,'superReaderRepairSource':str(html_path.relative_to(ROOT)),'assignedPackageIds':ids,'packageIdNote':'The 18 .para source containers have no IDs; p31a–p31r are deterministic package IDs assigned by source order.','excludedMetadata':{'dateBars':4,'dateBarText':dates,'specialBars':0,'reason':'Date bars are metadata, not prayer prose'}})
 c25=load(ROOT/'public/reader/likutay-nanach/volume-4/chapter-25.json'); c26=load(ROOT/'public/reader/likutay-nanach/volume-4/chapter-26.json'); x25={int(z['index']):z for z in c25['segments']}; x26={int(z['index']):z for z in c26['segments']}
 if 'תורה לא' not in x25[222]['he'] or x26[67]['he'].strip()!='תורה לב': raise RuntimeError('Nanach boundaries')
 slices=[('volume-4/chapter-25.json',x25,range(223,241)),('volume-4/chapter-26.json',x26,range(1,67))]; nn=[]; identities=[]
 for source_file,mapping,indices in slices:
  for si in indices:
   source=dict(mapping[si])
   if not source.get('he') or source.get('en'): raise RuntimeError(f'Nanach language truth {source_file} {si}')
   source.update({'index':len(nn)+1,'sourceFile':source_file,'sourceIndex':si,'sourceIdentity':f'{source_file}#index={si}'}); nn.append(source); identities.append({'file':source_file,'index':si})
 dump(BASE/'likutay-nanach.json',{'id':'likutay-nanach-torah-31','book':'likutay-nanach','part':1,'torah':31,'title':'ליקוטי ננח — תורה לא','segments':nn,'totalSegments':84,'hasEnglish':False,'sourceSlices':[{'file':'volume-4/chapter-25.json','range':[223,240]},{'file':'volume-4/chapter-26.json','range':[1,66]}],'excludedHeadings':[{'file':'volume-4/chapter-25.json','index':222},{'file':'volume-4/chapter-26.json','index':67}]})
 regp=ROOT/'src/data/lm-commentaries.json'; reg=load(regp); related=reg['1']['31']['related_commentaries']; nreg=[z for z in related if z.get('book')=='likutay-nanach']
 if len(nreg)!=1: raise RuntimeError('registry')
 nreg[0].update({'section':'chapters-25-26-torah-31-slice','sectionNumber':25,'sectionTitle':'תורה לא – אית לן בירא','url':'/reader/super/likutay-moharan/1/31/likutay-nanach.json','sourceIdentities':identities,'totalRecords':84,'superReaderBoundaryNote':'Chapter 25 heading 222 excluded; include 223–240, continue chapter 26 indices 1–66, stop before Torah 32 heading 67.'}); dump(regp,reg)
 print('Repaired Torah 31: Pettek 26 asymmetric, Biur 4 HE-only, Parparos 13 HE-only, prayer 18 bilingual, Nanach 84 HE-only across two files, registry corrected.')
if __name__=='__main__': main()
