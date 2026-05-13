#!/usr/bin/env python3
"""Verify LH pairing quality after the fix."""
import json, os, re

READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def strip_nikkud(t): return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', t)
def norm(t): return re.sub(r'\s+', ' ', strip_nikkud(t.lower())).strip()
def he_words(t): return set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(t)))

def is_bad_pairing(he, en):
    if not he or not en: return False
    hw = he_words(he)
    if len(hw) < 5: return False
    en_lower = en.lower()
    matches = sum(1 for w in hw if len(w) >= 4 and w.lower() in en_lower)
    return matches == 0

# Check samples from each part
print("=== Quality Check (transliteration matching) ===\n")
for part_dir in sorted(os.listdir(READER_DIR)):
    if not part_dir.startswith('part-'): continue
    part_path = os.path.join(READER_DIR, part_dir)

    part_bad = 0
    part_total = 0

    for f in sorted(os.listdir(part_path)):
        if not f.endswith('.json') or f == 'index.json': continue
        data = json.load(open(os.path.join(part_path, f)))

        for seg in data['segments']:
            he = seg.get('he','').strip()
            en = seg.get('en','').strip()

            if not he or not en: continue
            if len(he) < 30: continue  # Skip headers

            part_total += 1
            if is_bad_pairing(he, en):
                part_bad += 1

    pct = part_bad/part_total*100 if part_total else 0
    print(f"  {part_dir}: {part_bad}/{part_total} bad ({pct:.1f}%)")

# Check specific segments
print("\n=== Spot Check (halacha-1.json) ===")
data = json.load(open(os.path.join(READER_DIR, 'part-1', 'halacha-1.json')))
for i, seg in enumerate(data['segments'][:5]):
    he = seg.get('he','').strip()[:100]
    en = seg.get('en','').strip()[:120]
    bad = is_bad_pairing(seg.get('he',''), seg.get('en',''))
    print(f"Seg {i+1} [{'BAD' if bad else 'OK'}]:")
    print(f"  HE: {he}")
    print(f"  EN: {en}")

print("\n=== Spot Check (halacha-10.json) ===")
data = json.load(open(os.path.join(READER_DIR, 'part-1', 'halacha-10.json')))
for i, seg in enumerate(data['segments'][:8]):
    he = seg.get('he','').strip()[:80]
    en = seg.get('en','').strip()[:80]
    print(f"Seg {i+1} HE: {he}")
    print(f"        EN: {en}")