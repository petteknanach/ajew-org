#!/usr/bin/env python3
"""Record Torah 17 Pettek's asymmetric layer coverage without fabrication."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/reader/pettek-nanach-commentary/torah-17.json'
EXPECTED={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
def main():
 data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00','')); segments=data.get('segments',[])
 if len(segments)!=36 or [int(x['relatedSegment']) for x in segments]!=list(range(1,37)): raise RuntimeError('Pettek Torah 17 must have 36 Classic-synchronized records')
 for item in segments:
  layers=item.get('layers',{}); actual={layer:{lang:bool(str((layers.get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in EXPECTED}
  if actual!=EXPECTED: raise RuntimeError(f'Unexpected Pettek coverage at {item.get("index")}: {actual}')
 data['layerAvailability']=EXPECTED; data['superReaderCoverageNote']='Beginner is English-only; intermediate is bilingual; scholarly is Hebrew-only. Missing languages are intentionally unavailable and no translation is fabricated.'
 OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Recorded Torah 17 Pettek coverage: beginner EN only, intermediate HE/EN, scholarly HE only (36 records).')
if __name__=='__main__': main()
