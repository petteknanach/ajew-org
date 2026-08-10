#!/usr/bin/env python3
"""Apply frozen Torah 34 commentary, prayer, Nanach, registry, and language repairs."""
import json,re,shutil
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/34'; AV={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
EXPECTED={1:[1],2:[2],3:[3,4],4:[5,6,7],5:[8,9,10,11,12,13],6:[14,15],7:[16,17,18],8:[19,20,21,22,23,24,25],9:[26,27],10:[28,29,30,31],11:[32,33,34,35,36,37,38,39,40]}
SOURCE=Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Lekutay Tefilos 1/likutay_tefilos_32_33_34_prayers32_33_34.html')
def load(p): return json.loads(Path(p).read_text(encoding='utf-8-sig').replace('\x00',''))
def dump(p,d): Path(p).parent.mkdir(parents=True,exist_ok=True); Path(p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def main():
 study=load(BASE/'torah-study.json'); assert len(study['segments'])==40
 by={i:[int(s['index']) for s in study['segments'] if int(s['classicSegment'])==i] for i in range(1,12)}
 if by!=EXPECTED: raise RuntimeError(f'crosswalk {by}')
 pp=ROOT/'public/reader/pettek-nanach-commentary/torah-34.json'; p=load(pp)
 if len(p['segments'])!=11 or [int(z['relatedSegment']) for z in p['segments']]!=list(range(1,12)): raise RuntimeError('Pettek keys')
 for z in p['segments']:
  actual={layer:{lang:bool(str((z['layers'].get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in AV}
  if actual!=AV: raise RuntimeError(f'Pettek availability {z["index"]}: {actual}')
  aligned=EXPECTED[int(z['relatedSegment'])]; z['alignedPassage']=aligned[0]; z['alignedPassages']=aligned
 p.update({'totalSegments':11,'inScopeRecords':11,'layerAvailability':AV,'superReaderCoverageNote':'All 11 Classic-keyed records are in scope. Beginner is English-only, intermediate bilingual, and scholarly Hebrew-only; no missing translations are manufactured.'}); dump(pp,p)
 dump(BASE/'biur-halikutim.json',{'id':'bhl-34-super','book':'biur-halikutim','part':1,'torah':34,'title':'ביאור הליקוטים — unavailable','segments':[],'totalSegments':0,'hasEnglish':False,'availability':'unavailable','repairNote':'No canonical Torah 34 package exists; section-33.json is semantically Torah 52.'})
 ps=load(ROOT/'public/reader/parparos-lechochma/section-33.json'); wanted=[2,3,5,7,9,11,13]; pm={int(z['index']):z for z in ps['segments']}
 if ps.get('title')!='סימן ל"ד' or sorted(pm)!=wanted: raise RuntimeError('Parparos source changed')
 par=[]
 for n,si in enumerate(wanted,1):
  z=pm[si]
  if not z.get('he'): raise RuntimeError(f'Parparos Hebrew {si}')
  par.append({'index':n,'sourceIndex':si,'sourceFile':'public/reader/parparos-lechochma/section-33.json','he':z['he'],'he_nikud':z.get('he_nikud') or z['he'],'en':''})
 dump(BASE/'parparos-lechochma.json',{'id':'plc-34-super','book':'parparos-lechochma','part':1,'torah':34,'title':'סימן ל"ד','segments':par,'totalSegments':7,'hasEnglish':False,'availability':'hebrew-only','sourceIndices':wanted,'repairNote':'Legacy English is shifted/cross-record contaminated and is withheld rather than misrepresented.'})
 htmlp=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_32_33_34_prayers32_33_34.html'; htmlp.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(SOURCE,htmlp)
 soup=BeautifulSoup(htmlp.read_text(encoding='utf-8'),'html.parser'); containers=soup.select('div.para'); all_dates=[re.sub(r'\s+',' ',x.get_text(' ',strip=True).replace('\xa0',' ')).strip() for x in soup.select('.date-bar')]; dates=all_dates[5:]
 if len(containers)!=13 or dates!=['26 Kislev','27 Kislev','28 Kislev'] or soup.select('.special-bar'): raise RuntimeError(f'combined prayer source changed: {len(containers)} {dates}')
 prayers=[]; ids=[f'p34{chr(97+i)}' for i in range(6)]
 for package_index,ordinal in enumerate(range(8,14),1):
  div=containers[ordinal-1]; h=div.select_one('.heb-text'); ep=div.find('p',recursive=False)
  if not h or not ep: raise RuntimeError(f'prayer container {ordinal}')
  clone=BeautifulSoup(str(ep),'html.parser')
  for node in clone.select('.heb-btn,.heb-text'): node.decompose()
  he=h.get_text(' ',strip=True); en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True)); prayers.append({'index':package_index,'assignedPackageId':ids[package_index-1],'sourceContainerOrdinal':ordinal,'he':he,'he_nikud':he,'en':en})
 if not prayers[0]['he'].startswith('פִּי יְדַבֵּר חָכְמוֹת') or not prayers[0]['en'].startswith('My mouth shall speak wisdom') or not prayers[-1]['he'].startswith('וּתְזַכֵּנִי לְקַדֵּשׁ אֶת פִּי') or not prayers[-1]['en'].startswith('And grant me merit to sanctify my mouth') or any('עברית ▾' in z['en'] for z in prayers): raise RuntimeError('Prayer 34 anchors')
 prayerp=ROOT/'public/reader/likutay-tefilos/part-1/prayer-34.json'; nav=load(prayerp)['navigation']
 dump(prayerp,{'id':'lt-1-34','book':'likutay-tefilos','part':1,'torah':34,'displayNumber':34,'title':'Prayer Thirty-Four','hebrewTitle':'תפילה לד','segments':prayers,'aligned_segments':prayers,'totalParagraphs':6,'totalSegments':6,'hasEnglish':True,'navigation':nav,'superReaderRepairSource':str(htmlp.relative_to(ROOT)),'assignedPackageIds':ids,'packageIdNote':'The six source containers have no IDs; p34a–p34f are deterministic assigned package IDs.','excludedMetadata':{'dateBars':3,'dateBarText':dates,'specialBars':0,'reason':'Date bars are metadata; source ordinals 1–7 belong to Prayers 32–33.'}})
 c=load(ROOT/'public/reader/likutay-nanach/volume-4/chapter-26.json'); x={int(z['index']):z for z in c['segments']}; indices=list(range(102,129))
 if x[101]['he'].strip()!='תורה לד' or x[129]['he'].strip()!='תורה לה': raise RuntimeError('Nanach boundaries')
 nn=[]; identities=[]
 for n,si in enumerate(indices,1):
  z=dict(x[si])
  if not z.get('he') or z.get('en'): raise RuntimeError(f'Nanach language {si}')
  z.update({'index':n,'sourceFile':'volume-4/chapter-26.json','sourceIndex':si,'sourceIdentity':f'volume-4/chapter-26.json#index={si}'}); nn.append(z); identities.append({'file':'volume-4/chapter-26.json','index':si})
 dump(BASE/'likutay-nanach.json',{'id':'likutay-nanach-torah-34','book':'likutay-nanach','part':1,'torah':34,'title':'ליקוטי ננח — תורה לד','segments':nn,'totalSegments':27,'hasEnglish':False,'sourceSlices':[{'file':'volume-4/chapter-26.json','indices':indices}],'excludedHeadings':[{'file':'volume-4/chapter-26.json','index':101},{'file':'volume-4/chapter-26.json','index':129}]})
 rp=ROOT/'src/data/lm-commentaries.json'; reg=load(rp); related=reg['1']['34']['related_commentaries']; related[:]=[z for z in related if z.get('book') not in ('likutay-nanach','parparos-lechochma')]; related.extend([{'book':'parparos-lechochma','section':'section-33-torah-34-slice','sectionNumber':33,'label':'Parparos LeChochma','sectionTitle':'סימן ל"ד','url':'/reader/super/likutay-moharan/1/34/parparos-lechochma.json','sourceIndices':wanted,'totalRecords':7,'languageAvailability':{'he':True,'en':False}},{'book':'likutay-nanach','section':'chapter-26-torah-34-slice','sectionNumber':26,'label':'Likutay Nanach','sectionTitle':'תורה לד','url':'/reader/super/likutay-moharan/1/34/likutay-nanach.json','sourceIdentities':identities,'totalRecords':27,'superReaderBoundaryNote':'Exclude Torah 34 heading 101; include substantive 102–128; stop before Torah 35 heading 129.'}]); dump(rp,reg)
 print('Repaired Torah 34: Pettek 11 asymmetric, Biur unavailable, Parparos 7 HE-only, prayer 6 bilingual, Nanach 27 HE-only, registry corrected.')
if __name__=='__main__': main()
