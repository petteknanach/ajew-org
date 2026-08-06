#!/usr/bin/env python3
"""Build 30 nonoverlapping exact bilingual Torah 16 phrase studies across 11 passages."""
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/16'
SPAN=re.compile(r'<span data-inline-phrase="[^"]+">(.*?)</span>')
COUNTS=[3,2,3,3,3,3,3,3,3,2,2]
def unspan(v): return SPAN.sub(r'\1',v or '')
def clean(v): return re.sub(r'\s+',' ',re.sub(r'[*_#`]','',v or '')).strip()[:700].rstrip()
def chunks(text,count,max_words):
    matches=list(re.finditer(r'\S+',text))
    if len(matches)<count*2: raise RuntimeError(f'Not enough words for {count} nonoverlapping phrases')
    out=[]
    for i in range(count):
        a=(i*len(matches))//count; boundary=((i+1)*len(matches))//count
        b=min(boundary,a+max_words)
        start,end=matches[a].start(),matches[b-1].end()
        phrase=text[start:end].strip(' ,;:.—–-')
        if not phrase: raise RuntimeError('Empty phrase chunk')
        out.append(phrase)
    return out
def inline_many(text,items):
    cursor=0; pieces=[]
    for phrase,pid in items:
        at=text.find(phrase,cursor)
        if at<0: raise RuntimeError(f'Cannot exactly anchor {pid}: {phrase!r}')
        pieces.extend((text[cursor:at],f'<span data-inline-phrase="{pid}">{phrase}</span>')); cursor=at+len(phrase)
    pieces.append(text[cursor:]); return ''.join(pieces)
def main():
    study=json.loads((BASE/'torah-study.json').read_text(encoding='utf-8')); pettek=json.loads((ROOT/'public/reader/pettek-nanach-commentary/torah-16.json').read_text(encoding='utf-8-sig').replace('\x00',''))
    commentary={int(x['relatedSegment']):x for x in pettek['segments']}; phrases=[]
    if len(study['segments'])!=11: raise RuntimeError('Phrase builder requires the frozen 11 passages')
    for segment,count in zip(study['segments'],COUNTS):
        for key in ('he','he_nikud','en'): segment[key]=unspan(segment.get(key,''))
        index=int(segment['index']); classic=int(segment['classicSegment']); layers=commentary[classic]['layers']
        note=clean((layers.get('beginner') or {}).get('en') or (layers.get('intermediate') or {}).get('en') or (layers.get('scholarly') or {}).get('he'))
        if not note: raise RuntimeError(f'No authentic Pettek explanation for passage {index}')
        he_parts=chunks(segment['he'],count,7); nikud_parts=chunks(segment['he_nikud'],count,7); en_parts=chunks(segment['en'],count,12)
        he_marks=[]; nikud_marks=[]; en_marks=[]
        for ordinal,(he,he_nikud,en_match) in enumerate(zip(he_parts,nikud_parts,en_parts),1):
            pid=f'{index}-{ordinal}'; direct=en_match
            he_marks.append((he,pid)); nikud_marks.append((he_nikud,pid)); en_marks.append((en_match,pid))
            phrases.append({'id':pid,'segment':index,'he':he,'en':direct,'enMatch':en_match,'info':f'“{direct}” — {note}'[:1000].rstrip(),'source':segment.get('sourceRef') or segment.get('sourceCitation'),'classicSegment':classic,'sourceRef':segment.get('sourceRef')})
        segment['he']=inline_many(segment['he'],he_marks); segment['he_nikud']=inline_many(segment['he_nikud'],nikud_marks); segment['en']=inline_many(segment['en'],en_marks)
    if len(phrases)!=30 or len({p['id'] for p in phrases})!=30 or {p['segment'] for p in phrases}!=set(range(1,12)): raise RuntimeError('Expected 30 unique phrases covering all 11 passages')
    (BASE/'torah-study.json').write_text(json.dumps(study,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (BASE/'phrase-study.json').write_text(json.dumps({'title':'Torah 16 phrase-by-phrase study guide','status':'Editorial navigation aid — sourced Hebrew and English remain textually unchanged','phrases':phrases},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Prepared 30 exact, nonoverlapping bilingual Torah 16 phrase entries across all 11 passages.')
if __name__=='__main__': main()
