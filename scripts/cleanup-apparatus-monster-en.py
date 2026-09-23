#!/usr/bin/env python3
"""One-off cleanup: empty objectively-broken EN on apparatus segs.

Rule (mechanical, no judgment): a seg with len(he)<45 whose en exceeds 3000
chars (ratio >20x) cannot be a translation of its Hebrew — it is misaligned
fill dumped on a heading/apparatus seg (e.g. 'סימן צט' carrying 130k chars).
Per the user's standing rule (WRONG EN IS WORSE THAN ABSENT, 7953c6676), the
EN is emptied; the reader shows 'Translation not yet available' instead.
Companion safeguard change: check_en_coverage excludes len(he)<45 segs from
BOTH sides (apparatus needs no translation; matches the engines' body-seg
threshold)."""
import json, os, sys

R = '/root/ajew-org/public/reader'
changed_files = 0
changed_segs = 0
report = []
for book in sorted(os.listdir(R)):
    bp = os.path.join(R, book)
    if not os.path.isdir(bp):
        continue
    for root, _, files in os.walk(bp):
        for fn in files:
            if not fn.endswith('.json') or fn == 'index.json':
                continue
            p = os.path.join(root, fn)
            try:
                d = json.load(open(p))
            except Exception:
                continue
            segs = d.get('segments') if isinstance(d, dict) else d
            if not isinstance(segs, list):
                continue
            hit = 0
            for s in segs:
                if not isinstance(s, dict):
                    continue
                he = len(s.get('he') or '')
                en = len(s.get('en') or '')
                if en > 3000 and he < 45 and en / max(he, 1) > 20:
                    s['en'] = ''
                    hit += 1
            if hit:
                json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
                changed_files += 1
                changed_segs += hit
                report.append({'file': p.replace(R + '/', ''), 'segs_emptied': hit})

json.dump(report, open('/root/ajew-overhaul-live-qa/apparatus-en-cleanup-report.json', 'w'), indent=1)
print(f"emptied {changed_segs} segs across {changed_files} files")
