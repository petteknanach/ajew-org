"""Focused real export/search functions, no full-site writers or corpus copies."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch
import qualified_aitzoas362_exports as q
import aitzoas_topic_navigation as n

ROOT = Path(__file__).resolve().parents[1]
ORACLE = json.loads((ROOT/'scripts/fixtures/aitzoas-topics-oracle.json').read_text())


class Topics(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.edition = q.load_edition(ROOT)

    def test_01_actual_exports_all_owners_keep_source_and_add_exact_topic_links(self):
        observed = []
        expected = {index:(topic,he,decimal) for topic in ORACLE['topics'] for index,he,decimal in topic['numbers']}
        for section in range(1,7):
            files, entry = q.section_exports(self.edition,section)
            data = json.loads(files['index.json'])
            rows = [r for r in self.edition.rows if r['section']==section]
            self.assertEqual(data['content'], '\n\n'.join(q.passage_text(r) for r in rows))
            self.assertEqual(files['index.txt'].decode(),data['content']+'\n')
            self.assertEqual(len(data['readingNavigation']),len(rows))
            for actual, row, link in zip(data['segments'],rows,data['readingNavigation'],strict=True):
                self.assertEqual(actual,dict(index=row['stableIndex'],**row))
                self.assertEqual(link['sourceUrl'],row['canonicalUrl'])
                self.assertEqual(link['owner'],row['owner'])
                self.assertTrue(link['readingUrl'].endswith('#seg-'+str(row['stableIndex'])))
                self.assertIn(q.escape_exact(link['readingUrl']),files['index.html'].decode())
                self.assertIn(q.escape_exact(q.passage_text(row)),files['index.html'].decode())
                if row['stableIndex'] in expected:
                    topic,he,decimal=expected[row['stableIndex']]
                    self.assertEqual(link['number'],{'he':he,'decimal':decimal})
                    self.assertEqual(link['label'],f"{topic['en']} — {he} ({decimal})")
                    self.assertIn('/topics/',link['readingUrl'])
                elif row['stableIndex'] in (62,63,193):
                    self.assertIsNone(link['number'])
                    self.assertIn('/apparatus/page-headers/',link['readingUrl'])
                observed.append(row['stableIndex'])
        self.assertEqual(observed,list(range(1,367)))

    def test_02_actual_six_search_documents_still_arrive_at_correct_stable_owners(self):
        for section in range(1,7):
            he,en,locations=q.search_text(self.edition,section)
            meta=self.edition.sections[section-1]
            link=f'/reader/aitzoas-yeshuroas/1/{section}'
            fields={'t':meta['title'][:200],'h':(meta.get('hebrewTitle') or meta['title'])[:200],'b':q.BOOK,'l':link,'a':'','e':en[:500]}
            hd: dict = dict(fields,x=he,m=locations)
            ed: dict = dict(fields,x=en)
            self.assertEqual(q.checked_search_artifacts(self.edition,link,hd,ed),(he,en,locations))
            self.assertEqual([r[0] for r in locations],[r['stableIndex'] for r in self.edition.rows if r['section']==section])
            wrong=copy.deepcopy(hd);wrong['m'][0][0]=999
            with self.assertRaises(ValueError):q.checked_search_artifacts(self.edition,link,wrong,ed)
            q.checked_search_artifacts(self.edition,link,hd,ed)
        with self.assertRaises(ValueError):q.route_section('/reader/aitzoas-yeshuroas/topics/eating/')

    def test_03_topic_projection_pin_rejects_wrong_mapping_then_fresh_positive(self):
        before=n.navigation(self.edition.rows)
        with patch.object(n,'TOPICS_SHA256','0'*64):
            with self.assertRaisesRegex(ValueError,'Topic projection binding drift'):q.section_exports(self.edition,2)
        self.assertEqual(n.navigation(self.edition.rows),before)
        q.section_exports(self.edition,2)


if __name__=='__main__':unittest.main(verbosity=2)
