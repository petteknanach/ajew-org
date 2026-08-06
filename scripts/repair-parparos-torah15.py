#!/usr/bin/env python3
"""Repair Parparos LeChochma section 16 metadata: its 22 records are Torah 15."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/reader/parparos-lechochma/section-16.json'
def main():
    data=json.loads(OUT.read_text(encoding='utf-8-sig').replace('\x00',''))
    segments=data.get('segments',[]); expected=list(range(2,43,2))+[43]
    if len(segments)!=22 or [int(x['index']) for x in segments]!=expected: raise RuntimeError('Parparos section 16 must contain 22 records at indices 2–43')
    if any(not x.get('he') or not x.get('en') or x['he'].strip()==x['en'].strip() for x in segments[:-1]): raise RuntimeError('Parparos Torah 15 commentary records must be genuinely bilingual')
    summary=segments[-1]
    if summary.get('he') or not summary.get('en') or 'Summary' not in summary['en']: raise RuntimeError('Parparos record 43 must remain the source English-only translator summary')
    summary.update({'englishOnly':True,'displayLabel':'Source English-only translator summary; no Hebrew source text was supplied.'})
    data.update({'id':'plc-15','torah':15,'displayNumber':15,'hasEnglish':True,'superReaderMetadataRepair':'Section 16 source title/content identifies סימן ט״ו; retained authoritative records 2–43, including the labeled source English-only translator summary at 43.'})
    OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Repaired Parparos section-16 metadata to Torah/display 15; retained 21 bilingual records and labeled English-only source summary 43.')
if __name__=='__main__': main()
