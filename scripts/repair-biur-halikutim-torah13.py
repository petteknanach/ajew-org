#!/usr/bin/env python3
"""Repair Biur HaLikutim section 19 metadata: its content is Torah 13."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/reader/biur-halikutim/section-19.json'
def main():
    data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00',''))
    data.update({'id':'bhl-13','torah':13,'displayNumber':13,'superReaderMetadataRepair':'Section 19 source contains Torah 13; metadata corrected for Super Reader discovery.'})
    if len(data.get('segments',[])) != 13 or any(not x.get('he') for x in data['segments']): raise RuntimeError('Biur section 19 must contain 13 Hebrew records')
    OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Repaired Biur section-19 metadata to Torah/display 13; retained 13 Hebrew records.')
if __name__=='__main__': main()
