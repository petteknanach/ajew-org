#!/usr/bin/env python3
"""Repair Torah 18 Likutay Nanach discovery association to chapter 18."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'src/data/lm-commentaries.json'
def main():
 data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')); entry=data['1']['18']; related=entry['related_commentaries']
 nanach=[x for x in related if x.get('book')=='likutay-nanach']
 if len(nanach)!=1: raise RuntimeError('Expected one Torah 18 Likutay Nanach association')
 nanach[0].update({'section':'chapter-18','sectionNumber':18,'sectionTitle':'תורה יח','url':'/reader/likutay-nanach/volume-4/chapter-18.json','sourceRange':{'startIndex':5,'endIndex':9,'count':5},'superReaderBoundaryNote':'Indices 4 and 10 are headings; only 5–9 belong to Torah 18.'})
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Repaired lm-commentaries Torah 18 Likutay Nanach association: chapter 18 indices 5–9 (headings 4/10 excluded).')
if __name__=='__main__': main()
