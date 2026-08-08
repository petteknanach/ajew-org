#!/usr/bin/env python3
"""Repair Torah 20 Likutay Nanach discovery association to chapter 18."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'src/data/lm-commentaries.json'
def main():
 data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')); related=data['1']['20']['related_commentaries']
 related[:]=[x for x in related if not (x.get('book')=='parparos-lechochma' and int(x.get('sectionNumber',0))==11)]
 nanach=[x for x in related if x.get('book')=='likutay-nanach']
 if len(nanach)!=1: raise RuntimeError('Expected one Torah 20 Likutay Nanach association')
 nanach[0].update({'section':'chapter-18','sectionNumber':18,'sectionTitle':'תורה כ','url':'/reader/likutay-nanach/volume-4/chapter-18.json','sourceRange':{'startIndex':21,'endIndex':26,'count':6},'superReaderBoundaryNote':'Indices 20 and 27 are headings; only 21–26 belong to Torah 20. Stale chapter 24 is unrelated.'})
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Repaired Torah 20 commentary associations: removed false Parparos section 11; Likutay Nanach chapter 18 indices 21–26.')
if __name__=='__main__': main()
