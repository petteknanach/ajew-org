#!/usr/bin/env python3
"""Quality check for LH fix."""
import json, os, re

READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def strip_nikkud(t): return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', t)
def norm(t): return re.sub(r'\s+', ' ', strip_nikkud(t.lower())).strip()
def he_words(t): return set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(t)))

def is_meta(text):
    t = text.lower().strip()
    if len(t) < 5 or len(t.split()) <= 2: return True
    prefixes = ['hilchos','na nach','siman ','seif ','osio ','volume ',
                'introduction','likutay','a collection','the laws ','oc ',
                'yd ','eh ','cm ','like all','naanach','segment']
    return any(t.startswith(p) for p in prefixes)

def is_bad_pairing(he, en):
    if not he or not en: return False
    hw = he_words(he)
    if len(hw) < 5: return False
    en_lower = en.lower()
    matches = sum(1 for w in hw if len(w) >= 4 and w.lower() in en_lower)
    return matches == 0

# Check sample from each part
print("=== Quality Check ===\n")
total_bad = 0
total_checked = 0

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

            if not he or is_meta(he) or not en:
                continue

            part_total += 1
            total_checked += 1

            if is_bad_pairing(he, en):
                part_bad += 1
                total_bad += 1

    pct = part_bad/part_total*100 if part_total else 0
    print(f"  {part_dir}: {part_bad}/{part_total} bad ({pct:.1f}%)")

print(f"\nTOTAL: {total_bad}/{total_checked} bad ({total_bad/total_checked*100:.1f}%)")

# Check specific segments
print("\n=== Spot Check (halacha-1.json) ===")
data = json.load(open(os.path.join(READER_DIR, 'part-1', 'halacha-1.json')))
for i, seg in enumerate(data['segments'][:3]):
    he = seg.get('he','').strip()
    en = seg.get('en','').strip()
    bad = is_bad_pairing(he, en)
    print(f"\nSeg {i+1} [{'BAD' if bad else 'OK'}]:")
    print(f"  HE: {he[:100]}...")
    print(f"  EN: {(en[:120].replace(chr(10),' ')) if en else '(empty)'}...")