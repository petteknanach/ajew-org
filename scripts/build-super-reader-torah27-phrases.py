#!/usr/bin/env python3
"""Build 30 exact bilingual Torah 27 phrase studies across all ten Sefaria sections."""
import json, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'public/reader/super/likutay-moharan/1/27'
SPAN=re.compile(r'<span data-inline-phrase="[^"]+">(.*?)</span>')


def unspan(value): return SPAN.sub(r'\1',value or '')
def chunks(text,count=3):
    words=list(re.finditer(r'\S+',text))
    if len(words)<count*2: raise RuntimeError(f'not enough words: {text}')
    out=[]
    for i in range(count):
        a=(i*len(words))//count; b=((i+1)*len(words))//count
        piece=text[words[a].start():words[b-1].end()].strip(' ,;:.—–-')
        if len(re.sub(r'[^A-Za-z0-9א-ת]','',piece))<5: raise RuntimeError(f'phrase too short: {piece}')
        out.append(piece)
    return out

def inline_all(text,phrases):
    cursor=0; out=[]
    for pid,phrase in phrases:
        at=text.find(phrase,cursor)
        if at<0: raise RuntimeError(f'anchor {pid}: {phrase}')
        out.extend((text[cursor:at],f'<span data-inline-phrase="{pid}">{phrase}</span>')); cursor=at+len(phrase)
    out.append(text[cursor:]); return ''.join(out)
def clean(value): return re.sub(r'\s+',' ',re.sub(r'[*_#`]','',value or '')).strip()[:700]


def main():
    study_path=BASE/'torah-study.json'; study=json.loads(study_path.read_text(encoding='utf-8'))
    pettek=json.loads((ROOT/'public/reader/pettek-nanach-commentary/torah-27.json').read_text(encoding='utf-8-sig'))
    segments=study['segments']
    if len(segments)!=33 or {int(z['sourceSection']) for z in segments}!=set(range(1,11)): raise RuntimeError('study sections')
    for segment in segments:
        for key in ('he','he_nikud','en'):
            if segment.get(key): segment[key]=unspan(segment[key])
    selected=[]
    for section in range(1,11):
        candidates=[z for z in segments if int(z['sourceSection'])==section]
        selected.append(max(candidates,key=lambda z:min(len((z['he'] or '').split()),len((z['en'] or '').split()))))
    phrases=[]; distribution={int(z['index']):3 for z in selected}
    for segment in selected:
        he_parts=chunks(segment['he']); hn_parts=chunks(segment['he_nikud']); en_parts=chunks(segment['en'])
        he_anchors=[]; hn_anchors=[]; en_anchors=[]
        classic=int(segment['classicSegment']); rec=pettek['segments'][classic-1]; layers=rec['layers']
        note=clean((layers.get('beginner') or {}).get('en') or (layers.get('intermediate') or {}).get('en') or (layers.get('scholarly') or {}).get('he'))
        for ordinal,(he,hn,en) in enumerate(zip(he_parts,hn_parts,en_parts),1):
            pid=f'{segment["index"]}-{ordinal}'; he_anchors.append((pid,he)); hn_anchors.append((pid,hn)); en_anchors.append((pid,en))
            phrases.append({'id':pid,'segment':int(segment['index']),'section':int(segment['sourceSection']),'he':he,'en':en,'enMatch':en,'info':f'“{en}” — {note}'[:1000],'source':segment['sourceRef'],'classicSegment':classic,'sourceRef':segment['sourceRef']})
        segment['he']=inline_all(segment['he'],he_anchors); segment['he_nikud']=inline_all(segment['he_nikud'],hn_anchors); segment['en']=inline_all(segment['en'],en_anchors)
    if len(phrases)!=30 or {z['section'] for z in phrases}!=set(range(1,11)): raise RuntimeError('phrase coverage')
    study_path.write_text(json.dumps(study,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (BASE/'phrase-study.json').write_text(json.dumps({'title':'Torah 27 phrase-by-phrase study guide','status':'Editorial navigation aid — sourced Hebrew and English remain textually unchanged','selectedPassages':[int(z['index']) for z in selected],'representedSections':list(range(1,11)),'distribution':distribution,'phrases':phrases},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Prepared 30 exact bilingual Torah 27 phrase entries across all 10 sections; passages {[z["index"] for z in selected]}.')

if __name__=='__main__': main()
