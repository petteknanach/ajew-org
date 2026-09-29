#!/usr/bin/env python3
"""Verify display-tail repairs without writing corpus or rerunning gold rules."""
import argparse,importlib.util,json,pathlib,xml.etree.ElementTree as ET,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser();ap.add_argument('--xml-dir',required=True,type=pathlib.Path);ap.add_argument('--native-supplement',type=pathlib.Path);args=ap.parse_args()
spec=importlib.util.spec_from_file_location('builder',root/'scripts/build_medooyuk_data.py');builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
presentation=json.loads((root/'public/tikkun/written-overrides.json').read_text());count=repairs=0
for p in (root/'public/reader/medooyuk').glob('tanach-*.json'):
 d=json.loads(p.read_text());overlay=presentation['books'][d['slug']];xml=args.xml_dir/(d['book']+'.xml')
 assert hashlib.sha256(p.read_bytes()).hexdigest()==overlay['sha256']
 originals={(int(c.get('n')),int(v.get('n'))):v for c in ET.parse(xml).getroot().iter('c') for v in c.findall('v')}
 for c,v,t,k,engine,b,L in builder.verses_of(xml):
  old=d['ch'][str(c)][str(v)];key=str(c)+':'+str(v)
  expected=overlay.get('readingRepairs',{}).get(key,old['t'])
  assert t==expected,(d['slug'],key,'full qere mismatch')
  assert k==old['k'],(d['slug'],key,'token flags moved')
  assert b==old.get('b',[]) and L==old.get('L',[])
  assert engine==[w.text for w in originals[c,v].iter() if w.tag.endswith('w') and w.text]
  if t!=old['t']:repairs+=1
  count+=1
assert count==23213 and repairs==27
native_checked=0
if args.native_supplement:
 native=json.loads(args.native_supplement.read_text())['verses']
 for slug,book in presentation['books'].items():
  for key,ov in book['verses'].items():
   other=native[slug+'/'+key.replace(':','/')]
   for k in ['t','b','L']:assert ov[k]==other[k],(slug,key,k)
   assert book.get('readingRepairs',{}).get(key)==other.get('readingTokens')
   native_checked+=1
 assert native_checked==1111
print(json.dumps({'pass':True,'checkedVerses':count,'fullQereTailRestorations':repairs,'nativeKetivParity':native_checked,'corpusWritten':False,'goldRulingsChanged':False},indent=2))
