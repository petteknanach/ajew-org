#!/usr/bin/env python3
"""Build Torah 9 phrase navigation from aligned text and synchronized commentary."""
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'public/reader/super/likutay-moharan/1/9'
SELECTED=[2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,58,61,63]
def words(v,n): return ' '.join(v.replace('\n',' ').split()[:n]).strip(' ,;:.—–-')
def clean(v):
 v=re.sub(r'[*_#`]','',v or ''); v=re.sub(r'\s+',' ',v).strip(); return ' '.join(re.split(r'(?<=[.!?])\s+',v)[:2])[:440].rstrip()
def inline(v,p,i):
 if p not in v: raise RuntimeError(f'Cannot anchor {i}: {p!r}')
 return v.replace(p,f'<span data-inline-phrase="{i}">{p}</span>',1)
def main():
 study=json.loads((BASE/'torah-study.json').read_text(encoding='utf-8'))
 pettek=json.loads((ROOT/'public/reader/pettek-nanach-commentary/torah-9.json').read_text(encoding='utf-8'))
 pb={int(x.get('relatedSegment',x['index'])):x for x in pettek['segments']}; by={int(x['index']):x for x in study['segments']}; phrases=[]
 for idx in SELECTED:
  s=by[idx]; classic=int(s['classicSegment']); layers=pb.get(classic,{}).get('layers',{}); ct=clean(str((layers.get('beginner') or {}).get('en') or (layers.get('intermediate') or {}).get('en') or ''))
  hp=words(s['he'],9); em=words(s['en'],14); direct=words(s['en'],11); pid=f'{idx}-1'
  s['he']=inline(s['he'],hp,pid); s['he_nikud']=inline(s['he_nikud'],words(s['he_nikud'],9),pid); s['en']=inline(s['en'],em,pid)
  phrases.append({'id':pid,'segment':idx,'he':hp,'en':direct,'enMatch':em,'info':f'“{direct}” — {ct or f"This line develops section {classic} of Torah 9."}'[:520].rstrip(),'source':s['sourceRef'],'classicSegment':classic,'sourceRef':s['sourceRef']})
 (BASE/'torah-study.json').write_text(json.dumps(study,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 (BASE/'phrase-study.json').write_text(json.dumps({'title':'Torah 9 phrase-by-phrase study guide','status':'Editorial navigation aid — the sourced Hebrew and English remain unchanged','phrases':phrases},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(f'Prepared {len(phrases)} Torah 9 phrase-study entries.')
if __name__=='__main__': main()
