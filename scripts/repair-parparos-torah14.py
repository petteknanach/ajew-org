#!/usr/bin/env python3
"""Repair Parparos LeChochma section 15 metadata: its four bilingual records are Torah 14."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/reader/parparos-lechochma/section-15.json'
def main():
    data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00',''))
    segments=data.get('segments',[])
    if len(segments)!=4 or [int(x['index']) for x in segments]!=[2,4,6,8]: raise RuntimeError('Parparos section 15 must contain records at indices 2,4,6,8')
    if any(not x.get('he') or not x.get('en') or x['he'].strip()==x['en'].strip() for x in segments): raise RuntimeError('Parparos Torah 14 records must be genuinely bilingual')
    data.update({'id':'plc-14','torah':14,'displayNumber':14,'hasEnglish':True,'superReaderMetadataRepair':'Section 15 source title/content identifies סימן י״ד; retained authoritative records 2–8.'})
    OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Repaired Parparos section-15 metadata to Torah/display 14; retained four bilingual records at indices 2,4,6,8.')
if __name__=='__main__': main()
