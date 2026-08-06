#!/usr/bin/env python3
"""Build 30 exact bilingual Torah 11 phrase studies without changing sourced words."""
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'public/reader/super/likutay-moharan/1/11'
SELECTED=[1,2,3,4,5,7,9,11,13,15,17,19,21,23,25,27,29,31,32,34,36,38,40,42,44,46,49,52,56,59]
SPAN=re.compile(r'<span data-inline-phrase="[^"]+">(.*?)</span>')
def unspan(v):return SPAN.sub(r'\1',v or '')
def words(v,n):
 m=re.search(r'\S+(?:\s+\S+){0,%d}'%(n-1),str(v))
 return m.group(0).strip(' ,;:.—–-') if m else ''
def clean(v):
 v=re.sub(r'[*_#`]','',v or '');return re.sub(r'\s+',' ',v).strip()[:650].rstrip()
def inline(v,p,i):
 if p not in v:raise RuntimeError(f'Cannot exactly anchor {i}: {p!r}')
 return v.replace(p,f'<span data-inline-phrase="{i}">{p}</span>',1)
def main():
 study=json.loads((BASE/'torah-study.json').read_text(encoding='utf-8'));pettek=json.loads((ROOT/'public/reader/pettek-nanach-commentary/torah-11.json').read_text(encoding='utf-8'))
 pb={int(x['relatedSegment']):x for x in pettek['segments']};by={int(x['index']):x for x in study['segments']};phrases=[]
 for s in study['segments']:
  for k in ('he','he_nikud','en'):s[k]=unspan(s[k])
 for idx in SELECTED:
  s=by[idx];classic=int(s['classicSegment']);layers=pb[classic]['layers'];commentary=clean((layers.get('beginner') or {}).get('en') or (layers.get('intermediate') or {}).get('en'))
  hp=words(s['he'],9);hpn=words(s['he_nikud'],9);em=words(s['en'],14);direct=words(s['en'],11);pid=f'{idx}-1'
  if not all((hp,hpn,em,direct,commentary)):raise RuntimeError(f'Phrase {pid} is not substantive')
  s['he']=inline(s['he'],hp,pid);s['he_nikud']=inline(s['he_nikud'],hpn,pid);s['en']=inline(s['en'],em,pid)
  phrases.append({'id':pid,'segment':idx,'he':hp,'en':direct,'enMatch':em,'info':f'“{direct}” — {commentary}'[:900].rstrip(),'source':s['sourceRef'],'classicSegment':classic,'sourceRef':s['sourceRef']})
 (BASE/'torah-study.json').write_text(json.dumps(study,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');(BASE/'phrase-study.json').write_text(json.dumps({'title':'Torah 11 phrase-by-phrase study guide','status':'Editorial navigation aid — sourced Hebrew and English remain textually unchanged','phrases':phrases},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Prepared 30 exact bilingual Torah 11 phrase-study entries.')
if __name__=='__main__':main()
