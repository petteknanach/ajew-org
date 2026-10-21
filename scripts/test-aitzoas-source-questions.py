"""All-30 exact parent selection, full inverse and real production Python controls."""
import copy,json,subprocess,unittest
from pathlib import Path
import qualified_aitzoas362_exports as q
ROOT=Path(__file__).resolve().parents[1]
BASE='f62101574a52ccc01782ac3a43ff07a35e3b22e3'
read=lambda n:(ROOT/'public'/n).read_bytes()
git=lambda n:subprocess.check_output(['git','-C',str(ROOT),'show',BASE+':'+n])
fixture_raw=(ROOT/'scripts/fixtures/aitzoas-source-questions-selection.json').read_bytes()
assert q.sha(fixture_raw)=='6cf959c1418beb62912f289a18219261c052d28512cac0838f34ad8d2beab879'
selection=json.loads(fixture_raw)
bank=q.decode(read(q.BANK));previous=q.decode(git('public/'+q.BANK))
loaded={n:q.decode(read(n)) for n in q.ASSET_PINS if n!=q.BANK}
def project(b,l):
 for r in b['rows']:
  l[f"reader/{q.BOOK}/section-{r['section']}.json"]['segments'][r['arrayPosition']].update(he=r['he'],en=r['en'],englishReading={k:r[k] for k in ('englishStatus','origin','requiredNotes','history')})
