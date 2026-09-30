#!/usr/bin/env python3
"""Read-only publication gate. Hashes are review evidence, not semantic approval."""
import argparse,copy,hashlib,json
from pathlib import Path

def digest(x):return hashlib.sha256(x).hexdigest()
def verify(master,manifest,pdfs,hash_checks=True):
 assert master['wholeBook'] is False and manifest['wholeBook'] is False,'whole-book claim'
 units=master['units'];ids=[x['id'] for x in units];assert len(ids)==len(set(ids)),'duplicate unit'
 assert len(pdfs)==len({x['url'] for x in pdfs})==len({x['id'] for x in pdfs}),'duplicate PDF'
 assert all(x['verified'] and x['magic']=='%PDF-' and x['url'].startswith('https://ajew.org/pdfs/parsha/') for x in pdfs),'unverified PDF'
 for unit in units:
  assert unit['status']=='reviewed-selection' and unit['wholeParsha'] is False,'review/completion claim'
  assert unit['en']=='' and unit['englishStatus']=='absent-unreviewed','unreviewed English'
  assert unit['sources_printed'] and unit['verse_quote_he'],'missing source/verse'
  canonical={k:v for k,v in unit.items() if k!='unitSha256'}
  if hash_checks:assert digest(json.dumps(canonical,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode())==unit['unitSha256'],'unit provenance mutation'
  assert unit['scanSha256']==next(s['sha256'] for s in manifest['scanInventory'] if s['name']==unit['scan']),'wrong scan owner'
  assert all(p['en']=='' and p['text'].strip() for p in unit['parts']),'empty/source English'
  body='\n\n'.join(p['text'] for p in unit['parts'])
  if hash_checks:assert digest(body.encode())==unit['textSha256'],'teaching mutation'
  he='\n\n'.join(x for x in [unit['summ_he'],unit['verse_quote_he'],unit.get('verseIntro_he',''),body,*unit['sources_printed']] if x)
  assert he==unit['he'],'source conservation'
  assert not any('ציונים64' in x.replace(' ','') for x in [unit['he']]),'ornament promoted'
 for slug,cov in manifest['parshas'].items():
  own=[x for x in units if x['parsha']==slug]
  assert cov['wholeParsha'] is False,'whole-parsha claim'
  assert cov['units']==len(own) and cov['ids']==[x['id'] for x in own],'coverage count/IDs'
  assert cov['verses']==list(dict.fromkeys(x['verse'] for x in own)),'verse coverage'
  assert cov['pdf'] in [x['url'] for x in pdfs if slug in x['slugs']],'wrong PDF owner'
 assert set(ids)=={id for v in manifest['parshas'].values() for id in v['ids']},'unmapped published unit'

def main():
 p=argparse.ArgumentParser();p.add_argument('--app');p.add_argument('--evidence');p.add_argument('--corpus');args=p.parse_args()
 root=Path(__file__).resolve().parents[1];base=root/'public/data/breslov-parsha';master_path=base/'reviewed-v1.json';master=json.loads(master_path.read_text());manifest=json.loads((base/'manifest.json').read_text());pdfs=json.loads((base/'pdfs.json').read_text())
 assert digest(master_path.read_bytes())==manifest['masterSha256'],'reviewed master changed'
 verify(master,manifest,pdfs)
 if args.app:
  a=Path(args.app)/'assets/data';assert (a/'breslov-parsha-reviewed.json').read_bytes()==master_path.read_bytes();assert json.loads((a/'parsha-pdfs.json').read_text())==pdfs;assert json.loads((a/'breslov-parsha-manifest.json').read_text())==manifest
 runtime_files=0
 for slug,n in [('bereishit',1),('noach',2)]:
  own=[u for u in master['units'] if u['parsha']==slug]
  for rel in [f'part-1/torah-{n}.json',f'section-p1-t{n}.json']:
   d=json.loads((root/'public/reader/chumash-lh'/rel).read_text());assert d['wholeParsha'] is False and d['hasEnglish'] is False;assert d['navigation'];assert [x['he'] for x in d['segments']]==[u['he'] for u in own];assert all(x['en']=='' for x in d['segments']);runtime_files+=1
 for chapter in [1,2,8]:
  d=json.loads((root/f'public/reader/breslov-parsha/bereishit-{chapter}.json').read_text());own=[u for u in master['units'] if int(u['verse'].split(':')[0])==chapter]
  assert d['units']==own and [s['he'] for s in d['segments']]==[u['he'] for u in own],'chapter conservation'
  assert all(s['en']=='' for s in d['segments']);assert d['provenance']['unitIds']==[u['id'] for u in own];assert d['wholeParsha'] is False
 for unit in master['units']:
  for note in unit['notes']:assert digest((root/'public'/note['url'].lstrip('/')).read_bytes())==note['sha256'],'facsimile changed'
 if args.evidence:
  e=Path(args.evidence)
  for rec in manifest['sourceInventory']:assert digest((e/rec['name']).read_bytes())==rec['sha256'],'source witness changed'
  for rec in manifest['scanInventory']:assert digest((e/rec['evidencePath']).read_bytes())==rec['sha256'],'scan witness changed'
 if args.corpus:
  for unit in master['units']:
   if unit['id']=='b1-1-u1':continue # Authenticated delivered old witness, not today's changed corpus.
   for part in unit['parts']:
    f=Path(args.corpus)/part['corpus'];raw=json.loads(f.read_text())['segments'][part['seg']]['he'];assert digest(raw.encode())==part['sourceTextSha256'];assert part['end']<=len(raw)
    if part['extraction']=='verbatim-slice':
     text=raw[part['start']:part['end']]
     for before,after in part['corrections']:assert text.count(before)==1;text=text.replace(before,after)
     assert text==part['text'],'corpus slice mismatch'
 cases=[]
 for name,mutate in [
  ('duplicate unit',lambda d,m,p:d['units'].append(copy.deepcopy(d['units'][0]))),
  ('lost teaching tail',lambda d,m,p:d['units'][0]['parts'][0].update(text=d['units'][0]['parts'][0]['text'][:-10])),
  ('invented English',lambda d,m,p:d['units'][0].update(en='Invented translation')),
  ('complete parsha',lambda d,m,p:m['parshas']['bereishit'].update(wholeParsha=True)),
  ('stale count',lambda d,m,p:m['parshas']['bereishit'].update(units=100)),
  ('lost source citation',lambda d,m,p:d['units'][0].update(sources_printed=[])),
  ('PDF mismatch',lambda d,m,p:m['parshas']['bereishit'].update(pdf=m['parshas']['noach']['pdf'])),
  ('duplicate PDF',lambda d,m,p:p.append(copy.deepcopy(p[0]))),
 ]:
  d,m,p=copy.deepcopy((master,manifest,pdfs));mutate(d,m,p)
  try:verify(d,m,p,hash_checks=False) # Logical mutation gates must work without checksum masking.
  except AssertionError:cases.append(name)
  else:raise AssertionError('mutation accepted: '+name)
 print(json.dumps({'result':'PASS','units':len(master['units']),'coverage':{s:c['units'] for s,c in manifest['parshas'].items()},'runtimeFiles':runtime_files,'uniquePdfs':len(pdfs),'noteFacsimileReferences':sum(len(u['notes']) for u in master['units']),'sourceWitnesses':len(manifest['sourceInventory']),'mutationRejections':cases,'wholeParsha':False},indent=2))
if __name__=='__main__':main()
