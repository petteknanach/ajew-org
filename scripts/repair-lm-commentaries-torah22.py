#!/usr/bin/env python3
"""Repair Torah 22 commentary discovery associations to audited semantic packages."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'src/data/lm-commentaries.json'
RANGES=[{'file':'volume-4/chapter-19.json','startIndex':1,'endIndex':15,'count':15},{'file':'volume-4/chapter-20.json','startIndex':1,'endIndex':1,'count':1},{'file':'volume-4/chapter-21.json','startIndex':1,'endIndex':2,'count':2},{'file':'volume-4/chapter-22.json','startIndex':1,'endIndex':1,'count':1},{'file':'volume-4/chapter-23.json','startIndex':1,'endIndex':1,'count':1},{'file':'volume-4/chapter-24.json','startIndex':1,'endIndex':1,'count':1},{'file':'volume-4/chapter-25.json','startIndex':1,'endIndex':12,'count':12}]
def main():
 data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')); related=data['1']['22']['related_commentaries']
 nanach=[x for x in related if x.get('book')=='likutay-nanach']
 if len(nanach)!=1: raise RuntimeError('Expected one Torah 22 Likutay Nanach association')
 nanach[0].update({'section':'torah-22-composite','sectionNumber':22,'sectionTitle':'תורה כב חותם בתוך חותם','url':'/reader/super/likutay-moharan/1/22/likutay-nanach.json','sourceRanges':RANGES,'totalRecords':33,'superReaderBoundaryNote':'Composite substantive range across chapters 19–25. Chapter 18 index 53 is the Torah 22 heading and chapter 25 index 13 is the Torah 23 heading; both are excluded. Stale chapter 26 is unrelated.'})
 biur=[x for x in related if x.get('book')=='biur-halikutim']
 item={'book':'biur-halikutim','section':'section-26-torah-22-slice','sectionNumber':26,'label':'Biur HaLikutim','sectionTitle':'חותם בתוך חותם סימן כ"ב','url':'/reader/super/likutay-moharan/1/22/biur-halikutim.json','sourceRange':{'startIndex':143,'endIndex':210,'count':68},'superReaderBoundaryNote':'Physical index 142 is the heading; physical indices 143–210 are normalized to 1–68 in the Torah 22 package. The shared section-26 source remains intact for Torah 21.'}
 if len(biur)>1: raise RuntimeError('Unexpected duplicate Torah 22 Biur associations')
 if biur: biur[0].clear(); biur[0].update(item)
 else: related.insert(0,item)
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Repaired Torah 22 commentary associations: Biur section-26 slice 143–210 and 33-record composite Likutay Nanach chapters 19–25.')
if __name__=='__main__': main()
