#!/usr/bin/env python3
"""
Fix LH pairing v16 - Direct reconstruction from source docx.

KEY INSIGHT: Instead of trying to match individual paragraphs,
I'll rebuild the EN assignment by:
1. Reading all docx EN paragraphs in the correct order
2. Assigning them to JSON content segments in the correct order

The trick is to filter the docx correctly to get ONLY actual
translation paragraphs (not headers, not Hebrew content paragraphs).
"""
from docx import Document
import json, os, re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

# Patterns that indicate a paragraph is NOT a translation
NOT_TRANSLATION = [
    'hilchos ', 'na nach', 'siman ', 'seif ', 'osio ', 'like all',
    'naanach', 'segment', 'arranged by', 'copyright', 'rough draft',
    'free for all', 'books of rabbi nachman', 'character —',
    'stories of rabbi', 'outpouring of the soul', 'fires of israel',
    'who he was and', 'live up the good', 'pray with your',
    'praises of rabbi', 'complete english translation', 'ajew.org',
    'one stop for', 'note on paragraph', 'cross-reference',
    'bas sheva', 'yisroel dov', 'student of', 'na na',
    'table of contents', 'right-click', 'update field',
    'each paragraph in', 'one should muster', '"one should',
    # Section headers in EN
    'the laws of rising', 'hilchos nitteylas', 'hilchos tzitzis',
    'hilchos tefillin', 'hilchos bircas', 'hilchos sefiras',
    'hilchos chanukah', 'hilchos purim', 'hilchos rosh',
    'hilchos yom kippur', 'hilchos sukkah', 'hilchos pesach',
    'the laws of shabbos', 'hilchos eruv', 'hilchos niddah',
    'hilchos even', 'hilchos choshen', 'hilchos mishpatim',
]

def is_translation_para(text):
    """Return True if this is an actual English translation paragraph."""
    t = text.strip().lower()
    if len(t) < 30: return False

    # Must be mostly ASCII
    alpha = [c for c in t if c.isalpha()]
    if not alpha: return False
    ascii_ratio = sum(1 for c in alpha if c.isascii()) / len(alpha)
    if ascii_ratio < 0.7: return False

    # Check it's not a known non-translation pattern
    for pattern in NOT_TRANSLATION:
        if pattern in t:
            return False

    return True

def extract_all_en_translations():
    """Extract all English translation paragraphs from all docx files in order."""
    all_en = []

    for df in sorted(os.listdir(DOCX_DIR)):
        if not df.endswith('.docx'):
            continue

        doc = Document(os.path.join(DOCX_DIR, df))
        file_en = []

        for p in doc.paragraphs:
            t = p.text.strip()
            if is_translation_para(t):
                file_en.append(t)

        all_en.extend(file_en)
        if file_en:
            print(f"  {df}: {len(file_en)} translation paras (first: {file_en[0][:60]}...)")

    return all_en

# Step 1: Build the EN list
print("=== Extracting EN translations from docx ===")
all_en = extract_all_en_translations()
print(f"\nTotal EN translation paragraphs: {len(all_en)}")

# Step 2: Get JSON content segments
print("\n=== Getting JSON content segments ===")

all_segments = []  # (part_dir, jf, seg_idx, seg)

for part_dir in sorted(os.listdir(READER_DIR)):
    if not part_dir.startswith('part-'):
        continue

    part_path = os.path.join(READER_DIR, part_dir)
    jsfiles = sorted([f for f in os.listdir(part_path)
                      if f.endswith('.json') and f != 'index.json'])

    for jf in jsfiles:
        data = json.load(open(os.path.join(part_path, jf)))

        for i, seg in enumerate(data['segments']):
            he = seg.get('he', '').strip()
            en = seg.get('en', '').strip()

            # Only consider segments with substantial Hebrew
            if he and len(he) > 20:
                all_segments.append((part_dir, jf, i, seg))

print(f"Total JSON content segments: {len(all_segments)}")

# Step 3: Match EN to segments
print(f"\n=== Assigning EN to segments ===")
print(f"EN paragraphs available: {len(all_en)}")
print(f"Segments to match: {len(all_segments)}")

if len(all_en) == len(all_segments):
    print("EXACT MATCH - direct assignment possible!")
elif len(all_en) > len(all_segments):
    print(f"More EN than segments (extra {len(all_en) - len(all_segments)})")
else:
    print(f"More segments than EN (short {len(all_segments) - len(all_en)})")

# Assign EN by position - with verification
fixed = 0
mismatches = []

for idx, (part_dir, jf, seg_idx, seg) in enumerate(all_segments):
    if idx >= len(all_en):
        break

    old_en = seg.get('en', '').strip()
    new_en = all_en[idx]

    # Only fix if different and substantial
    if new_en != old_en and len(new_en) > 20:
        # Quick sanity: check if it looks like English
        alpha = [c for c in new_en if c.isalpha()]
        if alpha and sum(1 for c in alpha if c.isascii()) / len(alpha) > 0.7:
            seg['en'] = new_en
            fixed += 1

            # Track for debugging
            mismatches.append({
                'part': part_dir,
                'file': jf,
                'seg_idx': seg_idx,
                'he_preview': seg.get('he', '')[:50],
                'old_en': old_en[:50] if old_en else '(empty)',
                'new_en': new_en[:50]
            })

print(f"\nFixed: {fixed} segments")

# Write all changes
print("\nWriting changes...")
changes_by_file = {}
for part_dir, jf, seg_idx, seg in all_segments:
    filepath = os.path.join(READER_DIR, part_dir, jf)
    if filepath not in changes_by_file:
        changes_by_file[filepath] = json.load(open(filepath))

    # Find actual segment in file data
    for i, s in enumerate(changes_by_file[filepath]['segments']):
        if s is seg:
            changes_by_file[filepath]['segments'][i] = seg
            break

for filepath, data in changes_by_file.items():
    json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)

print("Done writing changes!")

# Show some mismatches for debugging
if mismatches:
    print(f"\n=== First 5 changes ===")
    for m in mismatches[:5]:
        print(f"\n{m['part']}/{m['file']} seg {m['seg_idx']}:")
        print(f"  HE: {m['he_preview']}")
        print(f"  OLD: {m['old_en']}")
        print(f"  NEW: {m['new_en']}")