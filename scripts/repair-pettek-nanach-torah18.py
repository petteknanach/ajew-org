#!/usr/bin/env python3
"""Package Torah 18 Pettek records 1-28 with honest asymmetric languages."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/reader/pettek-nanach-commentary/torah-18.json'
EXPECTED={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
ALIGNED={1:1,2:2,3:3,4:3,5:4,6:4,7:5,8:7,9:7,10:10,11:14,12:16,13:19,14:19,15:20,16:23,17:23,18:28,19:32,20:32,21:35,22:35,23:45,24:45,25:49,26:49,27:55,28:None}
def main():
 data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')); physical=data.get('segments',[])
 if len(physical) not in (28,29) or [int(x['relatedSegment']) for x in physical]!=list(range(1,len(physical)+1)): raise RuntimeError('Pettek Torah 18 physical sequence changed')
 if len(physical)==29 and 'ספרא דצניעותא' not in json.dumps(physical[28],ensure_ascii=False): raise RuntimeError('Pettek 29 boundary changed')
 segments=[]
 for item in physical[:28]:
  layers=item.get('layers',{}); actual={layer:{lang:bool(str((layers.get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in EXPECTED}
  if actual!=EXPECTED: raise RuntimeError(f'Unexpected Pettek coverage at {item.get("index")}: {actual}')
  copy=dict(item); related=int(copy['relatedSegment']); copy['alignedPassage']=ALIGNED[related]
  if related==28: copy['alignmentTarget']='hebrew-only-edition-close'
  segments.append(copy)
 data['segments']=segments; data['totalSegments']=28; data['inScopeRecords']=28; data['excludedPhysicalRecord']={'index':29,'reason':'Sifra d’Tzni’usa is the Torah 19 heading'}; data['layerAvailability']=EXPECTED; data['superReaderCoverageNote']='Beginner is English-only; intermediate is bilingual; scholarly is Hebrew-only. Missing languages are intentionally unavailable and no translation is fabricated. Classic/Pettek 28 targets the separate Hebrew-only edition close.'
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Repaired Torah 18 Pettek: retained records 1–28, excluded Torah 19 heading 29; beginner EN-only, intermediate HE/EN, scholarly HE-only.')
if __name__=='__main__': main()
