#!/usr/bin/env python3
"""Quick spot check of LH fix quality."""
import json, os, re

READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def strip_nikkud(t): return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', t)
def norm(t): return re.sub(r'\s+', ' ', strip_nikkud(t.lower().strip())).strip()
def he_words(t): return set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(t)))

def is_bad(he, en):
    hw = he_words(he)
    if not hw or len(hw) < 5: return False
    matches = sum(1 for w in hw if len(w) >= 4 and w.lower() in en.lower())
    return matches == 0

# Sample 3 files per part
files_to_check = {
    'part-1': ['halacha-1.json', 'halacha-30.json', 'halacha-60.json'],
    'part-3': ['halacha-100.json', 'halacha-150.json', 'halacha-200.json'],
    'part-5': ['halacha-1.json', 'halacha-80.json', 'halacha-120.json'],
    'part-8': ['halacha-1.json', 'halacha-140.json', 'halacha-300.json'],
}

total_bad = 0
total_checked = 0

for part, files in files_to_check.items():
    print(f"\n--- {part} ---")
    for f in files:
        path = os.path.join(READER_DIR, part, f)
        if not os.path.exists(path): continue
        data = json.load(open(path))
        for i, seg in enumerate(data['segments'][:3]):
            he = seg.get('he','').strip()
            en = seg.get('en','').strip()
            if he and en and len(he) > 30 and len(en) > 10:
                total_checked += 1
                bad = is_bad(he, en)
                if bad:
                    total_bad += 1
                if bad or i < 2:
                    print(f"  {f} seg {i+1} [{'BAD' if bad else 'OK'}]")
                    print(f"    HE: {he[:80].replace(chr(10),' ')}")
                    print(f"    EN: {(en[:100].replace(chr(10),' ') + '...') if len(en) > 100 else en}")

print(f"\nSUMMARY: {total_bad} bad / {total_checked} checked")
print(f"Bad rate in sample: {total_bad/total_checked*100:.1f}%")