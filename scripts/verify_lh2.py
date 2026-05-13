#!/usr/bin/env python3
"""Verify LH pairing quality after the indexed fix."""
import json, os, re

READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def strip_nikkud(t): return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', t)
def norm(t): return re.sub(r'\s+', ' ', strip_nikkud(t.lower().strip())).strip()
def he_words(t): return set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(t)))

def is_bad(he, en):
    if not he or not en: return False
    hw = he_words(he)
    if not hw or len(hw) < 5: return False
    matches = sum(1 for w in hw if len(w) >= 4 and w.lower() in en.lower())
    return matches == 0

# Check samples from each part
for part in sorted(os.listdir(READER_DIR)):
    if not part.startswith('part-'): continue
    pdir = os.path.join(READER_DIR, part)
    bad = 0; total = 0
    for f in sorted(os.listdir(pdir)):
        if not f.endswith('.json') or f == 'index.json': continue
        data = json.load(open(os.path.join(pdir, f)))
        for seg in data['segments']:
            he = seg.get('he','').strip()
            en = seg.get('en','').strip()
            if he and en and len(he) > 30 and len(en) > 10:
                total += 1
                if is_bad(he, en): bad += 1
    print(f"  {part}: {bad} bad / {total} checked")

# Also check specific segments that were flagged before
print("\n=== Spot check halacha-1.json ===")
data = json.load(open(os.path.join(READER_DIR, 'part-1', 'halacha-1.json')))
for i, seg in enumerate(data['segments'][:5]):
    he = seg.get('he','').strip()
    en = seg.get('en','').strip()
    bad = is_bad(he, en)
    print(f"  Seg {i+1} [{'BAD' if bad else 'OK'}]:")
    print(f"    HE: {he[:100]}...")
    print(f"    EN: {(en[:120].replace(chr(10),' ') + '...') if en else '(empty)'}")

print("\n=== Spot check halacha-11.json ===")
data = json.load(open(os.path.join(READER_DIR, 'part-1', 'halacha-11.json')))
for i, seg in enumerate(data['segments'][:5]):
    he = seg.get('he','').strip()
    en = seg.get('en','').strip()
    bad = is_bad(he, en)
    print(f"  Seg {i+1} [{'BAD' if bad else 'OK'}]:")
    print(f"    HE: {he[:100]}...")
    print(f"    EN: {(en[:120].replace(chr(10),' ') + '...') if en else '(empty)'}")

print("\n=== Spot check halacha-10.json ===")
data = json.load(open(os.path.join(READER_DIR, 'part-1', 'halacha-10.json')))
for i, seg in enumerate(data['segments'][:5]):
    he = seg.get('he','').strip()
    en = seg.get('en','').strip()
    bad = is_bad(he, en)
    print(f"  Seg {i+1} [{'BAD' if bad else 'OK'}]:")
    print(f"    HE: {he[:100]}...")
    print(f"    EN: {(en[:120].replace(chr(10),' ') + '...') if en else '(empty)'}")