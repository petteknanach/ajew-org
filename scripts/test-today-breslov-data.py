#!/usr/bin/env python3
"""Data/source-contract tests only; no build, browser, deployment or source writes.

python3 scripts/test-today-breslov-data.py --source-root /root/ajew-org
Tests load one source file at a time. They verify extraction/ownership, not the
semantic completeness of all date mentions in the Reader corpus.
"""
import argparse
from collections import Counter
import importlib.util
import json
from pathlib import Path
import re
import sys
import unittest

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser()
ap.add_argument('--source-root',type=Path,default=ROOT)
ap.add_argument('--report',type=Path)
args,unittest_args=ap.parse_known_args()
spec=importlib.util.spec_from_file_location('today_builder',ROOT/'scripts/build-today-breslov.py')
assert spec is not None and spec.loader is not None
B=importlib.util.module_from_spec(spec)
spec.loader.exec_module(B)


class DateParserTests(unittest.TestCase):
    def parsed(self,text,expected):
        value,reason=B.parse_dateline(text)
        self.assertIsNone(reason,text)
        self.assertEqual(tuple(value[k] for k in ('month','day','year')),expected)

    def test_pointed_bracketed_dateline(self):
        self.parsed('בְּעֶזְרַת הַשֵּׁם, יוֹם ה\' [ו\' אייר] תקס"ז.',('Iyyar',6,5567))

    def test_location_abbreviation_is_not_a_second_year(self):
        self.parsed('יום א\' שמות טו"ב טבת תשי"ג מירון ת"ו',('Tevet',17,5713))
        self.assertIsNone(B.parse_year('מירון ת"ו'))

    def test_unknown_year_stays_null(self):
        self.parsed('בעזרת השם, יום ב\' [י"ז אייר].',('Iyyar',17,None))

    def test_ordinary_first_and_second_adar_separate(self):
        self.parsed('ב"ה י"ב אדר תשט"ו',('Adar',12,5715))
        self.parsed('ב"ה ג\' אדר א\' תקפ"ד',('Adar I',3,5584))
        self.parsed('ב"ה יא\' לחודש אדר שני, תשי"ד',('Adar II',11,5714))

    def test_generic_adar_in_leap_year_is_held(self):
        self.assertIn('unspecified Adar',B.parse_dateline('ב"ה ה\' אדר תשכ"ה')[1])

    def test_generic_unknown_adar_does_not_become_adar_ii(self):
        self.parsed('ב"ה י"ט אדר',('Adar',19,None))

    def test_weekday_is_not_day_of_month(self):
        self.assertEqual(B.explicit_dates('ב"ה יום ה\' תשרי תשט"ז פה מירון'),[])

    def test_relative_parsha_and_month_only_are_not_inferred(self):
        for text in ['יום ב\' פ\' שמות תשט"ז','ראש חדש חשון תקצ"ד',
                     'ערב ראש חדש תמוז תקצ"ד','סמוך לראש חדש ניסן','בחודש אלול תקצ"א']:
            self.assertIsNone(B.parse_dateline(text)[0],text)

    def test_multiple_or_ranged_dates_held(self):
        for text in ['י"ב חשון תר"פ-תרפ"ג','י"ד אדר א\' או י"ד אדר ב\' תר"ל',
                     'י"ב ניסן תקצ"ג י"ג ניסן תקצ"ג','כ"ב אב; לא יאוחר מתרכ"ז']:
            self.assertIsNone(B.parse_dateline(text)[0],text)

    def test_bad_month_days_and_leap_names_held(self):
        for date in [('Iyyar',30,5715),('Adar II',30,5714),('Adar I',3,5715),
                     ('Nisan',31,5700),('NotAMonth',1,None)]:
            self.assertIsNotNone(B.invalid_date(*date),date)

    def test_boundaries_do_not_extract_date_from_words(self):
        for text in ['אדרבא דבר חשוב','התורה בענין ניסן','רבי ניסן ברסלבר','אחד אבא ואחד בן']:
            self.assertEqual(B.explicit_dates(text),[],text)

    def test_calendar_year_length_validation(self):
        for year in range(5500,5741):
            self.assertIn(B.year_start(year+1)-B.year_start(year),(353,354,355,383,384,385))


class RegistryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry=json.loads((ROOT/'public/data/today-breslov-events.json').read_text())
        cls.builder=B.Builder(args.source_root)
        cls.fresh,cls.report=cls.builder.build()
        cls.events=cls.registry['events']

    def test_populated_and_exact_rebuild(self):
        self.assertGreater(len(self.events),100)
        self.assertEqual(self.registry,self.fresh)
        self.assertEqual((ROOT/'public/data/today-breslov-events.json').read_bytes(),B.serialized(self.fresh))

    def test_schema_bilingual_and_allowed_values(self):
        ids=[]
        for e in self.events:
            ids.append(e['id'])
            self.assertTrue(re.fullmatch('[a-z0-9-]+',e['id']))
            self.assertIn(e['kind'],('teaching','letter','yahrzeit','decree','history','other'))
            self.assertIsNone(B.invalid_date(e['month'],e['day'],e['year']))
            for field in ('title','description'):
                self.assertEqual(set(e[field]),{'en','he'})
                self.assertTrue(e[field]['en'].strip())
                self.assertRegex(e[field]['he'],'[א-ת]')
            self.assertTrue(e['sources'])
            self.assertTrue(e['provenance'])
            self.assertNotIn('gregorian',e)
            for source in e['sources']:
                self.assertEqual(set(source['label']),{'en','he'})
                self.assertTrue(source['quoteHe'])
        self.assertEqual(len(ids),len(set(ids)))

    def test_declared_counts_and_order(self):
        self.assertEqual(self.registry['countsByKind'],dict(sorted(Counter(e['kind'] for e in self.events).items())))
        self.assertEqual(self.report['eventCount'],len(self.events))
        self.assertEqual(self.report['excludedCount'],len(self.report['exclusions']))
        self.assertEqual(self.report['excludedByReason'],dict(sorted(Counter(x['reason'] for x in self.report['exclusions']).items())))
        expected=sorted(self.events,key=lambda e:(B.MONTHS.index(e['month']),e['day'],e['year'] or 0,e['kind'],e['id']))
        self.assertEqual(self.events,expected)

    def test_all_evidence_exact_and_hash_bound(self):
        # Group by file so each manuscript is opened only once and then released.
        by_file={}
        for e in self.events:
            for source in e['sources']:
                by_file.setdefault(source['provenance']['file'],[]).append(source)
        for rel,sources in by_file.items():
            root=ROOT if rel.startswith('src/') else args.source_root
            raw=(root/rel).read_bytes()
            value=json.loads(raw) if rel.endswith('.json') else raw.decode()
            for source in sources:
                p=source['provenance']
                self.assertEqual(p['sha256'],B.digest(raw),rel)
                if 'segmentIndex' in p:
                    matches=[s for s in value['segments'] if s['index']==p['segmentIndex']]
                    self.assertEqual(len(matches),1,rel)
                    self.assertIn(source['quoteHe'],matches[0]['he'],rel)
                elif 'jsonPointer' in p:
                    i=int(p['jsonPointer'].rsplit('/',1)[1]); row=value['all_tzaddikim'][i]
                    self.assertEqual(source['quoteHe'],row['hebrew_name'])
                    body=json.dumps(row,ensure_ascii=False,sort_keys=True,separators=(',',':'))
                    self.assertEqual(p['rowSha256'],B.digest(body.encode()))
                elif 'line' in p:
                    self.assertEqual(source['quoteHe'],value.splitlines()[p['line']-1].strip())
                else:
                    self.fail('Unrecognized provenance owner '+rel)

    def test_original_anchor_contracts_not_aligned_or_guessed(self):
        for e in self.events:
            for s in e['sources']:
                p=s['provenance']
                if 'routeFile' not in p:
                    self.assertEqual(s['url'],'/today-in-breslov/sources/#'+e['id'])
                    self.assertIn('id={event.id}',(ROOT/'src/pages/today-in-breslov/sources.astro').read_text())
                    continue
                raw=(ROOT/p['routeFile']).read_bytes()
                self.assertEqual(p['routeSha256'],B.digest(raw))
                self.assertIn('torahData.segments',raw.decode())
                anchored='id={`seg-${seg.index}`}' in raw.decode()
                self.assertEqual(p['fragmentVerified'],anchored)
                if anchored:
                    self.assertTrue(s['url'].endswith('#seg-'+str(p['segmentIndex'])))
                else:
                    self.assertNotIn('#',s['url'])
                    self.assertIn('alim-litrufa',s['url'])
                self.assertNotIn('#aligned-',s['url'])

    def test_letter_event_dates_match_each_quoted_dateline(self):
        for e in self.events:
            if e['kind']!='letter':continue
            for s in e['sources']:
                if s['provenance']['rule']=='reviewed-letter-dateline':
                    rows=[r for r in self.builder.reviewed['manualLetters'] if r['id']==e['id']]
                    self.assertEqual(len(rows),1)
                    row=rows[0]
                    self.assertEqual(s['quoteHe'],row['quoteHe'])
                    self.assertEqual((e['month'],e['day'],e['year']),tuple(row[k] for k in ('month','day','year')))
                else:
                    value,reason=B.parse_dateline(s['quoteHe'])
                    self.assertIsNone(reason)
                    self.assertEqual((e['month'],e['day'],e['year']),tuple(value[k] for k in ('month','day','year')))

    def test_explicit_unknown_year_example_preserved(self):
        event=next(e for e in self.events if e['id'].startswith('alim-litrufa-letter-1-4-'))
        self.assertIsNone(event['year'])
        self.assertEqual((event['month'],event['day']),('Iyyar',17))

    def test_ambiguous_yahrzeits_and_cutoff_excluded(self):
        blocked=('saba yisroel ber odesser','alter of teplik','nachman of tulchin')
        for e in self.events:
            if e['kind']=='yahrzeit':
                self.assertFalse(any(t in e['title']['en'].lower() for t in blocked))
        reasons=' '.join(x['reason'] for x in self.report['exclusions'])
        self.assertIn('Adar I / Adar II conflict',reasons)
        self.assertIn('12 / 13 Adar II conflict',reasons)
        self.assertIn('post-1980',reasons)

    def test_narrative_body_date_did_not_create_a_letter(self):
        self.assertFalse(any(e['id'].startswith('alim-litrufa-letter-2-192-') for e in self.events))

    def test_merged_import_duplicates_have_one_event_many_sources(self):
        matches=[e for e in self.events if any('/michtevay-shmuel/2/55/' in s['url'] for s in e['sources'])]
        self.assertEqual(len(matches),1)
        self.assertGreater(len(matches[0]['sources']),1)
        self.assertGreater(self.report['duplicateLetterOccurrencesMerged'],0)

    def test_real_teaching_and_history_examples(self):
        teaching=next(e for e in self.events if e['id']=='chayey-moharan-teaching-1-223')
        self.assertEqual((teaching['month'],teaching['day'],teaching['year']),('Nisan',3,5563))
        self.assertIn('Likutay Moharan 49',teaching['description']['en'])
        petek=next(e for e in self.events if e['id']=='breslov-widget-chag-hapetek')
        self.assertEqual((petek['month'],petek['day'],petek['year']),('Tamuz',23,None))

    def test_scope_and_missing_coverage_honestly_declared(self):
        self.assertIn('not exhaustive',self.registry['coverage']['policy'])
        self.assertFalse(any('mention candidate only' in x['reason'] for x in self.report['exclusions']))
        self.assertEqual(self.registry['coverage']['reviewedNarrativeCandidateCount'],53)
        self.assertEqual(len(self.builder.reviewed['reviewedNarrativeOwners']),53)
        self.assertIn('dateline',self.registry['coverage']['letterDescriptionScope'])

    def test_reviewed_identity_join_rejects_same_date_wrong_person(self):
        for binding in self.builder.reviewed['identityBindings'].values():
            row={'name':binding['englishName'],'hebrew_name':binding['databaseName']}
            self.assertTrue(B.identity_matches(binding,binding['sourceName'],row,binding['date']))
            self.assertFalse(B.identity_matches(binding,binding['sourceName'],dict(row,name='A different person'),binding['date']))
            self.assertFalse(B.identity_matches(binding,binding['sourceName'],dict(row,hebrew_name='אדם אחר'),binding['date']))
            self.assertFalse(B.identity_matches(binding,'אדם אחר',row,binding['date']))
            self.assertTrue(B.identity_matches(binding,binding['sourceName'],row,binding['date']))

    def test_reviewed_letter_corrections_and_complete_duplicate_merge(self):
        by={e['id']:e for e in self.events}
        self.assertIn('Yitzchak Menachem Rosenberg',by['michtevay-shmuel-letter-1-4-p13']['description']['en'])
        self.assertIn('אב״צ',by['michtevay-shmuel-letter-1-5-p12']['description']['en'])
        self.assertIn('in Uman',by['michtevay-shmuel-letter-1-7-p21']['description']['en'])
        self.assertIn('delayed or continued',by['michtevay-shmuel-letter-1-3-p22']['description']['en'])
        self.assertTrue(by['michtevay-shmuel-letter-1-3-p19']['dateNote'])
        merged=by['michtevay-shmuel-letter-1-8-p13']
        self.assertEqual(len(merged['sources']),5)
        self.assertNotIn('michtevay-shmuel-letter-2-144-p1',by)
        self.assertNotIn('michtevay-shmuel-letter-2-44-p1',by)
        self.assertIn('tentative',by['breslov-yahrzeit-geedoolay-1505']['description']['en'])

    def test_nine_reviewed_datelines_have_the_independently_adjudicated_dates(self):
        expected={('alim-litrufa',2,8,7):('Tevet',7,5584),('alim-litrufa',2,71,1):('Nisan',1,5592),
          ('michtevay-shmuel',1,13,13):('Shvat',1,5728),('michtevay-shmuel',1,13,15):('Av',5,None),
          ('michtevay-shmuel',1,10,17):('Adar II',1,None),('michtevay-shmuel',2,54,1):('Elul',1,None),
          ('michtevay-shmuel',2,58,1):('Tamuz',1,5725),('michtevay-shmuel',2,9,1):('Cheshvan',15,None),
          ('michtevay-shmuel',2,95,1):('Adar',24,5686)}
        manual=[e for e in self.events if any(s['provenance']['rule']=='reviewed-letter-dateline' for s in e['sources'])]
        self.assertEqual(len(manual),9)
        for e in manual:
            p=e['sources'][0]['provenance']; parts=p['file'].split('/');key=(parts[2],int(parts[3].split('-')[1]),int(Path(parts[4]).stem.split('-')[1]),p['segmentIndex'])
            self.assertEqual((e['month'],e['day'],e['year']),expected[key])
            self.assertTrue(e.get('dateNote') or key==('alim-litrufa',2,8,7))

    def test_reviewed_narrative_corrections_and_conflict_qualifications(self):
        by={e['id']:e for e in self.events}
        departure=by['geedoolay-hanachal-history-1-482']
        self.assertEqual((departure['month'],departure['day'],departure['year']),('Iyyar',4,5570))
        self.assertTrue(any('/yemei-moharnat/1/48/#seg-1' in s['url'] for s in departure['sources']))
        self.assertIn('stay',departure['dateNote']['en'])
        self.assertIn('Rabbi Shmuel then visited',by['narrative-shmuel-communal-kashrus']['description']['en'])
        self.assertIn('רבי שמואל הלך',by['narrative-shmuel-communal-kashrus']['description']['he'])
        for event_id,phrase in [('narrative-nachman-uman-arrival','4 Iyyar'),('narrative-shmuel-son-homecoming','25 Sivan')]:
            self.assertIn(phrase,by[event_id]['dateNote']['en'])
            self.assertTrue(by[event_id]['dateNote']['he'])
        owners=self.builder.reviewed['reviewedNarrativeOwners']
        self.assertEqual(len({(r['source'],r['owner']) for r in owners}),53)
        self.assertEqual(len(self.builder.reviewed['narrativeEvents']),36)

    def test_both_attested_irregular_brackets_keep_complete_warning(self):
        by={e['id']:e for e in self.events}
        for event_id in ['alim-litrufa-letter-2-19-p1','michtevay-shmuel-letter-1-3-p19']:
            event=by[event_id]
            value,reason=B.parse_dateline(event['sources'][0]['quoteHe'])
            self.assertIsNone(reason)
            self.assertTrue(value['bracketed'])
            for lang,warning in [('en','The day/month is supplied in square brackets in the registered Hebrew dateline; not independently reconstructed here.'),('he','היום והחודש ניתנו בסוגריים מרובעים בכותרת העברית הרשומה; לא שוחזרו כאן באופן עצמאי.')]:
                self.assertIn(warning,event['dateNote'][lang])
        source=(args.source_root/'public/reader/alim-litrufa/part-2/letter-19.json').read_text()
        self.assertIn('[כ\\\"ט אב}',source)

    def test_optional_persisted_report_size_and_counts(self):
        if args.report is None:
            self.skipTest('Pass --report to verify the Windows report')
        raw=args.report.read_bytes()
        self.assertLessEqual(len(raw),250_000)
        report=json.loads(raw)
        self.assertEqual(report['eventCount'],len(self.events))
        self.assertEqual(report['countsByKind'],self.registry['countsByKind'])
        self.assertEqual(report['excludedCount'],len(report['exclusions']))
        reasons=report['exclusionReasons']
        self.assertEqual(report['excludedByReason'],dict(sorted(Counter(reasons[x[2]] for x in report['exclusions']).items())))


if __name__=='__main__':
    unittest.main(argv=[sys.argv[0]]+unittest_args,verbosity=2)
