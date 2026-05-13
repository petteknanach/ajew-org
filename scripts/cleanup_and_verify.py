#!/usr/bin/env python3
"""
cleanup_and_verify.py — Remove empty merge artifacts + verify merged quality
"""
import json, os
from pathlib import Path

BASE = Path('/root/ajew-org/public/reader')
H_START, H_END = 0x05D0, 0x05EA

def is_heb_char(c):
    return H_START <= ord(c) <= H_END

def heb_word_count(text):
    clean = ' '.join(text.split())
    words = clean.split()
    if not words: return 0
    return sum(1 for w in words if sum(1 for ch in w if is_heb_char(ch)) > len(w) * 0.4)

cleaned = 0
quality_ok = 0
quality_bad = 0
quality_samples = []

for book_dir in sorted(BASE.iterdir()):
    if not book_dir.is_dir():
        continue
    for jf in sorted(book_dir.glob('*.json')):
        if jf.name == 'index.json':
            continue
        try:
            data = json.load(open(jf))
            segs = data.get('segments', [])
        except:
            continue

        # Remove empty segments
        original_count = len(segs)
        segs = [s for s in segs if s.get('he','').strip() or s.get('en','').strip()]
        if len(segs) < original_count:
            cleaned += original_count - len(segs)
            data['segments'] = segs
            with open(jf, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

        # Quality check remaining pairs
        for s in segs:
            he = s.get('he','').strip()
            en = s.get('en','').strip()
            if he and en:
                hw = heb_word_count(he)
                ew = len(en.split())
                # HE should not be just punctuation/numbers
                heb_chars = sum(1 for c in he if is_heb_char(c))
                if hw > 0 and ew > 0:
                    quality_ok += 1
                else:
                    quality_bad += 1
                    if len(quality_samples) < 5:
                        quality_samples.append((jf.name, he[:60], en[:80]))

print(f"Empty segments removed: {cleaned}")
print(f"Quality OK pairs: {quality_ok}")
print(f"Quality BAD pairs: {quality_bad}")
if quality_samples:
    print(f"\nBad samples:")
    for jf, he, en in quality_samples:
        print(f"  [{jf}] HE={he!r} EN={en!r}")

# Final summary
print(f"\n{'='*70}")
print("FINAL AUDIT SUMMARY")
print(f"{'='*70}")
totals = {'ok':0, 'tiny':0, 'empty_he':0, 'empty_en':0, 'empty_both':0}
for book_dir in sorted(BASE.iterdir()):
    if not book_dir.is_dir(): continue
    name = book_dir.name
    for jf in book_dir.glob('*.json'):
        if jf.name == 'index.json': continue
        try:
            data = json.load(open(jf))
            segs = data.get('segments', data.get('content', []))
        except: continue
        for s in segs:
            he = s.get('he','').strip()
            en = s.get('en','').strip()
            hw = heb_word_count(he)
            ew = len(en.split()) if en else 0
            if not he and not en: totals['empty_both'] += 1
            elif not he: totals['empty_he'] += 1
            elif not en: totals['empty_en'] += 1
            elif hw <= 5 and ew > 5: totals['tiny'] += 1
            else: totals['ok'] += 1

total = sum(totals.values())
print(f"  Quality OK:    {totals['ok']:>7} ({totals['ok']/total*100:.1f}%)")
print(f"  Tiny HE:       {totals['tiny']:>7}")
print(f"  EN-only:       {totals['empty_he']:>7}")
print(f"  HE-only:       {totals['empty_en']:>7}")
print(f"  Empty (both):  {totals['empty_both']:>7}")
print(f"  TOTAL:         {total:>7}")