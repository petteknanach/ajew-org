#!/usr/bin/env python3
"""Apply frozen Torah 32 commentary, prayer, Nanach, and registry repairs."""
import json,re,shutil
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/32'; AV={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
SOURCE=Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Lekutay Tefilos 1/likutay_tefilos_32_33_34_prayers32_33_34.html')
def load(p): return json.loads(Path(p).read_text(encoding='utf-8-sig').replace('\x00',''))
def dump(p,d): Path(p).parent.mkdir(parents=True,exist_ok=True); Path(p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def main():
 study=load(BASE/'torah-study.json'); assert len(study['segments'])==7
 pp=ROOT/'public/reader/pettek-nanach-commentary/torah-32.json'; p=load(pp)
 if len(p['segments'])!=2 or [int(z['relatedSegment']) for z in p['segments']]!=[1,2]: raise RuntimeError('Pettek keys')
 expected=[[1],list(range(1,8))]
 for z,aligned in zip(p['segments'],expected):
  actual={layer:{lang:bool(str((z['layers'].get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in AV}
  if actual!=AV: raise RuntimeError(f'Pettek availability {z["index"]}')
  z['alignedPassage']=aligned[0]; z['alignedPassages']=aligned
 p.update({'totalSegments':2,'inScopeRecords':2,'layerAvailability':AV,'superReaderCoverageNote':'Both Classic-keyed records are in scope. Beginner is English-only, intermediate bilingual, and scholarly Hebrew-only; no missing translations are manufactured.'}); dump(pp,p)
 unavailable=lambda id_,book,title,note:{'id':id_,'book':book,'part':1,'torah':32,'title':title,'segments':[],'totalSegments':0,'hasEnglish':False,'availability':'unavailable','repairNote':note}
 dump(BASE/'biur-halikutim.json',unavailable('bhl-32-super','biur-halikutim','ביאור הליקוטים — unavailable','No canonical Torah 32 package exists; numeric section files are semantically Torahs 35/49.'))
 dump(BASE/'parparos-lechochma.json',unavailable('plc-32-super','parparos-lechochma','פרפראות לחכמה — unavailable','section-32.json is Torah 33; shifted legacy English and cross-Torah content are excluded.'))
 htmlp=ROOT/'public/teachings/likutay-tefilos/likutay_tefilos_32_33_34_prayers32_33_34.html'; htmlp.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(SOURCE,htmlp)
 soup=BeautifulSoup(htmlp.read_text(encoding='utf-8'),'html.parser'); containers=soup.select('div.para'); dates=[re.sub(r'\s+',' ',x.get_text(' ',strip=True).replace('\xa0',' ')).strip() for x in soup.select('.date-bar')]
 if len(containers)!=13 or not dates or dates[0]!='23 Kislev': raise RuntimeError(f'combined prayer source changed: {len(containers)} {dates}')
 div=containers[0]; h=div.select_one('.heb-text'); ep=div.find('p',recursive=False)
 if not h or not ep: raise RuntimeError('prayer 32 container')
 clone=BeautifulSoup(str(ep),'html.parser')
 for n in clone.select('.heb-btn,.heb-text'): n.decompose()
 he=h.get_text(' ',strip=True); en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True))
 if not he.startswith('אֲדֹנָי שְׂפָתַי תִּפְתָּח') or not en.startswith('My Lord, open my lips') or 'עברית ▾' in en: raise RuntimeError('Prayer 32 anchors')
 old=load(ROOT/'public/reader/likutay-tefilos/part-1/prayer-32.json'); nav=old['navigation']; rec={'index':1,'assignedPackageId':'p32a','sourceContainerOrdinal':1,'he':he,'he_nikud':he,'en':en}
 dump(ROOT/'public/reader/likutay-tefilos/part-1/prayer-32.json',{'id':'lt-1-32','book':'likutay-tefilos','part':1,'torah':32,'displayNumber':32,'title':'Prayer Thirty-Two','hebrewTitle':'תפילה לב','segments':[rec],'aligned_segments':[rec],'totalParagraphs':1,'totalSegments':1,'hasEnglish':True,'navigation':nav,'superReaderRepairSource':str(htmlp.relative_to(ROOT)),'assignedPackageIds':['p32a'],'packageIdNote':'The source container has no ID; p32a is a deterministic assigned package ID.','excludedMetadata':{'dateBars':1,'dateBarText':['23 Kislev'],'specialBars':0,'reason':'23 Kislev is metadata; the remaining 12 containers are Prayers 33–34.'}})
 c=load(ROOT/'public/reader/likutay-nanach/volume-4/chapter-26.json'); x={int(z['index']):z for z in c['segments']}
 if x[67]['he'].strip()!='תורה לב' or x[78]['he'].strip()!='תורה לג': raise RuntimeError('Nanach boundaries')
 nn=[]; identities=[]
 for n,si in enumerate(range(68,78),1):
  z=dict(x[si]);
  if not z.get('he') or z.get('en'): raise RuntimeError(f'Nanach language {si}')
  z.update({'index':n,'sourceFile':'volume-4/chapter-26.json','sourceIndex':si,'sourceIdentity':f'volume-4/chapter-26.json#index={si}'}); nn.append(z); identities.append({'file':'volume-4/chapter-26.json','index':si})
 dump(BASE/'likutay-nanach.json',{'id':'likutay-nanach-torah-32','book':'likutay-nanach','part':1,'torah':32,'title':'ליקוטי ננח — תורה לב','segments':nn,'totalSegments':10,'hasEnglish':False,'sourceSlices':[{'file':'volume-4/chapter-26.json','range':[68,77]}],'excludedHeadings':[{'file':'volume-4/chapter-26.json','index':67},{'file':'volume-4/chapter-26.json','index':78}]})
 rp=ROOT/'src/data/lm-commentaries.json'; reg=load(rp); related=reg['1']['32']['related_commentaries']; related[:]=[z for z in related if z.get('book') not in ('likutay-nanach','parparos-lechochma')]; related.append({'book':'likutay-nanach','section':'chapter-26-torah-32-slice','sectionNumber':26,'label':'Likutay Nanach','sectionTitle':'תורה לב','url':'/reader/super/likutay-moharan/1/32/likutay-nanach.json','sourceIdentities':identities,'totalRecords':10,'superReaderBoundaryNote':'Exclude heading 67; include 68–77; stop before Torah 33 heading 78.'}); dump(rp,reg)
 print('Repaired Torah 32: Pettek 2 asymmetric, Biur/Parparos unavailable, prayer 1 bilingual, Nanach 10 Hebrew-only, registry corrected.')
if __name__=='__main__': main()