class AllThirty(unittest.TestCase):
 def test_01_parent_operations_exact_and_strict_conservation(self):
  self.assertEqual(q.QUESTION_SELECTION_PIN,selection['authoritySHA256']);self.assertEqual(len(selection['operations']),52)
  expected=copy.deepcopy(previous);seen=set()
  for op in selection['operations']:
   i,f,nid=op['stableIndex'],op['field'],op['noteId'];self.assertNotIn((i,f,nid),seen);seen.add((i,f,nid));old=previous['rows'][i-1];new=bank['rows'][i-1];r=expected['rows'][i-1]
   if f=='requiredNote':
    n=next(n for n in r['requiredNotes'] if n['id']==nid);self.assertEqual(n['text'],op['before'])
    if op['after'] is None:r['requiredNotes'].remove(n);self.assertNotIn(nid,[x['id'] for x in new['requiredNotes']])
    else:n['text']=op['after'];self.assertEqual(next(x['text'] for x in new['requiredNotes'] if x['id']==nid),op['after'])
   else:
    x,k=(r['origin'],'notice') if f=='origin.notice' else (r,'en');self.assertEqual(x[k],op['before']);x[k]=op['after']
  changed=[];english=[]
  for r,p,e in zip(bank['rows'],previous['rows'],expected['rows'],strict=True):
   i=r['stableIndex'];self.assertEqual(r['he'],p['he']);self.assertEqual(r['history'],p['history'])
   if r!=p:changed.append(i)
   if r['en']!=p['en']:english.append(i)
   for n,en in zip(r['requiredNotes'],e['requiredNotes'],strict=True):
    self.assertEqual({k:v for k,v in n.items() if k!='anchors'},{k:v for k,v in en.items() if k!='anchors'})
    self.assertEqual([z for z in n['anchors'] if z['field']=='governingHebrew'],[z for z in en['anchors'] if z['field']=='governingHebrew'])
    if r['en']==p['en']:self.assertEqual(n['anchors'],en['anchors'])
    en['anchors']=copy.deepcopy(n['anchors'])
   self.assertEqual(r,e)
  self.assertEqual(changed,selection['conservation']['changedOwners']);self.assertEqual(english,selection['conservation']['englishChangedOwners']);self.assertEqual(len(english),11)
  self.assertEqual([len(previous['rows']),sum(len(r['requiredNotes']) for r in previous['rows']),sum(len(r['requiredNotes']) for r in bank['rows'])],[366,218,214])
  self.assertEqual(bank['displayRules'],{})
 def test_02_complete_immediate_inverse_and_historical_chain(self):
  inverse=q.question_predecessor(bank);self.assertEqual(q.sha(q.stable(inverse)),q.sha(q.stable(previous)))
  self.assertEqual(inverse,previous)
  original={ '__name__':'actual_immediate_predecessor' };exec(compile(git('scripts/qualified_aitzoas362_exports.py'),'actual_immediate_predecessor','exec'),original)
  self.assertEqual(original['verify'](lambda n:git('public/'+n))['requiredNotes'],218)
  self.assertEqual(q.sha(read(q.QUESTION_ARCHIVE)),q.QUESTION_ARCHIVE_PIN['sha256'])
  self.assertEqual(q.decode(read(q.QUESTION_ARCHIVE))['selectedOperations'],selection['operations'])
  for section in range(1,7):self.assertEqual(read(f'reader/reviewed/aitzoas362-sources/section-{section}-original.json'),git(f'public/reader/reviewed/aitzoas362-sources/section-{section}-original.json'))
  self.assertEqual(read(q.CORRECTION_ARCHIVE),git('public/'+q.CORRECTION_ARCHIVE))
 def test_03_each_selected_operation_renewed_envelope_negative_and_fresh_positive(self):
  for op in selection['operations']:
   with self.subTest(owner=op['stableIndex'],field=op['field'],note=op['noteId']):
    b,l=copy.deepcopy(bank),copy.deepcopy(loaded);r=b['rows'][op['stableIndex']-1]
    if op['field']=='en':r['en']+=' unauthorized'
    elif op['field']=='origin.notice':r['origin']['notice']+=' unauthorized'
    elif op['after'] is None:
     n=copy.deepcopy(next(n for n in previous['rows'][op['stableIndex']-1]['requiredNotes'] if n['id']==op['noteId']));n['anchors']=[{'field':'governingHebrew','text':r['he'],'codepointStart':0,'codepointEndExclusive':len(r['he'])}];r['requiredNotes'].append(n)
    else:next(n for n in r['requiredNotes'] if n['id']==op['noteId'])['text']+=' unauthorized'
    project(b,l);pins=q.BANK_VALUE_PIN,q.SOURCE_BINDING_PIN
    q.BANK_VALUE_PIN=q.sha(q.stable(b));q.SOURCE_BINDING_PIN=q.sha(q.stable([q._binding(r) for r in b['rows']]))
    try:
     with self.assertRaises(ValueError):q.validate_values(b,l)
    finally:q.BANK_VALUE_PIN,q.SOURCE_BINDING_PIN=pins
    q.validate_values(copy.deepcopy(bank),copy.deepcopy(loaded))
 def test_04_composed_179_250_optional_Q7_and_source_correlated_gaze(self):
  for i in (20,299):self.assertEqual(bank['rows'][i-1]['en'],previous['rows'][i-1]['en'])
  for i in (179,250):
   r=bank['rows'][i-1]
   for op in selection['operations']:
    if op['stableIndex']==i and op['field']=='requiredNote':self.assertEqual(next((n['text'] for n in r['requiredNotes'] if n['id']==op['noteId']),None),op['after'])
  for nid in ('C-250-N06','C-250-N07'):self.assertEqual(next(n['text'] for n in bank['rows'][249]['requiredNotes'] if n['id']==nid),next(n['text'] for n in previous['rows'][249]['requiredNotes'] if n['id']==nid))
  self.assertIn('his gaze',bank['rows'][220]['en']);self.assertNotIn('his withdrawal',bank['rows'][220]['en'])
 def test_05_all_366_export_source_fields_and_complete_notes(self):
  edition=q.load_edition(ROOT);observed=[]
  for section in range(1,7):
   files,_=q.section_exports(edition,section);data=json.loads(files['index.json']);rows=[r for r in bank['rows'] if r['section']==section]
   self.assertEqual(data['content'],'\n\n'.join(q.passage_text(r) for r in rows))
   for r,item in zip(rows,data['segments'],strict=True):
    observed.append(r['stableIndex']);self.assertEqual(item,dict(index=r['stableIndex'],**r))
    for n in r['requiredNotes']:self.assertIn(n['text'],data['content'])
  self.assertEqual(observed,list(range(1,367)))
 def test_06_archive_failure_then_fresh_current_positive(self):
  with self.assertRaisesRegex(ValueError,'Question history authentication'):q.authenticate(lambda n:read(n)+b' ' if n==q.QUESTION_ARCHIVE else read(n))
  self.assertEqual(q.verify(read)['requiredNotes'],214)
if __name__=='__main__':unittest.main(verbosity=2)
