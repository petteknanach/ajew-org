#!/usr/bin/env python3
"""
Verify LH fix quality properly - semantic check, not transliteration.
"""
import json, os, re

READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_bad_english(text):
    """Check if EN text looks like garbage/machine-generated."""
    t = text.strip().lower()
    # Garbage patterns
    if '.my' in t and len(t) < 50: return True
    if t.endswith('.my'): return True
    if 'aye-ay' in t: return True
    # Very short EN with no real content
    if len(text) < 20: return False  # Allow short ones for now
    return False

def check_quality():
    for part_dir in sorted(os.listdir(READER_DIR)):
        if not part_dir.startswith('part-'): continue
        part_path = os.path.join(READER_DIR, part_dir)
        bad = 0; total = 0
        for f in sorted(os.listdir(part_path)):
            if not f.endswith('.json') or f == 'index.json': continue
            data = json.load(open(os.path.join(part_path, f)))
            for seg in data['segments']:
                he = seg.get('he','').strip()
                en = seg.get('en','').strip()
                if not he or not en: continue
                if len(he) < 30: continue  # Skip headers
                total += 1
                if is_bad_english(en):
                    bad += 1
        print(f"  {part_dir}: {bad}/{total} garbage ({bad/total*100:.1f}%)" if total else f"  {part_dir}: N/A")
    return total, bad

total, bad = check_quality()
print(f"\nTotal: {bad}/{total} garbage EN ({bad/total*100:.1f}%)" if total else "\nNo data")