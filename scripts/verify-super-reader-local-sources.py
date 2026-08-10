#!/usr/bin/env python3
"""Regression guard for the project-owned-source Super Reader."""
from pathlib import Path
import json,re,sys

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'public/reader/super/likutay-moharan/1'
PAGES=ROOT/'src/pages/reader/super/likutay-moharan/1'
FORBIDDEN=('Sefaria','rabenubook','Mykoff','Breslov Research Institute','CC BY')
issues=[]

for n in range(1,35):
    study_path=DATA/str(n)/'torah-study.json'
    phrase_path=DATA/str(n)/'phrase-study.json'
    page_path=PAGES/f'{n}.astro'
    for path in (study_path,phrase_path,page_path):
        if not path.exists(): issues.append(f'Torah {n}: missing {path.relative_to(ROOT)}')
    if issues and (not study_path.exists() or not phrase_path.exists() or not page_path.exists()):
        continue
    study=json.loads(study_path.read_text(encoding='utf-8'))
    phrases=json.loads(phrase_path.read_text(encoding='utf-8'))
    page=page_path.read_text(encoding='utf-8')
    if study.get('sourcePolicy')!='Project-owned local sources only':
        issues.append(f'Torah {n}: wrong/missing source policy')
    segments=study.get('segments') or []
    if not segments: issues.append(f'Torah {n}: no Torah passages')
    for s in segments:
        if not str(s.get('he') or '').strip() or not str(s.get('en') or '').strip():
            issues.append(f"Torah {n} passage {s.get('index')}: missing language")
    if len(phrases.get('phrases') or []) != len(segments):
        issues.append(f'Torah {n}: phrase navigation does not match local passages')
    if re.search(r'<div class="sr-source-counts"|<p class="sr-source-credit"',page):
        issues.append(f'Torah {n}: production/source information dump returned')
    combined=study_path.read_text(encoding='utf-8')+phrase_path.read_text(encoding='utf-8')+page
    for marker in FORBIDDEN:
        if marker.lower() in combined.lower(): issues.append(f'Torah {n}: forbidden external marker {marker}')

for n in range(16,35):
    p=DATA/str(n)/'parparos-lechochma.json'
    d=json.loads(p.read_text(encoding='utf-8'))
    segments=d.get('segments') or []
    if n in (26,32):
        if segments: issues.append(f'Torah {n}: Parparos should be genuinely absent')
    elif not segments:
        issues.append(f'Torah {n}: missing local Parparos')
    elif any(not str(s.get('he') or '').strip() or not str(s.get('en') or '').strip() for s in segments):
        issues.append(f'Torah {n}: incomplete bilingual Parparos')

retired=[]
for pattern in ('import-super-reader-torah*.py','align-super-reader-torah*.py','build-super-reader-torah*-phrases.py','repair-super-reader-torah*.py','verify-super-reader-torah*.py'):
    retired.extend(ROOT.joinpath('scripts').glob(pattern))
if retired: issues.append('retired external-era scripts remain: '+', '.join(p.name for p in retired))

if issues:
    print('SUPER READER LOCAL-SOURCE GUARD FAILED')
    print('\n'.join(f'- {x}' for x in issues))
    sys.exit(1)
print('Super Reader local-source guard passed: Torahs 1-34; bilingual Torah text and available Parparos; no opening production dump or external-source markers.')
