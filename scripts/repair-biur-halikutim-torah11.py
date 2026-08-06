#!/usr/bin/env python3
"""Repair Biur HaLikutim section 17 metadata: its content is Torah 11."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/reader/biur-halikutim/section-17.json'
def main():
 d=json.loads(OUT.read_text(encoding='utf-8'));d.update({'id':'bhl-11','torah':11,'displayNumber':11,'superReaderMetadataRepair':'Section 17 source contains Torah 11; metadata corrected for Super Reader discovery.'})
 if len(d.get('segments',[]))!=142:raise RuntimeError('Biur section 17 must contain 142 records')
 OUT.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print('Repaired Biur section-17 metadata to Torah/display 11; retained 142 Hebrew records.')
if __name__=='__main__':main()
