#!/usr/bin/env python3
"""
Check Yichud HaYirah reader data - why is Hebrew missing on first pages?
Also audit current LH EN quality to distinguish intentional transliterations
from actual wrong pairings.
"""
import json, os, re

READER_DIR = '/root/ajew-org/public/reader'

def has_hebrew(t):
    if not t: return False
    return any('\u05D0' <= c <= '\u05EA' for c in t)

def is_transliteration(en):
    """Is this EN field a transliteration rather than real English?"""
    t = en.lower().strip()
    if not t: return False
    # Transliteration patterns
    hyphens = len(re.findall(r'[a-z]{1,4}-[a-z]{1,4}', t))
    words = t.split()
    if not words: return False
    heb_suffix = len(re.findall(r'\b\w*(ee|oo|em|ich|nu|uh|aw)\b', t, re.I))
    # If heavy on hyphens and suffixes, likely transliteration
    if hyphens > len(words) * 0.3 or heb_suffix > len(words) * 0.4:
        return True
    return False

# Check Yichud HaYirah
print("=== Yichud HaYirah Segment Check ===")
yh_dir = os.path.join(READER_DIR, 'ramchal-yichud-hayeeruh')
if os.path.exists(yh_dir):
    for f in sorted(os.listdir(yh_dir)):
        if not f.endswith('.json') or f == 'index.json': continue
        data = json.load(open(os.path.join(yh_dir, f)))
        for i, seg in enumerate(data['segments'][:10]):
            he = seg.get('he', '').strip()
            en = seg.get('en', '').strip()
            has_h = bool(he)
            has_e = bool(en)
            is_tl = is_transliteration(en) if en else False
            print(f"  Seg {i+1}: HE({'yes' if has_h else 'NO'}) EN({'yes' if has_e else 'NO'})({'TL' if is_tl else ''})")
            if not has_h:
                print(f"    ** MISSING HEBREW **")
            if he: print(f"    he={he[:60]}")
            if en: print(f"    en={en[:60]}")
else:
    print("  Directory not found!")

# Check overall LH transliteration vs real English stats
print("\n=== LH Transliteration vs Real English Stats ===")
lh_dir = os.path.join(READER_DIR, 'likutay-halachos')
tl_count = 0; real_en = 0; empty_en = 0; total = 0

for part_dir in sorted(os.listdir(lh_dir)):
    if not part_dir.startswith('part-'): continue
    part_path = os.path.join(lh_dir, part_dir)
    for f in sorted(os.listdir(part_path)):
        if not f.endswith('.json') or f == 'index.json': continue
        data = json.load(open(os.path.join(part_path, f)))
        for seg in data['segments']:
            he = seg.get('he', '').strip()
            en = seg.get('en', '').strip()
            if not he or len(he) < 30: continue  # skip headers
            total += 1
            if not en:
                empty_en += 1
            elif is_transliteration(en):
                tl_count += 1
            else:
                real_en += 1

print(f"  Total content segments: {total}")
print(f"  Real English: {real_en} ({real_en/total*100:.1f}%)")
print(f"  Transliteration: {tl_count} ({tl_count/total*100:.1f}%)")
print(f"  Empty: {empty_en} ({empty_en/total*100:.1f}%)")
if tl_count > 0:
    print(f"\n  NOTE: {tl_count} segments have transliterated Hebrew as EN.")
    print("  These may be INTENTIONAL (Tikkun Haklali, key verses, etc.)")
    print("  Should NOT be replaced with English unless we have proper translations.")