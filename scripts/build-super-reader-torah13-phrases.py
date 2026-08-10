#!/usr/bin/env python3
"""Build 30 exact bilingual Torah 13 phrase studies without changing sourced words."""
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/13'
SELECTED=list(range(1,60,2))
SPAN=re.compile(r'<span data-inline-phrase="[^"]+">(.*?)</span>')
def unspan(v): return SPAN.sub(r'\1',v or '')
def words(v,count):
    m=re.search(r'\S+(?:\s+\S+){0,%d}'%(count-1),str(v)); return m.group(0).strip(' ,;:.—–-') if m else ''
def clean(v): return re.sub(r'\s+',' ',re.sub(r'[*_#`]','',v or '')).strip()[:650].rstrip()
def inline(v,phrase,pid):
    if phrase not in v: raise RuntimeError(f'Cannot exactly anchor {pid}: {phrase!r}')
    return v.replace(phrase,f'<span data-inline-phrase="{pid}">{phrase}</span>',1)
def main():
    study=json.loads((BASE/'torah-study.json').read_text(encoding='utf-8')); pettek=json.loads((ROOT/'public/reader/pettek-nanach-commentary/torah-13.json').read_text(encoding='utf-8'))
    commentary={int(x['relatedSegment']):x for x in pettek['segments']}; by_index={int(x['index']):x for x in study['segments']}; phrases=[]
    for segment in study['segments']:
        for key in ('he','he_nikud','en'): segment[key]=unspan(segment.get(key,''))
    for index in SELECTED:
        segment=by_index[index]
        if segment.get('hebrewOnly') or not segment.get('en'): raise RuntimeError(f'Phrase selection {index} is not bilingual')
        classic=int(segment['classicSegment']); layers=commentary[classic]['layers']; note=clean((layers.get('beginner') or {}).get('en') or (layers.get('intermediate') or {}).get('en'))
        he=words(segment['he'],9); he_nikud=words(segment['he_nikud'],9); en_match=words(segment['en'],14); direct=words(segment['en'],11); pid=f'{index}-1'
        if not all((he,he_nikud,en_match,direct,note)): raise RuntimeError(f'Phrase {pid} is not substantive')
        segment['he']=inline(segment['he'],he,pid); segment['he_nikud']=inline(segment['he_nikud'],he_nikud,pid); segment['en']=inline(segment['en'],en_match,pid)
        phrases.append({'id':pid,'segment':index,'he':he,'en':direct,'enMatch':en_match,'info':f'“{direct}” — {note}'[:900].rstrip(),'source':segment['sourceRef'],'classicSegment':classic,'sourceRef':segment['sourceRef']})
    (BASE/'torah-study.json').write_text(json.dumps(study,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (BASE/'phrase-study.json').write_text(json.dumps({'title':'Torah 13 phrase-by-phrase study guide','status':'Editorial navigation aid — sourced Hebrew and English remain textually unchanged','phrases':phrases},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Prepared 30 exact bilingual Torah 13 phrase-study entries.')
if __name__=='__main__': main()
