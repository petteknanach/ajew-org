#!/usr/bin/env python3
"""Apply the frozen Torah 27 commentary, prayer, Nanach, registry, and language repairs."""
import json, re
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/reader/super/likutay-moharan/1/27'
AV = {'beginner': {'he': False, 'en': True}, 'intermediate': {'he': True, 'en': True}, 'scholarly': {'he': True, 'en': False}}


def load(path): return json.loads(Path(path).read_text(encoding='utf-8-sig').replace('\x00', ''))
def dump(path, data):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    study = load(BASE / 'torah-study.json')
    if len(study['segments']) != 33: raise RuntimeError('study count')
    by_classic = {}
    for segment in study['segments']:
        by_classic.setdefault(int(segment['classicSegment']), []).append(int(segment['index']))
    expected = {1:[1], 2:[2], 3:[3,4], 4:[5], 5:[6,7], 6:[8,9], 7:[10], 8:list(range(11,20)), 9:list(range(20,24)), 10:list(range(24,34))}
    if by_classic != expected: raise RuntimeError(f'classic crosswalk {by_classic}')

    pettek_path = ROOT / 'public/reader/pettek-nanach-commentary/torah-27.json'
    pettek = load(pettek_path)
    if len(pettek['segments']) != 10: raise RuntimeError('Pettek count')
    for record in pettek['segments']:
        actual = {layer: {lang: bool(str((record['layers'].get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in AV}
        if actual != AV: raise RuntimeError(f'Pettek availability {record["index"]}')
        related = int(record['relatedSegment'])
        if related not in expected: raise RuntimeError(f'Pettek crosswalk {related}')
        record['alignedPassage'] = expected[related][0]
        record['alignedPassages'] = expected[related]
    pettek.update({'totalSegments': 10, 'inScopeRecords': 10, 'layerAvailability': AV, 'superReaderCoverageNote': 'All 10 records are in scope. Beginner is English-only, intermediate bilingual, and scholarly Hebrew-only; no missing translations are manufactured.'})
    dump(pettek_path, pettek)

    biur_src = load(ROOT / 'public/reader/biur-halikutim/section-27.json')
    if len(biur_src['segments']) != 14 or biur_src.get('title') != 'רציצא-סימן כ"ז': raise RuntimeError('Biur source changed')
    biur_segments=[]
    for i,z in enumerate(biur_src['segments'],1):
        if int(z['index']) != i or not z.get('he') or z.get('en'): raise RuntimeError(f'Biur language/index {i}')
        biur_segments.append({**z, 'index': i, 'sourceIndex': int(z['index']), 'sourceFile': 'public/reader/biur-halikutim/section-27.json'})
    dump(BASE/'biur-halikutim.json', {'id':'bhl-27-super','book':'biur-halikutim','part':1,'torah':27,'title':biur_src['title'],'segments':biur_segments,'totalSegments':14,'hasEnglish':False,'availability':'hebrew-only','sourceFile':'/reader/biur-halikutim/section-27.json'})

    par_src = load(ROOT / 'public/reader/parparos-lechochma/section-27.json')
    if [int(z['index']) for z in par_src['segments']] != [2,4,6] or par_src.get('title') != 'סימן כ"ז-מאמר רציצא': raise RuntimeError('Parparos source changed')
    z2,z4,z6=par_src['segments']
    p2=z2['en'].split('\n\n'); p4=z4['en'].split('\n\n'); p6=z6['en'].split('\n\n')
    anchors = [
        (p2[0].startswith('Siman Twenty-Seven'), p2[-1].startswith('The author writes')),
        (len(p4)==4 and p4[1].startswith('And this is its language') and 'Zohar Beshalach' in p4[2], p4[3].startswith('And see Midrash Rabbah Beshalach')),
        (len(p6)==6 and p6[1].startswith('For to the splendor') and p6[2].endswith('aspect of the covenant.'), p6[3].startswith('There — Letter Khes') and p6[-1].endswith('further elaboration.')),
    ]
    if not all(all(pair) for pair in anchors): raise RuntimeError('Parparos repair anchors changed')
    repaired_en = ['\n\n'.join(p2 + [p4[1],p4[2]]), '\n\n'.join([p4[3],p6[1],p6[2]]), '\n\n'.join(p6[3:])]
    par_segments=[]
    for i,(source,en) in enumerate(zip((z2,z4,z6),repaired_en),1):
        if not source.get('he') or not en: raise RuntimeError('Parparos empty repair')
        par_segments.append({'index':i,'sourceIndex':int(source['index']),'sourceFile':'public/reader/parparos-lechochma/section-27.json','he':source['he'],'he_nikud':source.get('he_nikud') or source['he'],'en':en})
    dump(BASE/'parparos-lechochma.json', {'id':'plc-27-super','book':'parparos-lechochma','part':1,'torah':27,'title':par_src['title'],'segments':par_segments,'totalSegments':3,'hasEnglish':True,'availability':'bilingual-repaired','repairNote':'Explicit bounded reuse of exact legacy English from physical indices 2, 4, and 6; shifted/interleaved paragraphs reassembled without translation or rewriting.','sourceIndices':[2,4,6]})

    html_path = ROOT / 'public/teachings/likutay-tefilos/likutay_tefilos_27_prayer27.html'
    soup=BeautifulSoup(html_path.read_text(encoding='utf-8'),'html.parser')
    dates=[n.get_text(' ',strip=True).replace('\xa0',' ') for n in soup.select('.date-bar')]
    if len(dates)!=1 or '5th of Kislev' not in dates[0]: raise RuntimeError(f'date bars {dates}')
    ids=[f'p27{chr(97+i)}' for i in range(11)]; prayers=[]
    for i,div in enumerate(soup.select('div.para'),1):
        hebrew=div.select_one('.heb-text'); english_p=div.find('p',recursive=False)
        if not hebrew or not english_p or i>11 or hebrew.get('id')!=ids[i-1]: raise RuntimeError(f'prayer {i}')
        clone=BeautifulSoup(str(english_p),'html.parser')
        for node in clone.select('.heb-btn,.heb-text'): node.decompose()
        he=hebrew.get_text(' ',strip=True); en=re.sub(r'\s+([,.;:!?])',r'\1',clone.get_text(' ',strip=True))
        prayers.append({'index':i,'sourceId':hebrew['id'],'he':he,'he_nikud':he,'en':en})
    if len(prayers)!=11 or any(not z['he'] or not z['en'] or 'עברית ▾' in z['en'] for z in prayers): raise RuntimeError('prayer blocks')
    prayer_path=ROOT/'public/reader/likutay-tefilos/part-1/prayer-27.json'; old=load(prayer_path)
    navigation=old.get('navigation') or {'prevUrl':'/reader/likutay-tefilos/1/26','nextUrl':'/reader/likutay-tefilos/1/28'}
    dump(prayer_path, {'id':'lt-1-27','book':'likutay-tefilos','part':1,'torah':27,'displayNumber':27,'title':'Prayer Twenty-Seven','hebrewTitle':'תפילה כז','segments':prayers,'aligned_segments':prayers,'totalParagraphs':11,'totalSegments':11,'hasEnglish':True,'navigation':navigation,'superReaderRepairSource':str(html_path.relative_to(ROOT)),'excludedMetadata':{'dateBars':1,'dateBarText':dates,'specialBars':0,'reason':'Date bar is metadata, not prayer prose'}})

    nanach_data=load(ROOT/'public/reader/likutay-nanach/volume-4/chapter-25.json'); by_index={int(z['index']):z for z in nanach_data['segments']}
    if by_index[78]['he'].strip()!='תורה כז' or by_index[83]['he'].strip()!='תורה כח': raise RuntimeError('Nanach boundaries')
    nn=[]
    for i,source_index in enumerate(range(79,83),1):
        source=dict(by_index[source_index])
        if not source.get('he') or source.get('en'): raise RuntimeError('Nanach language truth')
        source.update({'index':i,'sourceFile':'volume-4/chapter-25.json','sourceIndex':source_index,'sourceIdentity':f'volume-4/chapter-25.json#index={source_index}'})
        nn.append(source)
    dump(BASE/'likutay-nanach.json', {'id':'likutay-nanach-torah-27','book':'likutay-nanach','part':1,'torah':27,'title':'ליקוטי ננח — תורה כז','segments':nn,'totalSegments':4,'hasEnglish':False,'sourceSlice':{'file':'volume-4/chapter-25.json','firstIndex':79,'lastIndex':82},'excludedBoundaries':[78,83]})

    registry_path=ROOT/'src/data/lm-commentaries.json'; registry=load(registry_path); related=registry['1']['27']['related_commentaries']
    nnreg=[z for z in related if z.get('book')=='likutay-nanach']
    if len(nnreg)!=1: raise RuntimeError('registry')
    nnreg[0].update({'section':'chapter-25-torah-27-slice','sectionNumber':25,'sectionTitle':'תורה כז','url':'/reader/super/likutay-moharan/1/27/likutay-nanach.json','sourceIndices':[79,80,81,82],'totalRecords':4,'superReaderBoundaryNote':'Chapter 25 heading 78 excluded; substantive indices 79–82 only; stop before Torah 28 heading 83. Stale chapter 31 is unrelated.'})
    dump(registry_path,registry)
    print('Repaired Torah 27: Pettek 10 asymmetric, Biur 14 HE-only, Parparos 3 bilingual repaired, prayer 11 bilingual, Nanach 4 HE-only, registry corrected.')

if __name__=='__main__': main()
