#!/usr/bin/env python3
"""Package all 27 Torah 22 Pettek records with honest asymmetric languages."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/reader/pettek-nanach-commentary/torah-22.json'
EXPECTED={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
CROSSWALK=[(1,1,1),(2,2,2),(3,8,3),(9,14,4),(15,16,5),(17,22,6),(23,33,7),(34,36,8),(37,43,9),(44,46,10),(47,47,11),(48,53,12),(54,60,13),(61,76,14),(77,82,15),(83,91,16),(92,106,17),(107,107,18),(108,108,19),(109,109,20),(110,110,21),(111,111,22),(112,112,23),(113,113,24),(114,116,25),(117,117,26),(118,124,27)]
PRIMARY=[classic for first,last,classic in CROSSWALK for _ in range(first,last+1)]
def main():
 data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')); segments=data.get('segments',[])
 if len(segments)!=27 or [int(x.get('index',0)) for x in segments]!=list(range(1,28)) or [int(x.get('relatedSegment',0)) for x in segments]!=list(range(1,28)): raise RuntimeError('Pettek Torah 22 must contain sequential records/related segments 1-27')
 for item in segments:
  layers=item.get('layers',{}); actual={layer:{lang:bool(str((layers.get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in EXPECTED}
  if actual!=EXPECTED: raise RuntimeError(f'Unexpected Pettek coverage at {item.get("index")}: {actual}')
  related=int(item['relatedSegment']); aligned=[i for i,classic in enumerate(PRIMARY,1) if classic==related]
  if not aligned: raise RuntimeError(f'Classic/Pettek segment {related} has no aligned passage')
  item['alignedPassage']=aligned[0]; item['alignedPassages']=aligned
 data.update({'totalSegments':27,'inScopeRecords':27,'layerAvailability':EXPECTED,'superReaderCoverageNote':'All 27 Classic/Pettek records are in scope. Beginner is English-only; intermediate is bilingual; scholarly is Hebrew-only. Missing languages are unavailable and no translation is fabricated.'})
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Repaired Torah 22 Pettek: 27 in-scope records; beginner EN-only, intermediate HE/EN, scholarly HE-only; explicit Classic crosswalk alignment.')
if __name__=='__main__': main()
