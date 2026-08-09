#!/usr/bin/env python3
"""Repair Torah 21 Likutay Nanach discovery association to chapter 18."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'src/data/lm-commentaries.json'
def main():
 data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')); related=data['1']['21']['related_commentaries']
 nanach=[x for x in related if x.get('book')=='likutay-nanach']
 if len(nanach)!=1: raise RuntimeError('Expected one Torah 21 Likutay Nanach association')
 nanach[0].update({'section':'chapter-18','sectionNumber':18,'sectionTitle':'תורה כא','url':'/reader/likutay-nanach/volume-4/chapter-18.json','sourceRange':{'startIndex':28,'endIndex':52,'count':25},'superReaderBoundaryNote':'Index 27 is the Torah 21 heading and index 53 is the Torah 22 heading; only substantive indices 28–52 belong to Torah 21. Index 49 is substantive and included. Stale chapter 25 is unrelated.'})
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Repaired Torah 21 commentary association: Likutay Nanach chapter 18 substantive indices 28–52.')
if __name__=='__main__': main()
