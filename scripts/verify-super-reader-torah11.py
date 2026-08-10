#!/usr/bin/env python3
"""Validate the complete Torah 11 Full Super Reader production package."""
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'public/reader/super/likutay-moharan/1/11'
def load(p):return json.loads(p.read_text(encoding='utf-8'))
def unspan(v):return re.sub(r'<span[^>]*>|</span>','',v or '')
def inline(t,a):return bool(re.search(rf'<span[^>]+data-inline-phrase="{re.escape(a)}"',t))
def main():
 classic=load(ROOT/'public/reader/likutay-moharan/part-1/torah-11.json');study=load(BASE/'torah-study.json');seg=study['segments']
 if len(classic['segments'])!=15 or len(classic['aligned_segments'])!=61:raise RuntimeError('Classic constants must be 15/61')
 if len(seg)!=59 or [x['index'] for x in seg]!=list(range(1,60)):raise RuntimeError('Study must contain 59 contiguous displayed passages')
 if study.get('sefariaPassages')!=31 or study.get('classicSupplementRange')!=[34,61]:raise RuntimeError('Sefaria/supplement metadata mismatch')
 expected=[1]+[3]*6+[5]*4+[7]*3+[8]*4+[9]*3+[10]*3+[11]*7+[12]*9+[13]*6+[14]*12+[15]
 if [int(x['classicSegment']) for x in seg]!=expected:raise RuntimeError('Exact Classic crosswalk mismatch')
 supplements=seg[31:]
 if [x.get('classicAlignedIndex') for x in supplements]!=list(range(34,62)) or any('absent from Sefaria' not in x.get('sourceRef','') for x in supplements):raise RuntimeError('Classic supplement labeling/range mismatch')
 for shown,original in zip(supplements,classic['aligned_segments'][33:61]):
  if unspan(shown['he'])!=original['he'] or unspan(shown['en'])!=original['en']:raise RuntimeError(f"Classic supplement record {original['index']} changed")
 phrases=load(BASE/'phrase-study.json')['phrases'];by={x['index']:x for x in seg}
 if len(phrases)!=30 or len({x['id'] for x in phrases})!=30:raise RuntimeError('Expected 30 unique phrases')
 for p in phrases:
  s=by[int(p['segment'])]
  if not all(str(p.get(k,'')).strip() for k in ('he','en','enMatch','info','sourceRef')):raise RuntimeError(f"Phrase {p.get('id')} not substantive")
  if p['he'] not in unspan(s['he']) or p['enMatch'] not in unspan(s['en']) or not all(inline(s[k],p['id']) for k in ('he','he_nikud','en')):raise RuntimeError(f"Phrase {p['id']} not exactly anchored")
 pettek=load(ROOT/'public/reader/pettek-nanach-commentary/torah-11.json')
 if len(pettek['segments'])!=15 or [int(x['relatedSegment']) for x in pettek['segments']]!=list(range(1,16)):raise RuntimeError('Pettek must have 15 synchronized records')
 for p in pettek['segments']:
  layers=p.get('layers',{})
  if not (layers.get('beginner',{}).get('en') and layers.get('intermediate',{}).get('he') and layers.get('intermediate',{}).get('en') and layers.get('scholarly',{}).get('he')):raise RuntimeError('Pettek layer coverage mismatch')
 biur=load(ROOT/'public/reader/biur-halikutim/section-17.json')
 if biur.get('torah')!=11 or biur.get('displayNumber')!=11 or len(biur['segments'])!=142:raise RuntimeError('Biur metadata/count mismatch')
 par=load(ROOT/'public/reader/parparos-lechochma/section-12.json')
 if par.get('torah')!=11 or len(par['segments'])!=4 or [int(x['index']) for x in par['segments']]!=[2,4,6,8] or any(not x.get('he') or not x.get('en') for x in par['segments']):raise RuntimeError('Parparos mismatch')
 prayer=load(ROOT/'public/reader/likutay-tefilos/part-1/prayer-11.json')
 if prayer.get('id')!='lt-1-11' or prayer.get('part')!=1 or len(prayer['segments'])!=6 or any(not x.get('he') or not x.get('en') for x in prayer['segments']):raise RuntimeError('Prayer mismatch')
 records=[]
 for name,lo,hi in [('chapter-8.json',14,33),('chapter-9.json',1,4)]:
  d=load(ROOT/'public/reader/likutay-nanach/volume-4'/name);records += [x for x in d['segments'] if lo<=int(x['index'])<=hi]
 if len(records)!=24 or any(not x.get('he') for x in records):raise RuntimeError('Likutay Nanach must have 24 substantive records')
 manifest=load(BASE/'peer-halikutim/manifest.json')
 if manifest.get('hebrewBooksId')!=54912 or manifest.get('sourcePageRange')!=[198,241] or len(manifest['pages'])!=44:raise RuntimeError('Pe’er manifest mismatch')
 names={f'page-{n}.webp' for n in range(198,242)};actual={p.name for p in (BASE/'peer-halikutim').glob('page-*.webp')}
 if actual!=names or not (BASE/'peer-halikutim/peer-halikutim-torah-11.pdf').is_file():raise RuntimeError('Pe’er assets mismatch')
 if {int(n) for p in manifest['pages'] for n in p.get('relatedPassages',[])}!=set(range(1,60)):raise RuntimeError('Pe’er passage coverage mismatch')
 astro=(ROOT/'src/pages/reader/super/likutay-moharan/1/11.astro').read_text(encoding='utf-8');sources=set(re.findall(r'data-open-source="([^"]+)"',astro))
 if sources!={'phrase','guide','pettek','biur','parparos','nanach','prayer','peer','notes'}:raise RuntimeError(f'Expected nine study layers, got {sorted(sources)}')
 if 'chapter-8.json' not in astro or 'chapter-9.json' not in astro or '14, 33' not in astro or '1, 4' not in astro:raise RuntimeError('Nanach cross-source selection missing')
 discovery=[ROOT/'src/pages/reader/likutay-moharan/index.astro',ROOT/'src/pages/reader/likutay-moharan/[part]/index.astro',ROOT/'src/pages/reader/likutay-moharan/[part]/[torah].astro']
 for p in discovery:
  text=p.read_text(encoding='utf-8-sig').replace('\x00','')
  if '/reader/super/likutay-moharan/1/11' not in text and '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]' not in text:raise RuntimeError(f'Discovery missing in {p}')
 print('Validated Torah 11: 31 Sefaria + 28 labeled Classic supplement passages, exact 15/61 crosswalk, 30 exact bilingual phrases, 9 study layers, 15 Pettek, 142 Biur, 4 Parparos, 24 Likutay Nanach, 6 prayer blocks, 44 Pe’er pages (198–241).')
if __name__=='__main__':main()
