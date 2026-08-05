#!/usr/bin/env python3
"""Validate Torah 9 aligned text, crosswalk, phrases, sources, and facsimiles."""
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/9'
def inline(t,a): return bool(re.search(rf'<span[^>]+data-inline-phrase="{re.escape(a)}"',t))
def main():
 study=json.loads((BASE/'torah-study.json').read_text(encoding='utf-8')); seg=study['segments']
 if len(seg)!=63 or [x['index'] for x in seg]!=list(range(1,64)): raise RuntimeError('Torah 9 must contain 63 contiguous aligned passages')
 if any(not x.get('he') or not x.get('he_nikud') or not x.get('en') for x in seg): raise RuntimeError('Every Torah 9 passage must be fully bilingual')
 expected=[1,2,3,4,5]+[6]*12+[7]*11+[8]*2+[9]*3+[10]+[11]*11+[12]*18
 if len(expected)!=63 or [int(x['classicSegment']) for x in seg]!=expected: raise RuntimeError('Torah 9 classic crosswalk is incorrect')
 if 'attribution' not in seg[0]['sourceRef'] or 'opening verse' not in seg[1]['sourceRef']: raise RuntimeError('Opening attribution/verse split missing')
 if 'Rashbam' not in seg[33]['sourceRef'] or int(seg[33]['classicSegment'])!=10: raise RuntimeError('Restored Rashbam gloss must be passage 34')
 if 'people who cover up the miracles' not in seg[59]['en'] or 'Shepherd' not in seg[60]['en']:
  raise RuntimeError('Torah 9 section 6 English semantic realignment is missing')
 if 'editorial English restoration' not in seg[61]['sourceRef'] or not seg[58].get('englishSourceAside'):
  raise RuntimeError('Torah 9 section 6 omitted mate/English recap provenance is missing')
 phrases=json.loads((BASE/'phrase-study.json').read_text(encoding='utf-8'))['phrases']
 if len(phrases)!=30 or len({x['id'] for x in phrases})!=30: raise RuntimeError('Expected 30 unique phrase anchors')
 if int(phrases[0]['segment'])!=2 or int(phrases[-1]['segment'])!=63: raise RuntimeError('Phrase navigation must span substantive passages 2–63')
 by={int(x['index']):x for x in seg}
 for p in phrases:
  t=by[int(p['segment'])]
  if not inline(t['he'],p['id']) or not inline(t['en'],p['id']): raise RuntimeError(f"Phrase {p['id']} lacks bilingual inline anchors")
 pettek=json.loads((ROOT/'public/reader/pettek-nanach-commentary/torah-9.json').read_text(encoding='utf-8'))
 if len(pettek['segments'])!=12: raise RuntimeError('Torah 9 Pettek mismatch')
 biur=json.loads((ROOT/'public/reader/biur-halikutim/section-15.json').read_text(encoding='utf-8'))
 if len(biur['segments'])!=64 or any(not x.get('he') for x in biur['segments']): raise RuntimeError('Torah 9 Biur mismatch')
 par=json.loads((ROOT/'public/reader/parparos-lechochma/section-10.json').read_text(encoding='utf-8'))
 if len(par['segments'])!=5 or any(not x.get('he') or not x.get('en') for x in par['segments']): raise RuntimeError('Torah 9 Parparos mismatch')
 specs=[('chapter-3.json',150,151),('chapter-4.json',1,3),('chapter-5.json',1,33)]; count=0
 for name,lo,hi in specs:
  d=json.loads((ROOT/f'public/reader/likutay-nanach/volume-4/{name}').read_text(encoding='utf-8')); count+=len([x for x in d['segments'] if lo<=int(x['index'])<=hi])
 if count!=38: raise RuntimeError(f'Torah 9 Likutay Nanach mismatch: {count}')
 prayer=json.loads((ROOT/'public/reader/likutay-tefilos/part-1/prayer-9.json').read_text(encoding='utf-8'))
 if len(prayer['segments'])!=5 or any(not x.get('he') or not x.get('en') or 'עברית ▾' in x.get('en','') for x in prayer['segments']): raise RuntimeError('Torah 9 prayer is not five clean bilingual blocks')
 m=json.loads((BASE/'peer-halikutim/manifest.json').read_text(encoding='utf-8'))
 if m['sourcePageRange']!=[109,150] or len(m['pages'])!=42: raise RuntimeError('Torah 9 Pe’er range must be PDF pages 109–150')
 names={f'page-{n}.webp' for n in range(109,151)}; actual={p.name for p in (BASE/'peer-halikutim').glob('page-*.webp')}
 if actual!=names: raise RuntimeError('Torah 9 Pe’er images missing or out of range')
 covered={int(n) for page in m['pages'] for n in page.get('relatedPassages',[])}
 if covered!=set(range(1,64)): raise RuntimeError('Torah 9 Pe’er navigation must cover all 63 passages')
 print('Validated Torah 9: 63 passages, 12 classic segments, 30 phrases, 5 prayer blocks, 38 Likutay Nanach records, 42 Pe’er pages.')
if __name__=='__main__': main()
