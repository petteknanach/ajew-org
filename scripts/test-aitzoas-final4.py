#!/usr/bin/env python3
"""Serial final4 tests of actual Python production module; Git-derived baseline."""
import copy, importlib.util, json, re, subprocess, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE='3b663dec7f21be01f3045673e10912c234abd348'
def git(path):return subprocess.check_output(['git','-C',str(ROOT),'show',BASE+':'+path])
def module(raw,name):
    ns={'__name__':name};exec(compile(raw,name,'exec'),ns);return ns
spec=importlib.util.spec_from_file_location('actual_final4',ROOT/'scripts/qualified_aitzoas362_exports.py')
q=importlib.util.module_from_spec(spec);spec.loader.exec_module(q)
old=module(git('scripts/qualified_aitzoas362_exports.py'),'genuine_baseline')
def read(name):return (ROOT/'public'/name).read_bytes()
bank=q.decode(read(q.BANK));loaded={n:q.decode(read(n)) for n in q.ASSET_PINS if n!=q.BANK}
oldbank=old['decode'](git('public/'+q.BANK))
ordinary=next(r for r in bank['rows'] if str(r['stableIndex']) not in q.FINAL4_PINS and not r['requiredNotes'])
def project(b,l):
    for r in b['rows']:
        seg=l[f"reader/{q.BOOK}/section-{r['section']}.json"]['segments'][r['arrayPosition']]
        seg.update(he=r['he'],en=r['en'],englishReading={k:r[k] for k in ('englishStatus','origin','requiredNotes','history')})
def renew(r):
    for n in r['requiredNotes']:
        a=n['anchors'][1];a.update(token=r['en'],codepointEndExclusive=len(r['en']),utf8EndExclusive=len(r['en'].encode()),fullFieldSHA256=q.sha(r['en']),tokenSHA256=q.sha(r['en']))

def expected_passage(r):
    en=r['en'];notes=r['requiredNotes']
    if r['stableIndex']==208:notes=[n for n in notes if n['id']!='C-208-N01']
    if r['stableIndex']==242:
        s=oldbank['displayRules']['242']['overlappingInlineSpan'];en=en[:s['start']]+en[s['endExclusive']:]
    h=r['history']
    blocks=[f"Aitzoas Yesharoas — section {r['section']}, Reader paragraph {r['stableIndex']}\nReader anchors are not printed teaching numbers.",'Supplied Hebrew\n'+r['he'],'English\n'+en,'English origin\n'+r['origin']['notice']]
    blocks += ['Source note ['+n['id']+']\n'+n['text'] for n in notes]
    blocks += ['Historical role\n'+h['label'],'Earlier site English — comparison only (empty means no earlier wording)\n'+h['en'],'Complete original section archive\n'+h['archiveUrl'],'Original English field location\n'+h['pointer'],'Original archive SHA-256\n'+h['archiveSHA256'],'Source: https://ajew.org'+r['canonicalUrl']]
    return '\n\n'.join(blocks)

