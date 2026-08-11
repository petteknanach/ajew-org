#!/usr/bin/env python3
"""Verify the published Saba tape-side audio manifest and Reader map."""
from pathlib import Path
import json, sys
root=Path(__file__).resolve().parents[1]
base=root/'public/reader/saba-tape-transcripts'
manifest=json.loads((base/'audio-manifest.json').read_text(encoding='utf-8'))
amap=json.loads((base/'audio-map.json').read_text(encoding='utf-8'))
errors=[]
recordings=manifest.get('recordings',[])
entries=amap.get('entries',[])
if len(entries)!=234: errors.append(f'audio-map has {len(entries)} entries, expected 234')
keys=[(x.get('tape'),x.get('side')) for x in entries]
expected=[(t,s) for t in range(1,118) for s in 'ab']
if keys!=expected: errors.append('audio-map tape/side order or coverage is not exactly 1a–117b')
verified=[x for x in entries if x.get('verified') is True]
if len(verified)!=manifest.get('availableSideCount'): errors.append('verified map count differs from manifest')
rec_by_key={(x['tape'],x['side']):x for x in recordings}
if len(rec_by_key)!=len(recordings): errors.append('duplicate tape/side recordings in manifest')
if len({x['sha256'] for x in recordings})!=len(recordings): errors.append('duplicate recording SHA-256 values')
for e in verified:
 r=rec_by_key.get((e['tape'],e['side']))
 if not r: errors.append(f"verified map has no manifest recording: {e['tape']}{e['side']}"); continue
 if e.get('sha256')!=r.get('sha256') or e.get('url')!=r.get('archiveUrl'): errors.append(f"map/manifest mismatch: {e['tape']}{e['side']}")
missing=[f'{e["tape"]:03}_{e["side"]}' for e in entries if not e.get('verified')]
if missing!=manifest.get('missingSides'): errors.append('missing side list differs from manifest')
if errors:
 print('\n'.join(f'ERROR: {e}' for e in errors)); sys.exit(1)
print(json.dumps({'status':'PASS','recordings':len(recordings),'verifiedSides':len(verified),'missingSides':len(missing),'hours':round(manifest['totalDurationSeconds']/3600,2)},ensure_ascii=False))
