#!/usr/bin/env python3
"""Build 30 exact bilingual Torah 17 phrase studies across the 100 passages."""
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/17'
SPAN=re.compile(r'<span data-inline-phrase="[^"]+">(.*?)</span>')
def unspan(v): return SPAN.sub(r'\1',v or '')
def excerpt(text,max_words):
 matches=list(re.finditer(r'\S+',text)); take=min(max_words,max(2,len(matches)//3))
 if len(matches)<2: raise RuntimeError('Phrase source too short')
 return text[matches[0].start():matches[take-1].end()].strip(' ,;:.—–-')
def inline(text,phrase,pid):
 at=text.find(phrase)
 if at<0: raise RuntimeError(f'Cannot exactly anchor {pid}')
 return text[:at]+f'<span data-inline-phrase="{pid}">{phrase}</span>'+text[at+len(phrase):]
def clean(v): return re.sub(r'\s+',' ',re.sub(r'[*_#`]','',v or '')).strip()[:700]
def main():
 study=json.loads((BASE/'torah-study.json').read_text(encoding='utf-8')); pettek=json.loads((ROOT/'public/reader/pettek-nanach-commentary/torah-17.json').read_text(encoding='utf-8-sig').replace('\x00',''))
 commentary={int(x['relatedSegment']):x for x in pettek['segments']}; segments=study['segments']
 if len(segments)!=100: raise RuntimeError('Phrase builder requires 100 passages')
 for segment in segments:
  for key in ('he','he_nikud','en'): segment[key]=unspan(segment.get(key,''))
 selected=[1+round(i*99/29) for i in range(30)]
 if len(set(selected))!=30 or selected[0]!=1 or selected[-1]!=100: raise RuntimeError('Phrase distribution failed')
 phrases=[]
 for index in selected:
  segment=segments[index-1]; classic=int(segment['classicSegment']); layers=commentary[classic]['layers']
  note=clean((layers.get('beginner') or {}).get('en') or (layers.get('intermediate') or {}).get('en') or (layers.get('scholarly') or {}).get('he'))
  he=excerpt(segment['he'],7); he_nikud=excerpt(segment['he_nikud'],7); en=excerpt(segment['en'],12); pid=f'{index}-1'
  segment['he']=inline(segment['he'],he,pid); segment['he_nikud']=inline(segment['he_nikud'],he_nikud,pid); segment['en']=inline(segment['en'],en,pid)
  phrases.append({'id':pid,'segment':index,'he':he,'en':en,'enMatch':en,'info':f'“{en}” — {note}'[:1000],'source':segment.get('sourceRef') or segment.get('sourceCitation'),'classicSegment':classic,'sourceRef':segment.get('sourceRef')})
 if len(phrases)!=30 or len({x['id'] for x in phrases})!=30: raise RuntimeError('Expected exactly 30 phrases')
 (BASE/'torah-study.json').write_text(json.dumps(study,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 (BASE/'phrase-study.json').write_text(json.dumps({'title':'Torah 17 phrase-by-phrase study guide','status':'Editorial navigation aid — sourced Hebrew and English remain textually unchanged','selectedPassages':selected,'phrases':phrases},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Prepared 30 exact bilingual Torah 17 phrase entries distributed from passage 1 through passage 100.')
if __name__=='__main__': main()