class FinalFour(unittest.TestCase):
    def test_00_genuine_baseline_positive(self):
        result=old['verify'](lambda name:git('public/'+name))
        self.assertEqual((result['availableEnglish'],result['requiredNotes']),(362,208))
    def test_01_current_actual_authentication_positive(self):
        result=q.verify(read);self.assertEqual((result['availableEnglish'],result['requiredNotes']),(366,q.FINAL_NOTE_COUNT))
    def test_02_logical_coordinated_negatives_with_valid_envelopes(self):
        def olden(b,l):b['rows'][ordinary['stableIndex']-1]['en']+=' unauthorized'
        def he(b,l):
            r=b['rows'][ordinary['stableIndex']-1];r['he']+='!';l[f"reader/reviewed/aitzoas362-sources/section-{r['section']}-original.json"]['segments'][r['arrayPosition']]['he']=r['he']
        def history(b,l):
            r=b['rows'][ordinary['stableIndex']-1];r['history']['en']+=' unauthorized';l[f"reader/reviewed/aitzoas362-sources/section-{r['section']}-original.json"]['segments'][r['arrayPosition']]['en']=r['history']['en']
        def oldnote(b,l):next(r for r in b['rows'] if str(r['stableIndex']) not in q.FINAL4_PINS and r['requiredNotes'])['requiredNotes'].pop()
        def newnote(b,l):b['rows'][86]['requiredNotes'].pop()
        def anchor(b,l):b['rows'][0]['requiredNotes'][0]['anchors'][0]['codepointStart']=1
        def oldanchor(b,l):next(r for r in b['rows'] if str(r['stableIndex']) not in q.FINAL4_PINS and r['requiredNotes'])['requiredNotes'][0]['anchors'][0]['fullFieldSHA256']='0'*64
        def unknown(b,l):b['rows'][86]['en']+=' unauthorized';renew(b['rows'][86])
        def display(b,l):b['displayRules']['208']['inlineNoteId']='wrong'
        def count(b,l):b['rows'][0]['en']=None
        def origin(b,l):b['rows'][61]['origin']['notice']+=' unauthorized'
        def private(b,l):b['rows'][0]['requiredNotes'][0]['anchors'][0]['hidden_private']='secret'
        for label,mutate in [('old362 English',olden),('HE',he),('history',history),('old note loss',oldnote),('new note loss',newnote),('new anchor',anchor),('old anchor',oldanchor),('unknown4English',unknown),('displayRules',display),('count',count),('origin',origin),('private',private)]:
            with self.subTest(label=label):
                b,l=copy.deepcopy(bank),copy.deepcopy(loaded);mutate(b,l);project(b,l)
                pins=q.BANK_VALUE_PIN,q.SOURCE_BINDING_PIN
                q.BANK_VALUE_PIN=q.sha(q.stable(b));q.SOURCE_BINDING_PIN=q.sha(q.stable([q._binding(r) for r in b['rows']]))
                try:
                    with self.assertRaises(ValueError) as caught:q.validate_values(b,l)
                    print('rejected '+label+': '+str(caught.exception))
                    if label in ('old362 English','HE','history'):self.assertIn('Immutable baseline362 bank drift',str(caught.exception))
                    if label=='unknown4English':self.assertIn('Exact final-four row drift',str(caught.exception))
                finally:q.BANK_VALUE_PIN,q.SOURCE_BINDING_PIN=pins
    def test_03_independent_baseline_python_binding_rejects_after_other_envelope_rebinding(self):
        b,l=copy.deepcopy(bank),copy.deepcopy(loaded);b['rows'][ordinary['stableIndex']-1]['en']+=' unauthorized';project(b,l)
        restored=copy.deepcopy(b)
        for index in (1,62,87,179):restored['rows'][index-1].update(q.FINAL4_ORIGINALS[str(index)])
        previous=q.BANK_VALUE_PIN,q.SOURCE_BINDING_PIN,q.BASELINE_BANK_VALUE_PIN
        q.BANK_VALUE_PIN=q.sha(q.stable(b));q.SOURCE_BINDING_PIN=q.sha(q.stable([q._binding(r) for r in b['rows']]))
        q.BASELINE_BANK_VALUE_PIN=q.sha(q.stable(restored))
        try:
            with self.assertRaisesRegex(ValueError,'Immutable baseline362 source binding drift'):q.validate_values(b,l)
        finally:q.BANK_VALUE_PIN,q.SOURCE_BINDING_PIN,q.BASELINE_BANK_VALUE_PIN=previous
    def test_04_fresh_positive_after_negatives(self):self.assertEqual(len(q.load_edition(ROOT).rows),366)
    def test_05_original362_and_he_history_all366_and_bytes_immutable(self):
        for r,oldr in zip(bank['rows'],oldbank['rows'],strict=True):
            if r['stableIndex'] in (1,62,87,179):
                for key in set(r)-{'en','origin','englishStatus','requiredNotes'}:self.assertEqual(r[key],oldr[key])
            else:self.assertEqual(r,oldr)
        for section in (5,6):
            name=f'public/reader/{q.BOOK}/section-{section}.json';self.assertEqual((ROOT/name).read_bytes(),git(name))
        for section in range(1,7):
            name=f'public/reader/reviewed/aitzoas362-sources/section-{section}-original.json';self.assertEqual((ROOT/name).read_bytes(),git(name))
    def test_06_actual_section_exports_all_six_four_formats_full_body_display(self):
        edition=q.load_edition(ROOT)
        for section in range(1,7):
            rows=[r for r in bank['rows'] if r['section']==section];expected='\n\n'.join(expected_passage(r) for r in rows)
            files,entry=q.section_exports(edition,section)
            self.assertEqual(set(files),{'index.txt','index.md','index.json','index.html'})
            self.assertEqual(files['index.txt'].decode(),expected+'\n')
            value=json.loads(files['index.json']);self.assertEqual(value['content'],expected);self.assertEqual(value['editionSHA256'],q.ASSET_PINS[q.BANK]['sha256'])
            self.assertEqual([s['owner'] for s in value['segments']],[r['owner'] for r in rows])
            self.assertIn(expected,files['index.md'].decode())
            for r in rows:
                self.assertEqual(q.passage_text(r),expected_passage(r))
                # HTML transport uses real literal escaping, including CR entities.
                import html
                self.assertIn(html.escape(expected_passage(r),quote=True).replace('\r','&#13;'),files['index.html'].decode())
                self.assertEqual(value['segments'][r['arrayPosition']]['en'],r['en'])
                self.assertEqual(value['segments'][r['arrayPosition']]['requiredNotes'],r['requiredNotes'])
        self.assertEqual(q.display_plan(bank['rows'][207],english=False)[1],bank['rows'][207]['requiredNotes'])
        self.assertEqual(q.display_plan(bank['rows'][241],exact_english=True)[0],bank['rows'][241]['en'])
    def test_07_actual_search_offsets_unchanged_he_and_inserted_en_all_six(self):
        edition=q.load_edition(ROOT);baseline=old['authenticate'](lambda name:git('public/'+name))
        for section in range(1,7):
            he,en,loc=q.search_text(edition,section);oldhe,olden,oldloc=old['search_text'](baseline,section)
            self.assertEqual(he,oldhe);self.assertEqual([x[:4] for x in loc],[x[:4] for x in oldloc])
            rows=[r for r in bank['rows'] if r['section']==section];heparts=[];enparts=[];hc=ec=0;expected=[]
            for r in rows:
                h=re.sub(r'\s+',' ',re.sub('[\u0591-\u05bd\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05c7]','',r['he'])).strip()
                e=re.sub(r'\s+',' ',r['en']).strip()
                expected.append([r['stableIndex'],r['stableIndex'],hc,hc+len(h),ec,ec+len(e)])
                if h:heparts.append(h);hc+=len(h)+1
                if e:enparts.append(e);ec+=len(e)+1
            self.assertEqual(he,' '.join(heparts));self.assertEqual(en,' '.join(enparts));self.assertEqual(loc,expected)
            for r,m in zip(rows,loc,strict=True):self.assertEqual(en[m[4]:m[5]],re.sub(r'\s+',' ',r['en']).strip())
            meta=edition.sections[section-1];common={'t':meta.get('title','')[:200],'h':(meta.get('hebrewTitle') or meta.get('title') or '')[:200],'b':q.BOOK,'l':f'/reader/{q.BOOK}/1/{section}','a':'','e':en[:500]}
            hd=dict(common,x=he,m=loc);ed=dict(common,x=en)
            self.assertEqual(q.checked_search_artifacts(edition,common['l'],hd,ed),(he,en,loc))
            hd['m']=copy.deepcopy(loc);hd['m'][-1][-1]+=1
            with self.assertRaises(ValueError):q.checked_search_artifacts(edition,common['l'],hd,ed)
            if section in (5,6):self.assertEqual((en,loc),(olden,oldloc))
    def test_08_final_fresh_positive(self):self.assertEqual(q.verify(read)['availableEnglish'],366)

if __name__=='__main__':unittest.main(verbosity=2)
