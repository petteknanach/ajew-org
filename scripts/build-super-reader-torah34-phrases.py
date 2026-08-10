#!/usr/bin/env python3
"""Build 30 exact bilingual Torah 34 phrase studies across all nine sections."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/34'; SPAN=re.compile(r'<span data-inline-phrase="[^"]+">(.*?)</span>')
def chunks(text,count):
 words=list(re.finditer(r'\S+',text)); out=[]
 if len(words)<count*2: raise RuntimeError('not enough words')
 for i in range(count):
  a=i*len(words)//count; b=(i+1)*len(words)//count; out.append(text[words[a].start():words[b-1].end()].strip(' ,;:.—–-'))
 return out
def inline(text,items):
 cur=0; out=[]
 for pid,p in items:
  at=text.find(p,cur)
  if at<0: raise RuntimeError((pid,p))
  out += [text[cur:at],f'<span data-inline-phrase="{pid}">{p}</span>']; cur=at+len(p)
 return ''.join(out)+text[cur:]
def clean(v): return re.sub(r'\s+',' ',re.sub(r'[*_#`]','',v or '')).strip()[:700]
def main():
 sp=BASE/'torah-study.json'; study=json.loads(sp.read_text()); p=json.loads((ROOT/'public/reader/pettek-nanach-commentary/torah-34.json').read_text(encoding='utf-8-sig')); segs=study['segments']
 if len(segs)!=40 or {int(z['sourceSection']) for z in segs}!=set(range(1,10)): raise RuntimeError('segments/sections')
 for z in segs:
  for k in ('he','he_nikud','en'): z[k]=SPAN.sub(r'\1',z[k])
 selected=[]
 for section in range(1,10):
  candidates=[z for z in segs if int(z['sourceSection'])==section]
  selected.append(max(candidates,key=lambda z:min(len(z['he'].split()),len(z['en'].split()))))
 distribution={int(z['index']):(4 if int(z['sourceSection'])<=3 else 3) for z in selected}; phrases=[]
 for z in selected:
  n=distribution[z['index']]; hs=chunks(z['he'],n); hns=chunks(z['he_nikud'],n); es=chunks(z['en'],n); ha=[]; hna=[]; ea=[]; rec=p['segments'][int(z['classicSegment'])-1]; layers=rec['layers']; note=clean((layers.get('beginner') or {}).get('en') or (layers.get('intermediate') or {}).get('en') or (layers.get('scholarly') or {}).get('he'))
  for o,(he,hn,en) in enumerate(zip(hs,hns,es),1):
   pid=f'{z["index"]}-{o}'; ha.append((pid,he)); hna.append((pid,hn)); ea.append((pid,en)); phrases.append({'id':pid,'segment':z['index'],'section':z['sourceSection'],'he':he,'en':en,'enMatch':en,'info':f'“{en}” — {note}'[:1000],'source':z['sourceRef'],'classicSegment':int(z['classicSegment']),'sourceRef':z['sourceRef']})
  z['he']=inline(z['he'],ha); z['he_nikud']=inline(z['he_nikud'],hna); z['en']=inline(z['en'],ea)
 if len(phrases)!=30 or {x['section'] for x in phrases}!=set(range(1,10)): raise RuntimeError('phrase coverage')
 sp.write_text(json.dumps(study,ensure_ascii=False,indent=2)+'\n'); (BASE/'phrase-study.json').write_text(json.dumps({'title':'Torah 34 phrase-by-phrase study guide','status':'Editorial navigation aid — sourced Hebrew and English remain textually unchanged','selectedPassages':[z['index'] for z in selected],'representedSections':list(range(1,10)),'distribution':distribution,'phrases':phrases},ensure_ascii=False,indent=2)+'\n'); print(f'Prepared 30 exact bilingual Torah 34 phrase entries across all 9 sections; passages {[z["index"] for z in selected]}.')
if __name__=='__main__': main()
