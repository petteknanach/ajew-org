#!/usr/bin/env python3
"""Combined exact-state / corpus / hold / inverse gates, stdlib only."""
import copy, hashlib, json, subprocess, unittest
from pathlib import Path
from psalms_annotation_overlay import apply_book, repair_verse, load_ledger, digest
from psalms_qatan_overlay import load_ledger as qledger, apply_book as qapply, unique_object
ROOT=Path(__file__).resolve().parents[1]
L=load_ledger()
IS_APP=(ROOT/'app.json').exists()
BASE='3fcb1bc5edbd515a080eeb95d3d1e075480ccee1' if IS_APP else '56f18b2bbe52a77ad0927de17b421d41abe8de4e'
QBASE=L['bases']['app' if IS_APP else 'site']
def raw(ref,rel): return subprocess.check_output(['git','show',f'{ref}:{rel}'],cwd=ROOT)
def encoded(value): return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()
def corpus(ref=None):
 if not IS_APP:
  rel='public/reader/medooyuk/tanach-tehillim.json'
  return json.loads(raw(ref,rel) if ref else (ROOT/rel).read_bytes())
 ch={}
 for c in range(1,151):
  rel=f'assets/data/succos/psalms/{c}.json'
  chapter=json.loads(raw(ref,rel) if ref else (ROOT/rel).read_bytes())
  ch[str(c)]={str(s['index']):s['medooyuk'] for s in chapter['segments']}
 return {'book':'Psalms','slug':'tanach-tehillim','ch':ch}
B=corpus(BASE); Q=corpus(QBASE)
# Independent tuple-by-tuple application from approved review rows, not overlay output.
F=copy.deepcopy(Q)
for e in L['approved']:
 c,v=e['ref'].split(':'); ms=F['ch'][c][v]['m']; hits=[i for i,m in enumerate(ms) if m[:2]==e['new_m'][:2]]
 if e['old_m'] is None:
  assert not hits; ms.append(e['new_m'])
 else:
  assert len(hits)==1 and ms[hits[0]]==e['old_m']; ms[hits[0]]=e['new_m']
