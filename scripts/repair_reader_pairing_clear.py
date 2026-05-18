#!/usr/bin/env python3
"""Conservative repairs for clear reader HE/EN field problems.

Rules:
1. If a segment has Hebrew in en while he is empty, move en -> he.
2. If a segment has English in he while en is empty, move he -> en.
3. If en is an obvious placeholder or number-only junk paired with real Hebrew, blank en.
4. For Yisroel Saba, make aligned_segments mirror the verified paragraph
   segments, so Hebrew/English/Both/Align views all show the same corrected order.

No translation is invented.
"""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
READER=ROOT/'public'/'reader'
HE_RE=re.compile(r'[\u0590-\u05FF]')
LAT_RE=re.compile(r'[A-Za-z]')
PLACEHOLDER_RE=re.compile(r'translation not yet available|not yet translated|TODO|^\s*N/?A\s*$', re.I)
NUMERIC_RE=re.compile(r'^\s*[\d\s.,:;()\[\]\-–—]+\s*$')

def has_he(s): return bool(HE_RE.search(s or ''))
def has_lat(s): return bool(LAT_RE.search(s or ''))
def is_pure_he(s): return bool(s and has_he(s) and not has_lat(s))
def is_pure_en(s): return bool(s and has_lat(s) and not has_he(s))
def blankable_en(s): return bool(s and (PLACEHOLDER_RE.search(s) or (NUMERIC_RE.match(s) and len(s.strip())<=20)))

changed=[]
for p in sorted(READER.rglob('*.json')):
    if p.name=='catalog.json': continue
    try:
        data=json.loads(p.read_text(encoding='utf-8'))
    except Exception:
        continue
    dirty=False; fixes=[]
    # Yisroel Saba: keep aligned view consistent with paragraph view.
    rel=p.relative_to(READER).as_posix()
    if rel.startswith('yisroel-saba/') and isinstance(data.get('segments'), list):
        new=[]
        for i,s in enumerate(data['segments'],1):
            if not isinstance(s,dict): continue
            new.append({
                'index': s.get('index', i),
                'he': s.get('he',''),
                'en': s.get('en',''),
                'he_nikud': s.get('he_nikud', s.get('he','')),
            })
        if data.get('aligned_segments') != new:
            data['aligned_segments']=new
            dirty=True; fixes.append(f'yisroel_saba_aligned_segments={len(new)}')
    # Conservative field repair in normal segments only.
    for section in ('segments','aligned_segments'):
        arr=data.get(section)
        if not isinstance(arr,list): continue
        for s in arr:
            if not isinstance(s,dict): continue
            he=s.get('he'); en=s.get('en')
            if isinstance(en,str) and is_pure_he(en) and not he:
                s['he']=en; s['he_nikud']=s.get('he_nikud') or en; s['en']=''; dirty=True; fixes.append('move_en_hebrew_to_he')
            elif isinstance(he,str) and is_pure_en(he) and not en:
                s['en']=he; s['he']=''; dirty=True; fixes.append('move_he_english_to_en')
            elif isinstance(en,str) and blankable_en(en) and isinstance(he,str) and has_he(he):
                s['en']=''; dirty=True; fixes.append('blank_placeholder_or_numeric_en')
    if dirty:
        p.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        changed.append((str(p.relative_to(ROOT)), dict((k, fixes.count(k)) for k in sorted(set(fixes)))))

print(f'changed_files={len(changed)}')
for path,fixes in changed[:300]:
    print(path, fixes)
if len(changed)>300: print('...')
