#!/usr/bin/env python3
"""Package all 27 Torah 21 Pettek records with honest asymmetric languages."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/reader/pettek-nanach-commentary/torah-21.json'
EXPECTED={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
PRIMARY=[2,3]+[5]*2+[7]*5+[9]*4+[10]*2+[11]*5+[12]*3+[13]*2+[14]*4+[15]*5+[17]*6+[19]*7+[20]*3+[21]+[22]*5+[23]*4+[24]*11+[25]+[26]*25+[27]*5
MERGED={1:[1,2],3:[4,5],5:[6,7],10:[8,9],35:[16,17],41:[18,19]}
def main():
 data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')); segments=data.get('segments',[])
 if len(segments)!=27 or [int(x.get('index',0)) for x in segments]!=list(range(1,28)) or [int(x.get('relatedSegment',0)) for x in segments]!=list(range(1,28)): raise RuntimeError('Pettek Torah 21 must contain sequential records/related segments 1-27')
 for item in segments:
  layers=item.get('layers',{}); actual={layer:{lang:bool(str((layers.get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in EXPECTED}
  if actual!=EXPECTED: raise RuntimeError(f'Unexpected Pettek coverage at {item.get("index")}: {actual}')
  related=int(item['relatedSegment']); aligned=[i for i,primary in enumerate(PRIMARY,1) if primary==related or related in MERGED.get(i,[])]
  if not aligned: raise RuntimeError(f'Classic/Pettek segment {related} has no aligned passage')
  item['alignedPassage']=aligned[0]; item['alignedPassages']=aligned
 data.update({'totalSegments':27,'inScopeRecords':27,'layerAvailability':EXPECTED,'superReaderCoverageNote':'All 27 Classic/Pettek records are in scope. Beginner is English-only; intermediate is bilingual; scholarly is Hebrew-only. Missing languages are unavailable and no translation is fabricated. Heading records share their merged aligned passage.'})
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Repaired Torah 21 Pettek: 27 in-scope records; beginner EN-only, intermediate HE/EN, scholarly HE-only; explicit Classic crosswalk alignment.')
if __name__=='__main__': main()
