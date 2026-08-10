#!/usr/bin/env python3
"""Validate the complete Torah 10 Full Super Reader production package."""
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/10'
RASHBAM='רשב"ם: בזעי - בקעים דכתיב: ותבקע האדמה וגו\' קטרא - עשן. שקל גבבא דעמרא - לקח גזת צמר ושראה במים. ואחרך אחרוכי - הני גבבי, ואף על פי ששרו אותה במים. אצית - הסכת ושמע. ושמעת דקאמרי - שהרי ירדו חיים שאולה. כל תלתין יומין - כל ראש חדש. בקלחת שמהפכין אותו כדי שתתבשל:'
def inline(t,a): return bool(re.search(rf'<span[^>]+data-inline-phrase="{re.escape(a)}"',t))
def unspan(v): return re.sub(r'<span[^>]*>|</span>','',v or '')
def load(path): return json.loads(path.read_text(encoding='utf-8'))
def main():
 study=load(BASE/'torah-study.json'); seg=study['segments']
 if len(seg)!=70 or [x['index'] for x in seg]!=list(range(1,71)): raise RuntimeError('Torah 10 must contain 70 contiguous passages')
 if any(not x.get('he') or not x.get('he_nikud') for x in seg): raise RuntimeError('All passages require Hebrew and pointed Hebrew')
 if [x['index'] for x in seg if not x.get('en')] != [49]: raise RuntimeError('Only Hebrew-only Rashbam passage 49 may have blank English')
 expected=[1,3,5]+[7]*5+[9]*6+[10]*3+[11]*6+[12]*2+[14]*5+[16]*2+[18]*3+[19]*11+[20,21,22]+[23]*9+[24]*7+[25,26]+[27]*3
 if len(expected)!=70 or [int(x['classicSegment']) for x in seg]!=expected: raise RuntimeError('Exact 27-segment Classic crosswalk is incorrect')
 gloss=seg[48]
 if unspan(gloss['he'])!=RASHBAM or gloss['en'] or gloss['classicSegment']!=22 or 'absent from Sefaria Hebrew' not in gloss['sourceRef']: raise RuntimeError('Labeled Hebrew-only Rashbam gloss is not exact')
 if 'Moshe and his Torah are true' not in unspan(seg[47]['en']) or 'Once every thirty days' not in unspan(seg[47]['en']): raise RuntimeError('10:9:2 quoted aggadah remainder was not recombined')
 if 'those swallowed up with Korach' not in unspan(seg[49]['en']) or 'I saw two cracks' in unspan(seg[49]['en']): raise RuntimeError('10:9:3 commentary boundary is incorrect')
 if not unspan(seg[50]['en']).startswith('I saw two cracks'): raise RuntimeError('10:9:4 commentary boundary is incorrect')
 if '{desires the prayers of the tzaddikim.' not in unspan(seg[69]['en']) or 'pray for him}' not in unspan(seg[69]['en']): raise RuntimeError('Sefaria 10:11:4 bracketed editorial restoration was not preserved')
 phrases=load(BASE/'phrase-study.json')['phrases']
 if len(phrases)!=30 or len({x['id'] for x in phrases})!=30: raise RuntimeError('Expected 30 unique phrase studies')
 by={int(x['index']):x for x in seg}
 for p in phrases:
  s=by[int(p['segment'])]
  if not all(str(p.get(k,'')).strip() for k in ('he','en','enMatch','info','sourceRef')): raise RuntimeError(f"Phrase {p.get('id')} is not substantive")
  if p['he'] not in unspan(s['he']) or p['enMatch'] not in unspan(s['en']): raise RuntimeError(f"Phrase {p['id']} is not an exact bilingual substring")
  if not inline(s['he'],p['id']) or not inline(s['he_nikud'],p['id']) or not inline(s['en'],p['id']): raise RuntimeError(f"Phrase {p['id']} lacks exact inline anchors")
 pettek=load(ROOT/'public/reader/pettek-nanach-commentary/torah-10.json')
 if len(pettek['segments'])!=27 or [int(x['relatedSegment']) for x in pettek['segments']]!=list(range(1,28)): raise RuntimeError('Pettek must have 27 synchronized segments')
 for p in pettek['segments']:
  layers=p.get('layers',{})
  if not (layers.get('beginner',{}).get('en') and layers.get('intermediate',{}).get('he') and layers.get('intermediate',{}).get('en') and layers.get('scholarly',{}).get('he')): raise RuntimeError('Pettek layer coverage mismatch')
 biur=load(ROOT/'public/reader/biur-halikutim/section-16.json')
 if biur.get('title')!="ואלה המשפטים סי' י'" or len(biur['segments'])!=124 or any(not x.get('he') for x in biur['segments']): raise RuntimeError('Biur must be the complete 124-entry section 16')
 par=load(ROOT/'public/reader/parparos-lechochma/section-11.json')
 if len(par['segments'])!=24 or [int(x['index']) for x in par['segments']]!=list(range(2,49,2)) or any(not x.get('he') or not x.get('en') for x in par['segments']): raise RuntimeError('Parparos must have 24 authoritative bilingual groups')
 prayer=load(ROOT/'public/reader/likutay-tefilos/part-1/prayer-10.json')
 if len(prayer['segments'])!=9 or any(not x.get('he') or not x.get('en') or 'עברית ▾' in x.get('en','') for x in prayer['segments']): raise RuntimeError('Prayer must have nine clean authoritative bilingual blocks')
 specs=[('chapter-5.json',34,39,{34,39}),('chapter-6.json',1,10,set()),('chapter-7.json',1,2,set()),('chapter-8.json',1,13,{9})]; records=[]
 for name,lo,hi,excluded in specs:
  d=load(ROOT/'public/reader/likutay-nanach/volume-4'/name)
  records += [(name,int(x['index']),x) for x in d['segments'] if lo<=int(x['index'])<=hi and int(x['index']) not in excluded]
 if len(records)!=28 or not any(n=='chapter-8.json' and i==13 for n,i,_ in records): raise RuntimeError('Likutay Nanach must have 28 substantive records and retain 8:13')
 manifest=load(BASE/'peer-halikutim/manifest.json')
 if manifest.get('hebrewBooksId')!=54912 or manifest.get('sourcePageRange')!=[151,197] or len(manifest['pages'])!=47: raise RuntimeError('Pe’er must be HebrewBooks 54912 pages 151–197')
 names={f'page-{n}.webp' for n in range(151,198)}; actual={p.name for p in (BASE/'peer-halikutim').glob('page-*.webp')}
 if actual!=names or not (BASE/'peer-halikutim/peer-halikutim-torah-10.pdf').is_file(): raise RuntimeError('Pe’er images/PDF missing or out of range')
 covered={int(n) for page in manifest['pages'] for n in page.get('relatedPassages',[])}
 if covered!=set(range(1,71)): raise RuntimeError('Pe’er navigation must cover all 70 passages')
 astro=(ROOT/'src/pages/reader/super/likutay-moharan/1/10.astro').read_text(encoding='utf-8')
 sources=set(re.findall(r'data-open-source="([^"]+)"',astro))
 if sources!={'phrase','guide','pettek','biur','parparos','nanach','prayer','peer','notes'}: raise RuntimeError(f'Expected exact nine study layers, got {sorted(sources)}')
 discovery=[ROOT/'src/pages/reader/likutay-moharan/index.astro',ROOT/'src/pages/reader/likutay-moharan/[part]/index.astro',ROOT/'src/pages/reader/likutay-moharan/[part]/[torah].astro']
 if any('/reader/super/likutay-moharan/1/10' not in p.read_text(encoding='utf-8') and ('10].includes' not in p.read_text(encoding='utf-8')) for p in discovery): raise RuntimeError('A required discovery path is missing Torah 10')
 print('Validated Torah 10: 70 passages, 27 Classic segments, 30 exact bilingual phrases, 9 study layers, 27 Pettek, 124 Biur, 24 repaired Parparos, 28 substantive Likutay Nanach, 9 prayer blocks, 47 Pe’er pages (151–197).')
if __name__=='__main__': main()
