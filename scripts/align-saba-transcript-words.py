#!/usr/bin/env python3
import json,re,sys,unicodedata
from pathlib import Path
from difflib import SequenceMatcher

def norm(s):
    s=unicodedata.normalize('NFKD',s)
    s=''.join(c for c in s if not unicodedata.combining(c))
    return ''.join(c for c in s if '\u05d0'<=c<='\u05ea' or c.isdigit())

def tokenize(text):
    return re.findall(r'\S+\s*',text,flags=re.UNICODE)

tape_json=Path(sys.argv[1]); asr_json=Path(sys.argv[2]); out=Path(sys.argv[3])
tape=json.loads(tape_json.read_text()); asr=json.loads(asr_json.read_text())
ocr=[]; seg_ranges=[]
for seg in tape['segments']:
    start=len(ocr)
    for raw in tokenize(seg.get('he','')):
        n=norm(raw)
        ocr.append({'text':raw,'norm':n,'segmentId':seg['id']})
    seg_ranges.append((seg['id'],start,len(ocr)))
asr_words=[]
for w in asr['words']:
    n=norm(w['word'])
    if n: asr_words.append({**w,'norm':n})
a=[x['norm'] for x in ocr]; b=[x['norm'] for x in asr_words]
sm=SequenceMatcher(None,a,b,autojunk=False)
anchors={}; blocks=[]
for block in sm.get_matching_blocks():
    # A single common Hebrew token can coincide by chance. Only contiguous
    # runs of at least two normalized tokens are safe timestamp anchors.
    if block.size >= 2:
        blocks.append({'ocrStart':block.a,'asrStart':block.b,'size':block.size})
        for k in range(block.size): anchors[block.a+k]=block.b+k
anchor_ocr=sorted(anchors)
# Assign exact anchors.
for oi,aj in anchors.items():
    ocr[oi].update(start=float(asr_words[aj]['start']),end=float(asr_words[aj]['end']),alignment='exact',probability=asr_words[aj].get('probability'))
# Interpolate unmatched OCR tokens between nearest exact anchors. This keeps clicks monotonic while flagging confidence.
for idx,x in enumerate(ocr):
    if 'start' in x: continue
    import bisect
    p=bisect.bisect_left(anchor_ocr,idx)
    left=anchor_ocr[p-1] if p else None; right=anchor_ocr[p] if p<len(anchor_ocr) else None
    if left is not None and right is not None:
        lo=ocr[left]['end']; hi=ocr[right]['start']; frac=(idx-left)/(right-left)
        t=lo+(hi-lo)*frac; gap=hi-lo
    elif right is not None:
        t=max(0,ocr[right]['start']-(right-idx)*.42); gap=ocr[right]['start']
    elif left is not None:
        t=min(float(asr.get('duration') or ocr[left]['end']),ocr[left]['end']+(idx-left)*.42); gap=t-ocr[left]['end']
    else:
        t=0; gap=float(asr.get('duration') or 0)
    x.update(start=round(t,3),end=round(t+.35,3),alignment='interpolated',anchorGapSeconds=round(gap,3))
segments=[]
anchored_segments=0
for sid,s,e in seg_ranges:
    words=[{k:x[k] for k in ('text','start','end','alignment','probability','anchorGapSeconds') if k in x} for x in ocr[s:e]]
    segment_exact=sum(1 for x in ocr[s:e] if x.get('alignment')=='exact')
    segment_publishable=segment_exact >= 2
    if segment_publishable: anchored_segments += 1
    segments.append({'id':sid,'exactAnchorCount':segment_exact,'publishable':segment_publishable,'words':words})
exact=len(anchors); gaps=[x.get('anchorGapSeconds',0) for x in ocr if x.get('alignment')=='interpolated']
exact_percent=round(100*exact/max(1,len(ocr)),2)
anchored_percent=round(100*anchored_segments/max(1,len(seg_ranges)),2)
publishable=exact_percent >= 25 and anchored_percent >= 70
result={'schemaVersion':2,'tape':tape['tapeNumber'],'side':tape['side'],'audioFilename':Path(asr['source']).name,'audioDurationSeconds':asr.get('duration'),'ocrWordCount':len(ocr),'asrWordCount':len(asr_words),'exactAnchorCount':exact,'exactAnchorPercent':exact_percent,'anchoredSegmentCount':anchored_segments,'anchoredSegmentPercent':anchored_percent,'publishable':publishable,'method':'Normalized Hebrew contiguous-token alignment; exact anchors require runs of at least two tokens, with monotonic interpolation between anchors.','maxInterpolationGapSeconds':round(max(gaps,default=0),3),'matchingBlocks':blocks,'segments':segments}
out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['ocrWordCount','asrWordCount','exactAnchorCount','exactAnchorPercent','maxInterpolationGapSeconds']},ensure_ascii=False))
