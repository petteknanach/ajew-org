#!/usr/bin/env python3
"""Package all 29 Torah 20 Pettek records with honest asymmetric languages."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/reader/pettek-nanach-commentary/torah-20.json'
EXPECTED={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
PRIMARY=[2,3]+[5]*6+[7]*4+[9]*2+[11]*4+[12]*2+[13]*2+[15]*2+[16]*8+[18]*2+[20,22]+[24]*3+[26]+[27]*18+[28]*19+[29]
MERGED={1:[1,2],3:[4,5],9:[6,7],13:[8,9],15:[10,11],23:[14,15],33:[17,18],35:[19,20],36:[21,22],37:[23,24],40:[25,26]}
def main():
 data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')); segments=data.get('segments',[])
 if len(segments)!=29 or [int(x.get('index',0)) for x in segments]!=list(range(1,30)) or [int(x.get('relatedSegment',0)) for x in segments]!=list(range(1,30)): raise RuntimeError('Pettek Torah 20 must contain sequential records/related segments 1-29')
 for item in segments:
  layers=item.get('layers',{}); actual={layer:{lang:bool(str((layers.get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in EXPECTED}
  if actual!=EXPECTED: raise RuntimeError(f'Unexpected Pettek coverage at {item.get("index")}: {actual}')
  related=int(item['relatedSegment']); aligned=[i for i,primary in enumerate(PRIMARY,1) if primary==related or related in MERGED.get(i,[])]
  if not aligned: raise RuntimeError(f'Classic/Pettek segment {related} has no aligned passage')
  item['alignedPassage']=aligned[0]; item['alignedPassages']=aligned
 data.update({'totalSegments':29,'inScopeRecords':29,'layerAvailability':EXPECTED,'superReaderCoverageNote':'All 29 Classic/Pettek records are in scope. Beginner is English-only; intermediate is bilingual; scholarly is Hebrew-only. Missing languages are unavailable and no translation is fabricated. Heading records share their merged aligned passage.'})
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Repaired Torah 20 Pettek: 29 in-scope records; beginner EN-only, intermediate HE/EN, scholarly HE-only; explicit Classic crosswalk alignment.')
if __name__=='__main__': main()
