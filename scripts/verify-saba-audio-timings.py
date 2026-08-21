#!/usr/bin/env python3
"""Validate all generated transcript/audio timing artifacts."""
from pathlib import Path
import json, re, sys
root = Path(__file__).resolve().parents[1]
base = root / 'public/reader/saba-tape-transcripts'
errors=[]; reports=[]
for timing_path in sorted((base/'timings').glob('*.json')):
    t=json.loads(timing_path.read_text())
    tape_path=base/'tapes'/f"tape-{t['tape']:03}-{t['side']}.json"
    source=json.loads(tape_path.read_text())
    source_by_id={s['id']:s.get('he','') for s in source['segments']}
    previous=-1.0; exact=0; publishable_segments=0
    for segment in t.get('segments',[]):
        sid=segment['id']; words=segment.get('words',[])
        rebuilt=''.join(w['text'] for w in words)
        if rebuilt != source_by_id.get(sid,''):
            errors.append(f'{timing_path.name}: token text does not exactly reconstruct {sid}')
        segment_exact=sum(w.get('alignment')=='exact' for w in words)
        if segment_exact != segment.get('exactAnchorCount'):
            errors.append(f'{timing_path.name}: exact count mismatch in {sid}')
        if segment.get('publishable') is not (segment_exact >= 2):
            errors.append(f'{timing_path.name}: segment publication gate mismatch in {sid}')
        publishable_segments += bool(segment.get('publishable'))
        for w in words:
            start=float(w['start']); end=float(w['end'])
            if start < previous-0.001 or end < start:
                errors.append(f'{timing_path.name}: non-monotonic time in {sid}')
                break
            if start < 0 or end > float(t['audioDurationSeconds'])+1:
                errors.append(f'{timing_path.name}: out-of-range time in {sid}')
                break
            previous=start; exact += w.get('alignment')=='exact'
    standard_publish=(t.get('exactAnchorPercent',0)>=25 and t.get('anchoredSegmentPercent',0)>=70)
    exact_words=[w for segment in t.get('segments',[]) for w in segment.get('words',[]) if w.get('alignment')=='exact']
    override=t.get('qualityOverride') or {}
    boundary=float(override.get('maxBoundaryGapSeconds',30))
    audited_override=(
        override.get('approved') is True
        and exact >= int(override.get('minimumExactAnchors',150))
        and float(t.get('anchoredSegmentPercent',0)) >= float(override.get('minimumAnchoredSegmentPercent',0))
        and (not override.get('requireAllSegmentsAnchored') or publishable_segments == len(t.get('segments',[])))
        and bool(exact_words)
        and float(exact_words[0]['start']) <= boundary
        and float(exact_words[-1]['start']) >= float(t['audioDurationSeconds'])-boundary
    )
    expected_publish=standard_publish or audited_override
    if t.get('publishable') is not expected_publish:
        errors.append(f'{timing_path.name}: file publication gate mismatch')
    if exact != t.get('exactAnchorCount'):
        errors.append(f'{timing_path.name}: file exact count mismatch')
    reports.append({'file':timing_path.name,'publishable':t.get('publishable'),'exactPercent':t.get('exactAnchorPercent'),'publishedSegments':publishable_segments,'segments':len(t.get('segments',[]))})
if errors:
    print('\n'.join('ERROR: '+x for x in errors)); sys.exit(1)
print(json.dumps({'status':'PASS','timingFiles':len(reports),'publishableFiles':sum(x['publishable'] is True for x in reports),'publishedSegments':sum(x['publishedSegments'] for x in reports),'reports':reports},ensure_ascii=False))
