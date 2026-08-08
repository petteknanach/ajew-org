#!/usr/bin/env python3
"""Repair Torah 19 Likutay Nanach discovery association to chapter 18."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'src/data/lm-commentaries.json'
def main():
 data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')); related=data['1']['19']['related_commentaries']; nanach=[x for x in related if x.get('book')=='likutay-nanach']
 if len(nanach)!=1: raise RuntimeError('Expected one Torah 19 Likutay Nanach association')
 nanach[0].update({'section':'chapter-18','sectionNumber':18,'sectionTitle':'תורה יט','url':'/reader/likutay-nanach/volume-4/chapter-18.json','sourceRange':{'startIndex':11,'endIndex':19,'count':9},'superReaderBoundaryNote':'Indices 10 and 20 are headings; only 11–19 belong to Torah 19. Chapters 19 and 23 are unrelated.'})
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Repaired lm-commentaries Torah 19 Likutay Nanach association: chapter 18 indices 11–19 (headings 10/20 excluded).')
if __name__=='__main__': main()
