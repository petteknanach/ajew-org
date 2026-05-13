#!/usr/bin/env python3
"""
verify_and_deep_audit.py — Verify fix quality + deep audit of EN-only segments
"""
import json, os, re
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

# 1. Verify no regressions — check that merged content makes sense
print("=" * 70)
print("QUALITY VERIFICATION")
print("=" * 70)

issues = []
for book_dir in sorted(BASE.iterdir()):
    if not book_dir.is_dir():
        continue
    for jf in book_dir.glob('*.json'):
        if jf.name == 'index.json':
            continue
        try:
            data = json.load(open(jf))
            segs = data.get('segments', [])
        except:
            continue
        prev_he = ''
        prev_en = ''
        for i, s in enumerate(segs):
            he = s.get('he', '').strip()
            en = s.get('en', '').strip()

            # Check for empty segments
            if not he and not en:
                issues.append(f"  EMPTY segment: {jf.name}:{i}")

            # Check that merged content doesn't have reversed EN in HE
            if he and not is_heb_char(he[0]) and len(he) > 3:
                issues.append(f"  HE starts with non-Hebrew: {jf.name}:{i}: {he[:60]!r}")

            # Check merged EN isn't duplicated from HE
            if he and en and he.strip() == en.strip()[:len(he)]:
                issues.append(f"  Possible duplicate: {jf.name}:{i}")

            prev_he, prev_en = he, en

if issues:
    print(f"Found {len(issues)} issues:")
    for iss in issues[:20]:
        print(iss)
else:
    print("  No regressions found!")

# 2. Deep audit of EN-only segments
print(f"\n{'=' * 70}")
print("EN-ONLY SEGMENT ANALYSIS (6,593 segments with EN but no HE)")
print("=" * 70)

en_only_stats = {}
for book_dir in sorted(BASE.iterdir()):
    if not book_dir.is_dir():
        continue
    name = book_dir.name
    count = 0
    sample = None
    for jf in book_dir.glob('*.json'):
        if jf.name == 'index.json':
            continue
        try:
            data = json.load(open(jf))
            segs = data.get('segments', [])
        except:
            continue
        for s in segs:
            he = s.get('he', '').strip()
            en = s.get('en', '').strip()
            if en and not he:
                count += 1
                if sample is None and len(en) > 50:
                    sample = en[:120]
    if count > 0:
        en_only_stats[name] = {'count': count, 'sample': sample}

print(f"\n{len(en_only_stats)} books have EN-only segments:\n")
for name in sorted(en_only_stats.keys(), key=lambda x: -en_only_stats[x]['count']):
    info = en_only_stats[name]
    print(f"  {name}: {info['count']} EN-only")
    print(f"    Sample: {info['sample']}")

# 3. Check if any of these could have Hebrew by looking at context
print(f"\n{'=' * 70}")
print("POTENTIAL FIXABLE EN-ONLY (have HE in adjacent segments)")
print("=" * 70)

fixable = 0
for book_dir in sorted(BASE.iterdir()):
    if not book_dir.is_dir():
        continue
    name = book_dir.name
    for jf in book_dir.glob('*.json'):
        if jf.name == 'index.json':
            continue
        try:
            data = json.load(open(jf))
            segs = data.get('segments', [])
        except:
            continue
        for i, s in enumerate(segs):
            he = s.get('he', '').strip()
            en = s.get('en', '').strip()
            if en and not he:
                # Check neighbors
                prev_he = segs[i-1].get('he','').strip() if i > 0 else ''
                next_he = segs[i+1].get('he','').strip() if i < len(segs)-1 else ''
                if prev_he and heb_word_count(prev_he) > 3:
                    fixable += 1
                    if fixable <= 5:
                        print(f"  [{name}] {jf.name}:{i} could inherit from prev")
                        print(f"    Prev HE: {prev_he[:80]!r}")
                        print(f"    Curr EN: {en[:80]!r}")
                    break
                if next_he and heb_word_count(next_he) > 3:
                    fixable += 1
                    if fixable <= 5:
                        print(f"  [{name}] {jf.name}:{i} could inherit from next")
                    break