class AnnotationTests(unittest.TestCase):
 def test_states_and_104_24(self):
  for book in [B,Q,F]:
   snapshot=copy.deepcopy(book)
   self.assertEqual(apply_book(book),F)
   self.assertEqual(apply_book(book,target='qatan'),Q)
   self.assertEqual(apply_book(book,reverse=True),B)
   self.assertEqual(book,snapshot)
  self.assertEqual(qapply(B),Q)
  self.assertIn([5,1,'qk',0],F['ch']['104']['24']['m'])
  self.assertIn([5,2,'nach',0],F['ch']['104']['24']['m'])
  self.assertIn([7,1,'na',0],F['ch']['104']['24']['m'])
  # The historical qatan guard must stay strict; no wildcard compatibility patch.
  with self.assertRaises(ValueError): qapply(F)
 def test_rejects_partial_duplicate_source_identity_and_holds(self):
  e=L['entries'][0]; c,v=str(e['chapter']),str(e['verse'])
  def bad(mut):
   x=copy.deepcopy(Q); mut(x); saved=copy.deepcopy(x)
   with self.assertRaises(ValueError): apply_book(x)
   self.assertEqual(x,saved)
  a=L['approved'][0]; ac,av=a['ref'].split(':')
  bad(lambda x:x['ch'][ac][av].__setitem__('m',F['ch'][ac][av]['m']))
  bad(lambda x:x['ch'][c][v]['m'].append(x['ch'][c][v]['m'][0]))
  bad(lambda x:x['ch'][c][v]['t'].__setitem__(0,x['ch'][c][v]['t'][0]+' '))
  bad(lambda x:x['ch'][c][v]['k'].__setitem__(0,1))
  bad(lambda x:x['ch'][c].__setitem__('999',x['ch'][c].pop(v)))
  bad(lambda x:x.__setitem__('book','Genesis'))
  bad(lambda x:x['ch'].__setitem__(int(c),x['ch'][c]))
  bad(lambda x:x['ch']['104']['24'].__setitem__('m',next(e for e in L['approved'] if e['ref']=='104:24')['source']['old_verse']['m']))
  for h in L['held']:
   hc,hv=h['ref'].split(':'); ti,li=h['token_index'],h['letter_index']
   def held_mut(x):
    ms=x['ch'][hc][hv]['m']; hit=[i for i,m in enumerate(ms) if m[:2]==[ti,li]]
    if hit: ms[hit[0]]=h['diagnostic_new_m']
    else: ms.append(h['diagnostic_new_m'])
   bad(held_mut)
  with self.assertRaises(ValueError): json.loads('{"1":1,"1":2}',object_pairs_hook=unique_object)
  for e in L['entries']:
   row=copy.deepcopy(e['source_fields']); row['m']=copy.deepcopy(e['states']['final']['m']); row['m'].append(row['m'][0])
   with self.assertRaises(ValueError): repair_verse('Psalms',e['chapter'],e['verse'],row,ledger=L)
 def test_authority_and_coordinates(self):
  self.assertEqual(len(L['approved']),79); self.assertEqual(len(L['held']),15)
  self.assertEqual(len({e['id'] for e in L['approved']}),79)
  for e in L['approved']:
   t=e['source_token']; p=e['source']['target_sheva_character_index']; li=e['letter_index']; ti=e['token_index']
   self.assertEqual(t[p],'\u05b0'); self.assertEqual(sum('\u05d0'<=c<='\u05ea' for c in t[:p])-1,li)
   self.assertEqual(e['new_m'],[ti,li,e['new_m'][2],0]); self.assertIn(e['new_m'][2],['na','nach'])
   self.assertEqual(hashlib.sha256(e['source']['raw_verse_json'].encode()).hexdigest(),e['source']['raw_verse_json_sha256'])
   a=e['authority']
   if 'fixture_raw_json' in a:
    self.assertEqual(hashlib.sha256(a['fixture_raw_json'].encode()).hexdigest(),a['fixture_raw_json_sha256'])
    self.assertEqual(json.loads(a['fixture_raw_json']),a['fixture'])
  for key in ['entries','approved','held']:
   bad=copy.deepcopy(L); bad[key].append(bad[key][0])
   with self.assertRaises(ValueError): apply_book(B,ledger=bad)
 def test_all_corpus_held_qere_parked_unchanged(self):
  current=corpus(); self.assertEqual(current,F)
  self.assertEqual(len(current['ch']),150); self.assertEqual(sum(map(len,current['ch'].values())),2527)
  self.assertEqual(sum(t.count('\u05b0') for ch in current['ch'].values() for row in ch.values() for t,k in zip(row['t'],row['k']) if k),50)
  for c,ch in B['ch'].items():
   for v,row in ch.items():
    self.assertEqual({k:x for k,x in row.items() if k!='m'},{k:x for k,x in F['ch'][c][v].items() if k!='m'})
    for ti,k in enumerate(row['k']):
     if k: self.assertEqual([m for m in row['m'] if m[0]==ti],[m for m in F['ch'][c][v]['m'] if m[0]==ti])
  for e in L['held']:
   c,v=e['ref'].split(':'); coord=[e['token_index'],e['letter_index']]
   self.assertEqual([m for m in B['ch'][c][v]['m'] if m[:2]==coord],[m for m in F['ch'][c][v]['m'] if m[:2]==coord])
  for c,v in [('21','2'),('94','1')]: self.assertEqual(B['ch'][c][v],F['ch'][c][v])
  # Parked exact forms remain untouched, no broad qamats-family classification.
  import re
  for c,ch in B['ch'].items():
   for v,row in ch.items():
    for ti,t in enumerate(row['t']):
     key=re.sub('[\u0591-\u05af\u05bd\u05c0\u05c3\u034f ]','',t)
     if key in ['קָדְשׁוֹ','לְקָדְשׁוֹ']:
      self.assertEqual([m for m in row['m'] if m[0]==ti],[m for m in F['ch'][c][v]['m'] if m[0]==ti])
  for name,book in [('before',B),('qatan',Q),('final',F)]:
   self.assertEqual(digest(book['ch']),L['corpus_sha256'][name])
   ms=[m for ch in book['ch'].values() for row in ch.values() for m in row['m']]
   counts={'marks':len(ms),**{lb:sum(m[2]==lb for m in ms) for lb in ['na','nach','uncertain','qk']},'qb':sum(bool(m[3]) for m in ms)}
   self.assertEqual(counts,L['counts'][name])
 def test_exact_byte_inverse_and_manifest(self):
  inverse=apply_book(F,reverse=True); intermediate=apply_book(F,target='qatan')
  if IS_APP:
   changed=[]
   for c in range(1,151):
    rel=f'assets/data/succos/psalms/{c}.json'; cur=json.loads((ROOT/rel).read_bytes())
    for ref,book in [(BASE,inverse),(QBASE,intermediate)]:
     out=copy.deepcopy(cur)
     for s in out['segments']: s['medooyuk']=book['ch'][str(c)][str(s['index'])]
     self.assertEqual(encoded(out),raw(ref,rel))
    if (ROOT/rel).read_bytes()!=raw(QBASE,rel): changed.append(c)
   old=json.loads(raw(QBASE,'assets/data/succos/manifest.json'))
   for r in old['chapters']:
    if r['kind']=='psalms' and r['chapter'] in changed: r['sha256']=hashlib.sha256((ROOT/r['file']).read_bytes()).hexdigest()
   self.assertEqual(encoded(old),(ROOT/'assets/data/succos/manifest.json').read_bytes())
  else:
   rel='public/reader/medooyuk/tanach-tehillim.json'
   for ref,book in [(BASE,inverse),(QBASE,intermediate)]: self.assertEqual(json.dumps(book,ensure_ascii=False,separators=(',',':')).encode(),raw(ref,rel))
if __name__=='__main__': unittest.main(verbosity=2)
