#!/usr/bin/env python3
"""Build 30 exact bilingual Torah 25 phrase studies across 51 production passages."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'public/reader/super/likutay-moharan/1/25';SPAN=re.compile(r'<span data-inline-phrase="[^"]+">(.*?)</span>')
def unspan(v):return SPAN.sub(r'\1',v or '')
def excerpt(t,n):
 m=list(re.finditer(r'\S+',t)); take=min(n,max(2,len(m)//3));
 if len(m)<2:raise RuntimeError('short source')
 return t[m[0].start():m[take-1].end()].strip(' ,;:.—–-')
def inline(t,p,pid):
 at=t.find(p)
 if at<0:raise RuntimeError(f'anchor {pid}')
 return t[:at]+f'<span data-inline-phrase="{pid}">{p}</span>'+t[at+len(p):]
def clean(v):return re.sub(r'\s+',' ',re.sub(r'[*_#`]','',v or '')).strip()[:700]
def main():
 study=json.loads((BASE/'torah-study.json').read_text());p=json.loads((ROOT/'public/reader/pettek-nanach-commentary/torah-25.json').read_text(encoding='utf-8-sig'));segs=study['segments']
 if len(segs)!=51:raise RuntimeError('count')
 for s in segs:
  for k in ('he','he_nikud','en'):s[k]=unspan(s.get(k,''))
 chosen=[]
 for target in [1+round(i*50/29) for i in range(30)]:
  eligible=[i for i,s in enumerate(segs,1) if i not in chosen and all(len(re.findall(r'\S+',s.get(k,'')))>=2 for k in ('he','he_nikud','en'))];chosen.append(min(eligible,key=lambda i:(abs(i-target),i)))
 chosen.sort(); phrases=[]
 for i in chosen:
  s=segs[i-1];classic=int(s['classicSegment']);c=next(x for x in p['segments'] if int(x['relatedSegment'])==classic);layers=c['layers'];note=clean((layers.get('beginner') or {}).get('en') or (layers.get('intermediate') or {}).get('en') or (layers.get('scholarly') or {}).get('he'));he=excerpt(s['he'],7);hn=excerpt(s['he_nikud'],7);en=excerpt(s['en'],12);pid=f'{i}-1'
  s['he']=inline(s['he'],he,pid);s['he_nikud']=inline(s['he_nikud'],hn,pid);s['en']=inline(s['en'],en,pid);phrases.append({'id':pid,'segment':i,'he':he,'en':en,'enMatch':en,'info':f'“{en}” — {note}'[:1000],'source':s['sourceRef'],'classicSegment':classic,'sourceRef':s['sourceRef']})
 if len(phrases)!=30 or chosen[0]!=1 or chosen[-1]!=51:raise RuntimeError(str(chosen))
 (BASE/'torah-study.json').write_text(json.dumps(study,ensure_ascii=False,indent=2)+'\n');(BASE/'phrase-study.json').write_text(json.dumps({'title':'Torah 25 phrase-by-phrase study guide','status':'Editorial navigation aid — sourced Hebrew and English remain textually unchanged','selectedPassages':chosen,'phrases':phrases},ensure_ascii=False,indent=2)+'\n');print('Prepared 30 exact bilingual Torah 25 phrase entries from passage 1 through 51.')
if __name__=='__main__':main()
