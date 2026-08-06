#!/usr/bin/env python3
"""Package Torah 16 Parparos as one sequential bilingual record while retaining source index 2."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'public/reader/parparos-lechochma/section-17.json'
OUT=ROOT/'public/reader/super/likutay-moharan/1/16/parparos-lechochma.json'
def main():
    data=json.loads(SOURCE.read_text(encoding='utf-8-sig').replace('\x00',''))
    segments=data.get('segments',[])
    if len(segments)!=1 or int(segments[0].get('index',0))!=2: raise RuntimeError('Frozen Parparos section-17 source must contain only source index 2')
    source=segments[0]
    if not source.get('he') or not source.get('en') or source['he'].strip()==source['en'].strip(): raise RuntimeError('Parparos Torah 16 source record must be genuinely bilingual')
    record={**source,'sourceIndex':2,'index':1}
    packaged={**data,'id':'plc-16-super','torah':16,'displayNumber':16,'segments':[record],'totalParagraphs':1,'totalSegments':1,'hasEnglish':True,'sourceFile':str(SOURCE.relative_to(ROOT)),'superReaderMetadataRepair':'Packaged sole substantive source record index 2 as sequential index 1; sourceIndex preserves provenance.'}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(packaged,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Packaged Parparos Torah 16 as one bilingual record (index 1; sourceIndex 2).')
if __name__=='__main__': main()
