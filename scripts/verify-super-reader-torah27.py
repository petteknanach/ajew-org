#!/usr/bin/env python3
"""Strict targeted verifier for audited Torah 27 Super Reader."""
import argparse,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/27'
SHA='7d8d2adaad23ace7197ecac35b3e2055973305b832b45581c7d27fe84c76e052'
COUNTS=[2,2,1,2,2,10,4,1,7,2]
AV={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
EXPECTED={1:[1],2:[2],3:[3,4],4:[5],5:[6,7],6:[8,9],7:[10],8:list(range(11,20)),9:list(range(20,24)),10:list(range(24,34))}
def load(p): return json.loads(Path(p).read_text(encoding='utf-8-sig').replace('\x00',''))
def plain(v): return re.sub(r'\s+',' ',re.sub(r'</?span[^>]*>','',v or '')).strip()
def req(c,m):
    if not c: raise RuntimeError(m)
def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--pending-facsimiles',action='store_true'); args=parser.parse_args()
    study=load(BASE/'torah-study.json'); segs=study['segments']
    refs=[f'Likutei Moharan 27:{s}:{l}' for s,n in enumerate(COUNTS,1) for l in range(1,n+1)]
    req(len(segs)==33 and [z['index'] for z in segs]==list(range(1,34)),'33 display records')
    req([z['sourceRef'] for z in segs]==refs,'exact refs')
    req(all(plain(z['he']) and plain(z['en']) and plain(z['he'])!=plain(z['en']) for z in segs),'bilingual witness invariant')
    req(study['productionAlignedPassages']==33 and study['productionDisplayRecords']==33 and study['sefariaSectionCounts']==COUNTS and study['structuralRestorations']==0,'counts')
    source=study['source']
    req(source['versionTitle']=='Likutey Moharan Volumes 1-11, trans. by Moshe Mykoff. Breslov Research Inst., 1986-2012' and source['license']=='CC-BY-NC' and source['versionSource']=='https://www.nli.org.il/he/books/NNL01','English license')
    req(source['heVersionTitle']=='Likutei Moharan - rabenubook.com' and source['heLicense']=='Public Domain' and source['prev']=='Likutei Moharan 26:1' and source['lastNext']=='Likutei Moharan 28:1','Hebrew license/boundaries')
    req(segs[0]['sourceRef']=='Likutei Moharan 27:1:1' and segs[-1]['sourceRef']=='Likutei Moharan 27:10:2' and 'The following relates above' in plain(segs[-2]['en']),'anchors/coda')
    by_classic={i:[z['index'] for z in segs if int(z['classicSegment'])==i] for i in range(1,11)}; req(by_classic==EXPECTED,'classic crosswalk')
    phrases=load(BASE/'phrase-study.json'); req(len(phrases['phrases'])==30 and phrases['representedSections']==list(range(1,11)),'30 phrases/10 sections')
    req(len(phrases['selectedPassages'])==10 and len(set(phrases['selectedPassages']))==10,'selected passages')
    for phrase in phrases['phrases']:
        seg=segs[int(phrase['segment'])-1]
        req(phrase['source']==phrase['sourceRef']==seg['sourceRef'],'phrase provenance')
        req(phrase['he'] in plain(seg['he']) and phrase['enMatch'] in plain(seg['en']),'exact phrase text')
        req(all(f'data-inline-phrase="{phrase["id"]}"' in seg[k] for k in ('he','he_nikud','en')),'phrase sync')
    pettek=load(ROOT/'public/reader/pettek-nanach-commentary/torah-27.json'); req(len(pettek['segments'])==10 and pettek['layerAvailability']==AV,'Pettek count/availability')
    req([z['alignedPassages'] for z in pettek['segments']]==[EXPECTED[i] for i in range(1,11)],'Pettek crosswalk')
    req(all({layer:{lang:bool(str((z['layers'].get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in AV}==AV for z in pettek['segments']),'Pettek language truth')
    biur=load(BASE/'biur-halikutim.json'); req(len(biur['segments'])==14 and [z['sourceIndex'] for z in biur['segments']]==list(range(1,15)) and all(z['he'] and not z.get('en') for z in biur['segments']) and biur['availability']=='hebrew-only','Biur 14 HE-only')
    par=load(BASE/'parparos-lechochma.json'); req(len(par['segments'])==3 and par['sourceIndices']==[2,4,6] and all(z['he'] and z['en'] for z in par['segments']),'Parparos repaired bilingual')
    req(par['segments'][0]['en'].startswith('Siman Twenty-Seven') and 'And this is its language' in par['segments'][0]['en'] and 'Zohar Beshalach' in par['segments'][0]['en'],'Parparos 1 anchors')
    req(par['segments'][1]['en'].startswith('And see Midrash Rabbah Beshalach') and par['segments'][1]['en'].endswith('aspect of the covenant.'),'Parparos 2 anchors')
    req(par['segments'][2]['en'].startswith("There — Letter Khes — \"b'hiynu d'a'al\"") and par['segments'][2]['en'].endswith('further elaboration.'),'Parparos 3 anchors')
    prayer=load(ROOT/'public/reader/likutay-tefilos/part-1/prayer-27.json'); req(len(prayer['segments'])==11 and [z['sourceId'] for z in prayer['segments']]==[f'p27{chr(97+i)}' for i in range(11)] and prayer['navigation']['prevUrl'] and prayer['navigation']['nextUrl'] and all(z['he'] and z['en'] and 'עברית ▾' not in z['en'] for z in prayer['segments']),'authoritative prayer')
    nn=load(BASE/'likutay-nanach.json'); req(len(nn['segments'])==4 and [z['sourceIndex'] for z in nn['segments']]==[79,80,81,82] and all(z['he'] and not z.get('en') for z in nn['segments']) and nn['excludedBoundaries']==[78,83],'bounded Nanach')
    related=load(ROOT/'src/data/lm-commentaries.json')['1']['27']['related_commentaries']; nnreg=[z for z in related if z.get('book')=='likutay-nanach']; req(len(nnreg)==1 and nnreg[0]['sourceIndices']==[79,80,81,82] and nnreg[0]['url'].endswith('/27/likutay-nanach.json'),'registry')
    manifest=load(BASE/'peer-halikutim/manifest.json'); req(manifest['sourceSha256']==SHA and manifest['hebrewBooksId']==66039 and manifest['sourcePageRange']==[225,273] and [z['sourcePage'] for z in manifest['pages']]==list(range(225,274)),'Pe’er range')
    assets={p.name for p in (BASE/'peer-halikutim').glob('page-*.webp')}; expected={f'page-{p}.webp' for p in range(225,274)}; pdf=(BASE/'peer-halikutim/peer-halikutim-torah-27.pdf').is_file()
    req(not (BASE/'peer-halikutim/page-274.webp').exists() and not (BASE/'peer-halikutim/page-275.webp').exists(),'excluded pages absent')
    if args.pending_facsimiles: req(not assets and not pdf and manifest['facsimileStatus'].startswith('pending'),'pending facsimiles')
    else: req(assets==expected and pdf and manifest['facsimileStatus']=='ready','facsimiles ready')
    astro=(ROOT/'src/pages/reader/super/likutay-moharan/1/27.astro').read_text(encoding='utf-8'); req(set(re.findall(r'data-open-source="([^"]+)"',astro))=={'phrase','guide','pettek','biur','parparos','nanach','prayer','peer','notes'},'nine layers')
    req('33 source-audited Sefaria leaves' in astro and 'pages 225–273' in astro and 'https://www.peer-halikutim.com/' in astro and '14 Hebrew-only' in astro and '3 repaired bilingual' in astro and '11 bilingual blocks' in astro,'route truth/credit')
    classic=(ROOT/'src/pages/reader/likutay-moharan/[part]/[torah].astro').read_text(encoding='utf-8'); directory=(ROOT/'src/pages/reader/likutay-moharan/[part]/index.astro').read_text(encoding='utf-8')
    req(classic.count('25, 26, 27]')>=2 and 'length: 27' in directory and '<= 27' in directory and "'כה','כו','כז'" in directory,'discovery')
    print('Validated Torah 27: 33 exact bilingual leaves, 30 phrases across 10 sections, 9 layers, Pettek 10 asymmetric, Biur 14 HE-only, Parparos 3 repaired bilingual, Nanach 4 HE-only, prayer 11, Pe’er 225–273; '+('facsimiles pending separately supervised conversion.' if args.pending_facsimiles else 'facsimiles ready.'))
if __name__=='__main__': main()
