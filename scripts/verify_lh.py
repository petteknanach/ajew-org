#!/usr/bin/env python3
"""Verify LH pairing quality after fix."""
import json, os, re

READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def strip_nikkud(text):
    return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)

def norm(text):
    return re.sub(r'\s+', ' ', strip_nikkud(text.lower().strip())).strip()

def he_words(text):
    return set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(text)))

def is_bad_pairing(he, en):
    """Check if EN plausibly translates HE."""
    if not he or not en:
        return False
    hw = he_words(he)
    if not hw:
        return False
    en_lower = en.lower()
    matches = sum(1 for w in hw if len(w) >= 4 and w.lower() in en_lower)
    return matches == 0 and len(hw) > 5

# Check halacha-1.json and halacha-10.json
for fname in ['halacha-1.json', 'halacha-10.json', 'halacha-11.json']:
    fpath = os.path.join(READER_DIR, 'part-1', fname)
    if not os.path.exists(fpath):
        continue
    data = json.load(open(fpath))
    print(f"\n=== {fname} ===")
    for i, seg in enumerate(data['segments'][:5]):
        he = seg.get('he', '').strip()
        en = seg.get('en', '').strip()
        bad = is_bad_pairing(he, en)
        status = "BAD" if bad else "OK"
        hew = he_words(he)
        matches = sum(1 for w in hew if len(w) >= 4 and w.lower() in en.lower()) if en else 0
        print(f"  Seg {i+1} [{status}]: {len(hew)} HE words, {matches} matches")
        print(f"    HE: {he[:80]}...")
        print(f"    EN: {en[:100].replace(chr(10),' ')}..." if en else "    EN: (empty)")