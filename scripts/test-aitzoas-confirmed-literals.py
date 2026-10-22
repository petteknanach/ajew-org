"""Targeted confirmed-literal consumers; no old review/mutation matrix replay."""
import unittest,copy,json,pathlib,hashlib,re
import qualified_aitzoas362_exports as q
import aitzoas_topic_navigation as nav
ROOT=pathlib.Path(__file__).resolve().parents[1]
class ConfirmedLiterals(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.edition=q.load_edition(ROOT);cls.rows=cls.edition.rows;cls.before=q.decode((ROOT/'public'/q.CONFIRMED_ARCHIVE).read_bytes())
 def test_current_and_complete_prior_chain(self):
  bank=q.decode((ROOT/'public'/q.BANK).read_bytes());self.assertEqual(q.confirmed_predecessor(bank),self.before)
  self.assertEqual(q.sha(q.stable(q.question_predecessor(bank))),q.QUESTION_PREDECESSOR_VALUE_PIN)
  self.assertEqual(q.sha(q.stable(q.correction_predecessor(bank))),q.CORRECTION_PREDECESSOR_VALUE_PIN)
  self.assertEqual([r['stableIndex'] for r,b in zip(self.rows,self.before['rows']) if r['he']!=b['he']],[179,242])
  self.assertEqual([r['stableIndex'] for r,b in zip(self.rows,self.before['rows']) if r['en']!=b['en']],[242])
  self.assertEqual([r['history'] for r in self.rows],[r['history'] for r in self.before['rows']])
 def test_real_plain_builder_outputs(self):
  for section in (4,5):
   files,entry=q.section_exports(self.edition,section);folder=ROOT/'public/reader-plain'/q.BOOK/'1'/str(section)
   for name,raw in files.items():self.assertEqual((folder/name).read_bytes(),raw)
   data=json.loads(files['index.json']);rows=[r for r in self.rows if r['section']==section]
   self.assertEqual(data['editionSHA256'],q.ASSET_PINS[q.BANK]['sha256'])
   self.assertEqual([x['he'] for x in data['segments']],[r['he'] for r in rows])
   self.assertEqual([x['en'] for x in data['segments']],[r['en'] for r in rows])
   for i in ([179] if section==4 else [242]):
    r=self.rows[i-1]
    for name in ('index.txt','index.md'):
     self.assertIn(r['he'].encode(),files[name]);self.assertIn(r['en'].encode(),files[name])
    self.assertIn(q.escape_exact(r['he']).encode(),files['index.html'])
    self.assertNotIn(b'probably ',files['index.txt']) if section==5 else None
  for name in ('full.txt','full.md'):
   raw=(ROOT/'public/reader-plain'/q.BOOK/name).read_bytes()
   for i in (179,242):self.assertIn(self.rows[i-1]['he'].encode(),raw);self.assertIn(self.rows[i-1]['en'].encode(),raw)
   self.assertNotIn('The exact compiler replacement for תמה'.encode(),raw)
 def test_current_search_offsets(self):
  for section,i in [(4,179),(5,242)]:
   he,en,locations=q.search_text(self.edition,section);location=next(x for x in locations if x[0]==i)
   self.assertEqual(he[location[2]:location[3]],re.sub(r'\s+',' ',q.NIKUD.sub('',self.rows[i-1]['he'])).strip())
   self.assertEqual(en[location[4]:location[5]],re.sub(r'\s+',' ',self.rows[i-1]['en']).strip())
 def test_topic_navigation_wrong_pin_rejects_then_real_export_recovers(self):
  old=nav.TOPICS_SHA256
  try:
   nav.TOPICS_SHA256='0'*64
   with self.assertRaises(ValueError):q.section_exports(self.edition,4)
  finally:nav.TOPICS_SHA256=old
  self.assertTrue(q.section_exports(self.edition,4)[0]['index.txt'])
 def test_changed_fields_reject_old_and_forged_values(self):
  bank=q.decode((ROOT/'public'/q.BANK).read_bytes());loaded={p:q.decode((ROOT/'public'/p).read_bytes()) for p in q.ASSET_PINS if p!=q.BANK}
  for i,f in [(179,'he'),(242,'he'),(242,'en')]:
   bad=copy.deepcopy(bank);bad['rows'][i-1][f]=self.before['rows'][i-1][f]
   with self.assertRaises(ValueError):q.validate_values(bad,loaded)
  bad=copy.deepcopy(bank);bad['rows'][87]['he']+=' '
  with self.assertRaises(ValueError):q.validate_values(bad,loaded)
  q.validate_values(bank,loaded)
 def test_history_archive_byte_pin_fail_closed(self):
  def read(name):return b'{}' if name==q.CONFIRMED_ARCHIVE else (ROOT/'public'/name).read_bytes()
  with self.assertRaises(ValueError):q.authenticate(read)
  self.assertEqual(len(q.load_edition(ROOT).rows),366)
if __name__=='__main__':unittest.main(verbosity=2)
