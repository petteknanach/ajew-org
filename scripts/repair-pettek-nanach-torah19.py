#!/usr/bin/env python3
"""Package all 34 Torah 19 Pettek records with honest asymmetric languages."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/reader/pettek-nanach-commentary/torah-19.json'
EXPECTED={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
PRIMARY=[1,2,4,6]+[8]*19+[10]+[11]*7+[13]*3+[14]*7+[16]*3+[18]*3+[20]*9+[22]*2+[23]*3+[24]*3+[25]*2+[26]*8+[28]*2+[29]*3+[30]*4+[31]+[32]*3+[33]+[34]*2
MERGED={3:[3,4],4:[5,6],5:[7,8],24:[9,10],32:[12,13],42:[15,16],45:[17,18],48:[19,20],57:[21,22],74:[26,27]}
def main():
 data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')); segments=data.get('segments',[])
 if len(segments)!=34 or [int(x.get('index',0)) for x in segments]!=list(range(1,35)) or [int(x.get('relatedSegment',0)) for x in segments]!=list(range(1,35)): raise RuntimeError('Pettek Torah 19 must contain sequential records/related segments 1-34')
 for item in segments:
  layers=item.get('layers',{}); actual={layer:{lang:bool(str((layers.get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in EXPECTED}
  if actual!=EXPECTED: raise RuntimeError(f'Unexpected Pettek coverage at {item.get("index")}: {actual}')
  related=int(item['relatedSegment']); aligned=[i for i,primary in enumerate(PRIMARY,1) if primary==related or related in MERGED.get(i,[])]
  if not aligned: raise RuntimeError(f'Classic/Pettek segment {related} has no aligned passage')
  item['alignedPassage']=aligned[0]; item['alignedPassages']=aligned
 data.update({'totalSegments':34,'inScopeRecords':34,'layerAvailability':EXPECTED,'superReaderCoverageNote':'All 34 Classic/Pettek records are in scope. Beginner is English-only; intermediate is bilingual; scholarly is Hebrew-only. Missing languages are unavailable and no translation is fabricated. Heading records share their merged aligned passage; Pettek 27 resolves only to passage 74.'})
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Repaired Torah 19 Pettek: 34 in-scope records; beginner EN-only, intermediate HE/EN, scholarly HE-only; explicit Classic crosswalk alignment.')
if __name__=='__main__': main()
