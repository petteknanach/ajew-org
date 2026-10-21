#!/usr/bin/env python3
"""Production Python correction controls with an independent Git predecessor."""
import copy,json,subprocess,unittest
from pathlib import Path
import qualified_aitzoas362_exports as q
ROOT=Path(__file__).resolve().parents[1]
BASE='59add1f25cbf4d05e4a234a1e9a8ca6c824d04b0'
def git(p):return subprocess.check_output(['git','show',BASE+':'+p],cwd=ROOT)
def read(n):return (ROOT/'public'/n).read_bytes()
old={ '__name__':'genuine_predecessor' };exec(compile(git('scripts/qualified_aitzoas362_exports.py'),'genuine_predecessor','exec'),old)
bank=q.decode(read(q.BANK));previous=q.decode(git('public/'+q.BANK));loaded={n:q.decode(read(n)) for n in q.ASSET_PINS if n!=q.BANK}
def cell(b,p):
 keys=p.strip('/').split('/');x=b
 for k in keys[:-1]:x=x[int(k)] if isinstance(x,list) else x[k]
 return x,int(keys[-1]) if isinstance(x,list) else keys[-1]
def project(b,l):
 for r in b['rows']:
  l[f"reader/{q.BOOK}/section-{r['section']}.json"]['segments'][r['arrayPosition']].update(he=r['he'],en=r['en'],englishReading={k:r[k] for k in ('englishStatus','origin','requiredNotes','history')})
