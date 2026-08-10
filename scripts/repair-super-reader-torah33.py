#!/usr/bin/env python3
"""Apply frozen Torah 33 commentary, prayer, Nanach, registry, and language repairs."""
import json,re,shutil
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/33'; AV={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
EXPECTED={1:[1],2:[2,3],3:list(range(4,10)),4:list(range(10,23)),5:list(range(23,29)),6:list(range(29,37)),7:[37,38],8:[39,40],9:[41,42],10:list(range(43,47)),11:list(range(47,54))}
SOURCE=Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Lekutay Tefilos 1/likutay_tefilos_32_33_34_prayers32_33_34.html')
def load(p): return json.loads(Path(p).read_text(encoding='utf-8-sig').replace('\x00',''))
def dump(p,d): Path(p).parent.mkdir(parents=True,exist_ok=True); Path(p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def main():
 study=load(BASE/'torah-study.json'); assert len(study['segments'])==53
 by={i:[int(s['index']) for s in study['segments'] if int(s['classicSegment'])==i] for i in range(1,12)}
 if by!=EXPECTED: raise RuntimeError(f'crosswalk {by}')
 pp=ROOT/'public/reader/pettek-nanach-commentary/torah-33.json'; p=load(pp)
 if len(p['segments'])!=11 or [int(z['relatedSegment']) for z in p['segments']]!=list(range(1,12)): raise RuntimeError('Pettek keys')
 for z in p['segments']:
  actual={layer:{lang:bool(str((z['layers'].get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in AV}
  if actual!=AV: raise RuntimeError(f'Pettek availability {z["index"]}')
  aligned=EXPECTED[int(z['relatedSegment'])]; z['alignedPassage']=aligned[0]; z['alignedPassages']=aligned
 p.update({'totalSegments':11,'inScopeRecords':11,'layerAvailability':AV,'superReaderCoverageNote':'All 11 Classic-keyed records are in scope. Beginner is English-only, intermediate bilingual, and scholarly Hebrew-only; no missing translations are manufactured.'}); dump(pp,p)
 dump(BASE/'biur-halikutim.json',{'id':'bhl-33-super','book':'biur-halikutim','part':1,'torah':33,'title':'ביאור הליקוטים — unavailable','segments':[],'totalSegments':0,'hasEnglish':False,'availability':'unavailable','repairNote':'No canonical Torah 33 package exists; section-33.json is semantically Torah 52.'})
 ps=load(ROOT/'public/reader/parparos-lechochma/section-32.json'); wanted=[3,5,7]; pm={int(z['index']):z for z in ps['segments']}
 if ps.get('title')!='סימן ל"ג' or sorted(pm)!=wanted: raise RuntimeError('Parparos source changed')
 par=[]
 for n,si in enumerate(wanted,1):
  z=pm[si]
  if not z.get('he'): raise RuntimeError(f'Parparos Hebrew {si}')
  par.append({'index':n,'sourceIndex':si,'sourceFile':'public/reader/parparos-lechochma/section-32.json','he':z['he'],'he_nikud':z.get('he_nikud') or z['he'],'en':''})
 dump(BASE/'parparos-lechochma.json',{'id':'plc-33-super','book':'parparos-lechochma','part':1,'torah':33,'title':'סימן ל"ג','segments':par,'totalSegments':3,'hasEnglish':False,'availability':'hebrew-only','sourceIndices':wanted,'repairNote':'Legacy English is shifted/fragmented and is withheld rather than misrepresented.'})
 htmlp=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_32_33_34_prayers32_33_34.html'; htmlp.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(SOURCE,htmlp)
 soup=BeautifulSoup(htmlp.read_text(encoding='utf-8'),'html.parser'); containers=soup.select('div.para'); all_dates=[re.sub(r'\s+',' ',x.get_text(' ',strip=True).replace('\xa0',' ')).strip() for x in soup.select('.date-bar')]
 dates=all_dates[:5]
 if len(containers)!=13 or dates!=['23 Kislev','24 Kislev','8 of the [Hebrew] Month [Chanukah]','25 Kislev','25 Kislev'] or soup.select('.special-bar'): raise RuntimeError(f'combined prayer source changed: {len(containers)} {dates}')
 prayers=[]; ids=[f'p33{chr(97+i)}' for i in range(6)]
 for package_index,ordinal in enumerate(range(2,8),1):
  div=containers[ordinal-1]; h=div.select_one('.heb-text'); ep=div.find('p',recursive=False)
  if not h or not ep: raise RuntimeError(f'prayer container {ordinal}')
  clone=BeautifulSoup(str(ep),'html.parser')
  for node in clone.select('.heb-btn,.heb-text'): node.decompose()
  he=h.get_text(' ',strip=True); en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True)); prayers.append({'index':package_index,'assignedPackageId':ids[package_index-1],'sourceContainerOrdinal':ordinal,'he':he,'he_nikud':he,'en':en})
 if not prayers[0]['he'].startswith('רִבּוֹן עָלְמִין') or not prayers[0]['en'].startswith('Master of all worlds') or not prayers[-1]['he'].startswith('וְזַכֵּנוּ בְּרַחֲמֶיךָ הָרַבִּים') or any('עברית ▾' in z['en'] for z in prayers): raise RuntimeError('Prayer 33 anchors')
 prayerp=ROOT/'public/reader/likutay-tefilos/part-1/prayer-33.json'; nav=load(prayerp)['navigation']
 dump(prayerp,{'id':'lt-1-33','book':'likutay-tefilos','part':1,'torah':33,'displayNumber':33,'title':'Prayer Thirty-Three','hebrewTitle':'תפילה לג','segments':prayers,'aligned_segments':prayers,'totalParagraphs':6,'totalSegments':6,'hasEnglish':True,'navigation':nav,'superReaderRepairSource':str(htmlp.relative_to(ROOT)),'assignedPackageIds':ids,'packageIdNote':'The six source containers have no IDs; p33a–p33f are deterministic assigned package IDs.','excludedMetadata':{'dateBars':5,'dateBarText':dates,'specialBars':0,'reason':'Date bars are metadata; source ordinal 1 is Prayer 32 and ordinal 8 begins Prayer 34.'}})
 c=load(ROOT/'public/reader/likutay-nanach/volume-4/chapter-26.json'); x={int(z['index']):z for z in c['segments']}; indices=list(range(79,86))+list(range(87,96))+list(range(97,101))
 if x[78]['he'].strip()!='תורה לג' or x[86]['he'].strip()!='תורה לג.' or x[96]['he'].strip()!='תורה לג:ג' or x[101]['he'].strip()!='תורה לד': raise RuntimeError('Nanach boundaries')
 nn=[]; identities=[]
 for n,si in enumerate(indices,1):
  z=dict(x[si])
  if not z.get('he') or z.get('en'): raise RuntimeError(f'Nanach language {si}')
  z.update({'index':n,'sourceFile':'volume-4/chapter-26.json','sourceIndex':si,'sourceIdentity':f'volume-4/chapter-26.json#index={si}'}); nn.append(z); identities.append({'file':'volume-4/chapter-26.json','index':si})
 excluded=[{'file':'volume-4/chapter-26.json','index':i} for i in (78,86,96,101)]
 dump(BASE/'likutay-nanach.json',{'id':'likutay-nanach-torah-33','book':'likutay-nanach','part':1,'torah':33,'title':'ליקוטי ננח — תורה לג','segments':nn,'totalSegments':20,'hasEnglish':False,'sourceSlices':[{'file':'volume-4/chapter-26.json','indices':indices}],'excludedHeadings':excluded})
 rp=ROOT/'src/data/lm-commentaries.json'; reg=load(rp); related=reg['1']['33']['related_commentaries']; related[:]=[z for z in related if z.get('book') not in ('likutay-nanach','parparos-lechochma')]; related.extend([{'book':'parparos-lechochma','section':'section-32-torah-33-slice','sectionNumber':32,'label':'Parparos LeChochma','sectionTitle':'סימן ל"ג','url':'/reader/super/likutay-moharan/1/33/parparos-lechochma.json','sourceIndices':wanted,'totalRecords':3,'languageAvailability':{'he':True,'en':False}},{'book':'likutay-nanach','section':'chapter-26-torah-33-slice','sectionNumber':26,'label':'Likutay Nanach','sectionTitle':'תורה לג','url':'/reader/super/likutay-moharan/1/33/likutay-nanach.json','sourceIdentities':identities,'totalRecords':20,'superReaderBoundaryNote':'Exclude headings 78, 86, and 96; include substantive 79–85, 87–95, 97–100; stop before Torah 34 heading 101.'}]); dump(rp,reg)
 print('Repaired Torah 33: Pettek 11 asymmetric, Biur unavailable, Parparos 3 HE-only, prayer 6 bilingual, Nanach 20 HE-only, registry corrected.')
if __name__=='__main__': main()
