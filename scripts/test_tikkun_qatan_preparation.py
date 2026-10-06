#!/usr/bin/env python3
"""Tests of the fail-closed occurrence mapper; no source/gold modifications."""
import importlib.util
import unittest
import itertools
import json
import hashlib
import os
import shutil
from unittest.mock import patch
from pathlib import Path
spec=importlib.util.spec_from_file_location('qatan_prep',Path(__file__).with_name('prepare-tikkun-qatan-expansion.py'))
assert spec and spec.loader
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)

class OccurrenceMappingTests(unittest.TestCase):
    def test_identical_sequence_maps_every_repeated_occurrence(self):
        a=['kol','one','kol','two']
        for i in range(len(a)): self.assertEqual(p.unique_alignment(a,a,i),i)
    def test_duplicate_in_column_is_not_a_unique_occurrence(self):
        self.assertIsNone(p.unique_alignment(['kol'],['kol','kol'],0))
    def test_optional_match_is_not_authority(self):
        self.assertIsNone(p.unique_alignment(['kol','kol'],['kol'],0))
        self.assertIsNone(p.unique_alignment(['kol','kol'],['kol'],1))
    def test_other_unpointable_word_does_not_shift_target(self):
        self.assertEqual(p.unique_alignment(['one','qere','kol'],['one',None,'kol'],2),2)
    def test_changed_target_never_maps(self):
        self.assertIsNone(p.unique_alignment(['one','different'],['one','kol'],1))
    def test_transport_normalization_keeps_local_vowel_and_stress(self):
        a='\u05db\u05b8\u05dc'
        self.assertEqual(p.normalized(a+'\u05be'),p.normalized(a+' \u05c0'))
        self.assertNotEqual(p.normalized(a),p.normalized(a+'\u05bd'))
        self.assertNotEqual(p.normalized(a),p.normalized(a+'\u0591'))
        self.assertNotEqual(p.normalized(a),p.normalized(a.replace('\u05b8','\u05c7')))
    def test_quality_equivalence_is_diagnostic_only(self):
        a='\u05db\u05b8\u05dc'; b=a.replace('\u05b8','\u05c7')
        self.assertEqual(p.signature(a),p.signature(b)); self.assertNotEqual(p.normalized(a),p.normalized(b))

    def test_exhaustive_all_optimal_alignment_oracle(self):
        # Enumerate exact monotonic MATCH SETS independently; no DP tie-breaker.
        arrays=[list(x) for n in range(1,5) for x in itertools.product(['a','b'],repeat=n)]
        checked=0
        for a in arrays:
            for b in arrays:
                matches: list[tuple[tuple[int,int],...]]=[()]
                def walk(i,j,chosen):
                    for x in range(i,len(a)):
                        for y in range(j,len(b)):
                            if a[x]==b[y]:
                                nxt=chosen+((x,y),);matches.append(nxt);walk(x+1,y+1,nxt)
                walk(0,0,())
                best=max(map(len,matches)); optimal=[m for m in matches if len(m)==best]
                for i in range(len(a)):
                    positions={next((y for x,y in m if x==i),None) for m in optimal}
                    expected=next(iter(positions)) if len(positions)==1 and None not in positions else None
                    self.assertEqual(p.unique_alignment(a,b,i),expected,(a,b,i,positions));checked+=1
        out=Path('/mnt/c/Users/Pettek/Ajew-Qatan-Expansion-20261006/next19-implementation/tests')
        (out/'preparation-alignment-oracle.json').write_text(json.dumps({'pass':True,'arrays':len(arrays),'targetComparisons':checked})+'\n')

    def test_exact19_preparation_authenticates_original_evidence(self):
        e=Path('/mnt/c/Users/Pettek/Ajew-Qatan-Expansion-20261006')
        approved,held,n=p.scan19_decisions(e)
        self.assertEqual(len(approved),19);self.assertEqual(len(held),1);self.assertEqual(n,123)
        self.assertEqual(p.key(held[0]),('tanach-shemos',38,20,0,1))

    def test_real_seal_mutants_fail_before_artifact_use(self):
        e=Path('/mnt/c/Users/Pettek/Ajew-Qatan-Expansion-20261006')
        base=e/'next19-implementation/tests/preparation-mutants'
        controls=[]
        for name,mutate in [
            ('copy-token',lambda rows:rows[0].update(sourceToken=rows[0]['sourceToken']+'א')),
            ('copy-offset',lambda rows:rows[0].update(codepointOffset=8)),
            ('copy-page',lambda rows:rows[0].update(pdfPage=112)),
            ('copy-crop',lambda rows:rows[0].update(imageSha256='0'*64)),
            ('copy-scan',lambda rows:rows[0].update(scanSha256='0'*64)),
            ('copy-permission',lambda rows:rows[0].update(parentDecision='retain-unit-transfer-hold')),
            ('copy-Exodus38-release',lambda rows:rows[3].update(parentDecision='approve-exact-occurrence-for-next-candidate')),
            ('original-parent-drift',None),('predecessor-drift',None),('page-manifest-drift',None),('scan-manifest-drift',None)]:
            w=base/name;local=w/p.SCAN19_PATH;local.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(p.ROOT/p.SCAN19_PATH,local)
            pred=w/p.PREDECESSOR_PATH;shutil.copyfile(p.ROOT/p.PREDECESSOR_PATH,pred)
            pages=w/p.PAGES_PATH;shutil.copyfile(p.ROOT/p.PAGES_PATH,pages)
            fake_e=w/'evidence';parent=fake_e/'parent-final-acceptance/parent-scan-occurrence-decisions.jsonl';parent.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(e/'parent-final-acceptance/parent-scan-occurrence-decisions.jsonl',parent)
            manifest=fake_e/'scan-completion/MANIFEST.json';manifest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(e/'scan-completion/MANIFEST.json',manifest)
            if mutate:
                rows=p.lines(local);mutate(rows);local.write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows))
            elif name=='original-parent-drift':parent.write_bytes(parent.read_bytes()+b' ')
            elif name=='predecessor-drift':pred.write_bytes(pred.read_bytes()+b' ')
            elif name=='page-manifest-drift':pages.write_bytes(pages.read_bytes()+b' ')
            else:manifest.write_bytes(manifest.read_bytes()+b' ')
            with patch.object(p,'ROOT',w):
                with self.assertRaises(AssertionError) as cm:p.scan19_decisions(fake_e)
            controls.append({'label':name,'rejected':True,'error':str(cm.exception)})
        (base.parent/'preparation-mutation-controls.json').write_text(json.dumps(controls,indent=2)+'\n')

if __name__=='__main__': unittest.main(verbosity=2)