class Correction(unittest.TestCase):
 def test_original_predecessor_full_authentication(self):
  self.assertEqual(old['verify'](lambda n:git('public/'+n))['availableEnglish'],366)
  for k in ('FINAL4_PINS','FINAL4_ORIGINALS','BASELINE_BANK_VALUE_PIN','BASELINE_SOURCE_BINDING_PIN'):self.assertEqual(getattr(q,k),old[k])
 def test_ten_exact_operations_and_complete_inverse(self):
  allowed={f'/rows/{i}/{k}' for i in (61,62,192) for k in ('en','origin/notice','requiredNotes/0/text')}|{'/rows/357/requiredNotes/0/text'}
  self.assertEqual({o['pointer'] for o in q.CORRECTION_OPERATIONS[:10]},allowed);self.assertEqual(len(q.CORRECTION_OPERATIONS),13)
  self.assertEqual(q.sha(q.stable(q.CORRECTION_OPERATIONS)),'26ee02a2abca774512eacc414f6e0c2187070a3549790a1affb4c0c6b32c59bd')
  forward=copy.deepcopy(previous)
  for op in q.CORRECTION_OPERATIONS:
   x,k=cell(forward,op['pointer']);self.assertEqual(x[k],op['before']);x[k]=copy.deepcopy(op['after'])
  self.assertEqual(forward,bank);q.validate_values(forward,copy.deepcopy(loaded))
  self.assertEqual(q.correction_predecessor(bank),previous);self.assertEqual(q.sha(q.stable(previous)),old['BANK_VALUE_PIN'])
 def test_each_selected_operation_required_exactly(self):
  for op in q.CORRECTION_OPERATIONS[:10]:
   for value in (op['before'],op['after']+' unauthorized'):
    with self.subTest(pointer=op['pointer'],value=value):
     b,l=copy.deepcopy(bank),copy.deepcopy(loaded);x,k=cell(b,op['pointer']);x[k]=value;project(b,l)
     with self.assertRaises(ValueError):q.validate_values(b,l)
 def test_all_other_rows_he_history_witnesses_and_note_identities_conserved(self):
  unchanged=0
  for r,p in zip(bank['rows'],previous['rows'],strict=True):
   self.assertEqual(r['he'],p['he']);self.assertEqual(r['history'],p['history']);self.assertEqual(r['owner'],p['owner'])
   self.assertEqual([n['id'] for n in r['requiredNotes']],[n['id'] for n in p['requiredNotes']])
   self.assertEqual([a for n in r['requiredNotes'] for a in n['anchors'] if a['field']=='governingHebrew'],[a for n in p['requiredNotes'] for a in n['anchors'] if a['field']=='governingHebrew'])
   if r['stableIndex'] not in (62,63,193,358):self.assertEqual(r,p);unchanged+=1
  self.assertEqual(unchanged,362);self.assertEqual(sum(len(r['requiredNotes']) for r in bank['rows']),218)
  for s in range(1,7):
   n=f'reader/reviewed/aitzoas362-sources/section-{s}-original.json';self.assertEqual(read(n),git('public/'+n))
  for s in (1,3,4):
   n=f'reader/{q.BOOK}/section-{s}.json';self.assertEqual(read(n),git('public/'+n))
 def test_neighbor_mutations_rejected_even_current_envelopes_renewed(self):
  def he(b,l):
   r=b['rows'][63];r['he']+='!';l[f"reader/reviewed/aitzoas362-sources/section-{r['section']}-original.json"]['segments'][r['arrayPosition']]['he']=r['he']
  def history(b,l):
   r=b['rows'][63];r['history']['en']+='!';l[f"reader/reviewed/aitzoas362-sources/section-{r['section']}-original.json"]['segments'][r['arrayPosition']]['en']=r['history']['en']
  mutations=[('english',lambda b,l:b['rows'][63].update(en=b['rows'][63]['en']+'!')),('he',he),('history',history),('note',lambda b,l:b['rows'][63]['requiredNotes'][0].update(text='unauthorized')),('sourceclaim',lambda b,l:b['rows'][62]['origin'].update(kind='supplied_english_based')),('extra',lambda b,l:b['rows'][63].update(claim='unselected'))]
  for label,mutate in mutations:
   with self.subTest(label=label):
    b,l=copy.deepcopy(bank),copy.deepcopy(loaded);mutate(b,l);project(b,l);pins=q.BANK_VALUE_PIN,q.SOURCE_BINDING_PIN
    q.BANK_VALUE_PIN=q.sha(q.stable(b));q.SOURCE_BINDING_PIN=q.sha(q.stable([q._binding(r) for r in b['rows']]))
    try:
     with self.assertRaisesRegex(ValueError,'baseline362|predecessor|final-four'):q.validate_values(b,l)
    finally:q.BANK_VALUE_PIN,q.SOURCE_BINDING_PIN=pins
 def test_wrong_inverse_and_mutated_contract_rejected(self):
  oldops=copy.deepcopy(q.CORRECTION_OPERATIONS)
  try:
   q.CORRECTION_OPERATIONS[3]['before']='wrong inverse'
   with self.assertRaisesRegex(ValueError,'Closed correction contract drift'):q.validate_values(bank,loaded)
   # Even repinning the inverse contract cannot rewrite predecessor/baseline authority.
   oldpin=q.CORRECTION_OPERATIONS_PIN;q.CORRECTION_OPERATIONS_PIN=q.sha(q.stable(q.CORRECTION_OPERATIONS))
   try:
    with self.assertRaisesRegex(ValueError,'Immutable baseline362 bank drift'):q.validate_values(bank,loaded)
   finally:q.CORRECTION_OPERATIONS_PIN=oldpin
  finally:q.CORRECTION_OPERATIONS[:]=oldops
 def test_each_projection_and_historical_asset_fail_closed(self):
  for s in (2,5,6):
   l=copy.deepcopy(loaded);l[f'reader/{q.BOOK}/section-{s}.json']['segments'][-1]['en']+='!'
   with self.assertRaisesRegex(ValueError,'projection drift'):q.validate_values(bank,l)
  with self.assertRaises(ValueError):q.validate_values(previous,loaded)
  history=q.decode(read(q.CORRECTION_ARCHIVE));self.assertEqual(history['rows'],[previous['rows'][i-1] for i in (62,63,193,358)])
  with self.assertRaisesRegex(ValueError,'history authentication'):q.authenticate(lambda n:read(n)+b' ' if n==q.CORRECTION_ARCHIVE else read(n))
 def test_fresh_full_authentication_after_negatives(self):self.assertEqual(q.verify(read)['availableEnglish'],366)
if __name__=='__main__':unittest.main(verbosity=2)
