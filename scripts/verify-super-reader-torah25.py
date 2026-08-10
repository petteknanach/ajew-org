#!/usr/bin/env python3
"""Strict targeted verifier for audited Torah 25 Super Reader."""
import argparse,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/25'; COUNTS=[10,2,5,22,1,3,3,3,1]; SHA='7d8d2adaad23ace7197ecac35b3e2055973305b832b45581c7d27fe84c76e052'; AV={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
def load(p): return json.loads(Path(p).read_text(encoding='utf-8-sig').replace('\x00',''))
def plain(v): return re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',v or '')).strip()
def req(c,m):
 if not c: raise RuntimeError(m)
def main():
 a=argparse.ArgumentParser(); a.add_argument('--pending-facsimiles',action='store_true'); x=a.parse_args(); st=load(BASE/'torah-study.json'); s=st['segments']; sef=[z for z in s if z.get('sourceRef')]
 refs=[f'Likutei Moharan 25:{sec}:{leaf}' for sec,n in enumerate(COUNTS,1) for leaf in range(1,n+1)]
 req(len(s)==51 and [z['index'] for z in s]==list(range(1,52)) and len(sef)==50 and [z['sourceRef'] for z in sef]==refs,'51 passages / 50 exact refs')
 req(all(plain(z['he']) and plain(z['en']) and plain(z['he'])!=plain(z['en']) for z in s),'bilingual invariant')
 req(st['sefariaSectionCounts']==COUNTS and st['productionAlignedPassages']==51 and st['sefariaPassages']==50 and st['restoredBilingualSupplements']==1,'counts')
 sup=s[1]; req(sup['type']=='classicSupplement' and sup['afterSefariaRef']=='Likutei Moharan 25:1:1' and sup['classicSegment']==2 and sup['sourceRef'] is None and sup['he'].startswith('רש"י: אחוי לן מנא') and sup['en'].startswith('[Rashi: Show us a vessel') and sup['en'].endswith('pass.]'),'Rashi supplement')
 src=st['source']; req(src['versionTitle']=='Likutey Moharan Volumes 1-11, trans. by Moshe Mykoff. Breslov Research Inst., 1986-2012' and src['license']=='CC-BY-NC' and src['heLicense']=='Public Domain' and src['lastNext']=='Likutei Moharan 26:1','licenses/boundaries')
 by={z['sourceRef'].replace('Likutei Moharan ',''):z for z in sef}; req('de st ruction' in by['25:1:2']['en'] and 'a st ill higher level' in by['25:8:2']['en'],'source typos retained'); req(all('{' in by[r]['rawSource']['en'] and '}' in by[r]['rawSource']['en'] for r in ['25:3:4','25:4:7','25:4:13']),'brace blocks')
 expected_cross=[1,2,3]+[4]*8+[5]*2+[6]*5+[7]*15+[8]*7+[9]+[10]*3+[11]*3+[12]*3+[13]
 req([z['classicSegment'] for z in s]==expected_cross,'classic crosswalk')
 ph=load(BASE/'phrase-study.json'); req(len(ph['phrases'])==30 and ph['selectedPassages'][0]==1 and ph['selectedPassages'][-1]==51,'phrases'); idx={z['index']:z for z in s}
 for q in ph['phrases']:
  z=idx[q['segment']]; req(q['source']==q['sourceRef']==z['sourceRef'] or (z['type']=='classicSupplement' and q['source'] is None),'phrase source'); req(q['he'] in plain(z['he']) and q['enMatch'] in re.sub(r'<span[^>]*>|</span>','',z['en']) and all(f'data-inline-phrase="{q["id"]}"' in z[k] for k in ('he','he_nikud','en')),'phrase sync')
 p=load(ROOT/'public/reader/pettek-nanach-commentary/torah-25.json'); req(len(p['segments'])==13 and p['layerAvailability']==AV,'Pettek'); req(all({l:{k:bool(str((z['layers'].get(l) or {}).get(k) or '').strip()) for k in ('he','en')} for l in AV}==AV for z in p['segments']),'language truth')
 b=load(BASE/'biur-halikutim.json'); req(not b['segments'] and b['availability']=='unavailable','Biur')
 par=load(BASE/'parparos-lechochma.json'); req(len(par['segments'])==3 and [z['sourceIndex'] for z in par['segments']]==[2,4,6] and all(z['he'] and not z['en'] for z in par['segments']),'Parparos')
 pr=load(ROOT/'public/reader/likutay-tefilos/part-1/prayer-25.json'); req(len(pr['segments'])==7 and [z['sourceId'] for z in pr['segments']]==[f'p25{chr(97+i)}' for i in range(7)] and pr['navigation']['prevUrl'] and pr['navigation']['nextUrl'] and all(z['he'] and z['en'] and 'עברית ▾' not in z['en'] for z in pr['segments']),'prayer')
 nn=load(BASE/'likutay-nanach.json'); ninds=list(range(43,76)); req(len(nn['segments'])==33 and [z['sourceIndex'] for z in nn['segments']]==ninds and all(z['he'] and not z.get('en') for z in nn['segments']),'Nanach')
 rel=load(ROOT/'src/data/lm-commentaries.json')['1']['25']['related_commentaries']; na=[z for z in rel if z.get('book')=='likutay-nanach']; req(len(na)==1 and na[0]['sourceIndices']==ninds and na[0]['url'].endswith('/25/likutay-nanach.json') and not any(z.get('book')=='biur-halikutim' for z in rel),'registry')
 m=load(BASE/'peer-halikutim/manifest.json'); req(m['sourceSha256']==SHA and m['hebrewBooksId']==66039 and m['sourcePageRange']==[174,216] and [z['sourcePage'] for z in m['pages']]==list(range(174,217)),'Pe’er')
 assets={p.name for p in (BASE/'peer-halikutim').glob('page-*.webp')}; exp={f'page-{i}.webp' for i in range(174,217)}; pdf=(BASE/'peer-halikutim/peer-halikutim-torah-25.pdf').is_file()
 if x.pending_facsimiles: req(not assets and not pdf and m['facsimileStatus'].startswith('pending'),'pending facsimiles')
 else: req(assets==exp and pdf and m['facsimileStatus']=='ready','facsimiles ready')
 astro=(ROOT/'src/pages/reader/super/likutay-moharan/1/25.astro').read_text(); req(set(re.findall(r'data-open-source="([^"]+)"',astro))=={'phrase','guide','pettek','biur','parparos','nanach','prayer','peer','notes'},'nine layers'); req('Unavailable for Torah 25' in astro and 'pages 174–216' in astro and 'https://www.peer-halikutim.com/' in astro and 'One exact, separately attributed bilingual Classic printed-Rashi supplement' in astro,'route')
 classic=(ROOT/'src/pages/reader/likutay-moharan/[part]/[torah].astro').read_text(); directory=(ROOT/'src/pages/reader/likutay-moharan/[part]/index.astro').read_text(); req(classic.count('25]')>=2 and 'length: 25' in directory and '<= 25' in directory and "'כה'" in directory,'discovery')
 print('Validated Torah 25: 50 Sefaria leaves + 1 exact bilingual Rashi supplement, 30 phrases, 9 layers, Pettek 13 asymmetric, Biur unavailable, Parparos 3 HE-only, Nanach 33 HE-only, prayer 7, Pe’er 174–216; '+('facsimiles pending separately supervised conversion.' if x.pending_facsimiles else 'facsimiles ready.'))
if __name__=='__main__': main()
