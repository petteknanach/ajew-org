#!/usr/bin/env python3
"""Build 30 exact bilingual Torah 10 phrase studies from the aligned witness."""
from __future__ import annotations
import json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'public/reader/super/likutay-moharan/1/10'
SELECTED=[1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,48,52,56,60,65,70]
SPAN=re.compile(r'<span data-inline-phrase="[^"]+">(.*?)</span>')
def unspan(v): return SPAN.sub(r'\1',v or '')
def words(v,n): return ' '.join(v.replace('\n',' ').split()[:n]).strip(' ,;:.—–-')
def clean(v):
 v=re.sub(r'[*_#`]','',v or ''); v=re.sub(r'\s+',' ',v).strip(); return ' '.join(re.split(r'(?<=[.!?])\s+',v)[:2])[:520].rstrip()
def inline(v,p,i):
 if p not in v: raise RuntimeError(f'Cannot exactly anchor {i}: {p!r}')
 return v.replace(p,f'<span data-inline-phrase="{i}">{p}</span>',1)
def main():
 study=json.loads((BASE/'torah-study.json').read_text(encoding='utf-8'))
 pettek=json.loads((ROOT/'public/reader/pettek-nanach-commentary/torah-10.json').read_text(encoding='utf-8'))
 pb={int(x.get('relatedSegment',x['index'])):x for x in pettek['segments']}; by={int(x['index']):x for x in study['segments']}; phrases=[]
 for s in study['segments']:
  s['he']=unspan(s['he']); s['he_nikud']=unspan(s['he_nikud']); s['en']=unspan(s['en'])
 for idx in SELECTED:
  s=by[idx]; classic=int(s['classicSegment']); layers=pb[classic]['layers']
  commentary=clean(str((layers.get('beginner') or {}).get('en') or (layers.get('intermediate') or {}).get('en') or ''))
  hp=words(s['he'],9); hpn=words(s['he_nikud'],9); em=words(s['en'],14); direct=words(s['en'],11); pid=f'{idx}-1'
  if not all((hp,hpn,em,direct,commentary)): raise RuntimeError(f'Phrase {pid} is not substantive')
  s['he']=inline(s['he'],hp,pid); s['he_nikud']=inline(s['he_nikud'],hpn,pid); s['en']=inline(s['en'],em,pid)
  phrases.append({'id':pid,'segment':idx,'he':hp,'en':direct,'enMatch':em,
    'info':f'“{direct}” — {commentary}'[:760].rstrip(),'source':s['sourceRef'],
    'classicSegment':classic,'sourceRef':s['sourceRef']})
 (BASE/'torah-study.json').write_text(json.dumps(study,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 (BASE/'phrase-study.json').write_text(json.dumps({'title':'Torah 10 phrase-by-phrase study guide','status':'Editorial navigation aid — the sourced Hebrew and English remain textually unchanged','phrases':phrases},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Prepared 30 exact bilingual Torah 10 phrase-study entries.')
if __name__=='__main__': main()
