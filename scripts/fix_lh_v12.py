#!/usr/bin/env python3
"""
Fix LH pairing v12 - Only use EN paragraphs from docx.

The original import script used ALL docx paragraphs (HE+EN) as EN text.
This caused misalignment. We need to use ONLY English paragraphs.
"""
from docx import Document
import json, os, re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def is_en_text(text):
    if not text: return False
    ascii_count = sum(1 for c in text if c.isascii() and (c.isalpha() or c.isspace()))
    total_alpha = sum(1 for c in text if c.isalpha())
    if total_alpha == 0: return False
    return ascii_count / total_alpha > 0.7

def is_meta(text):
    t = text.lower().strip()
    if len(t.split()) <= 1: return True
    words = t.split()
    if len(words) <= 2 and len(t) < 30: return True
    prefixes = ['hilchos ','na nach','siman ','seif ','osio ','volume ',
                'introduction','likutay','a collection','the laws ','oc ',
                'yd ','eh ','cm ','like all','naanach','segment',
                'one stop','arranged by','nitan','rabbi nachman',
                'each paragraph','table of contents','right-click',
                'copyright','rough draft','no copyright','free for','books of']
    if any(t.startswith(p) or p in t for p in prefixes):
        return True
    return False

# Step 1: Build list of ENGLISH content paragraphs from all docx
print("Building EN-only index from docx...")
en_paragraphs = []

for df in sorted(os.listdir(DOCX_DIR)):
    if not df.endswith('.docx'): continue
    doc = Document(os.path.join(DOCX_DIR, df))
    count = 0
    for p in doc.paragraphs:
        t = p.text.strip()
        if len(t) < 15: continue
        if is_meta(t): continue
        if is_en_text(t):
            en_paragraphs.append(t)
            count += 1
    if count:
        print(f"  {df}: {count} EN paragraphs")

print(f"\nTotal EN paragraphs: {len(en_paragraphs)}")

# Step 2: Get all JSON content segments
print("\nCollecting JSON content segments...")
all_content_segs = []

for part_dir in sorted(os.listdir(READER_DIR)):
    if not part_dir.startswith('part-'): continue
    part_path = os.path.join(READER_DIR, part_dir)

    for jf in sorted(os.listdir(part_path)):
        if not jf.endswith('.json') or jf == 'index.json': continue
        data = json.load(open(os.path.join(part_path, jf)))

        for i, seg in enumerate(data['segments']):
            he = seg.get('he','').strip()
            if he and len(he) > 20 and not is_meta(he):
                all_content_segs.append({
                    'part': part_dir, 'jf': jf, 'idx': i, 'seg': seg
                })

print(f"Total content segments: {len(all_content_segs)}")

# Step 3: Assign EN paragraphs to content segments by position
print(f"\nAssigning EN texts (using {len(en_paragraphs)} EN paragraphs for {len(all_content_segs)} segments)...")

fixed = 0
for i, item in enumerate(all_content_segs):
    if i >= len(en_paragraphs):
        print(f"  Ran out of EN at segment {i}")
        break

    seg = item['seg']
    old_en = seg.get('en','').strip()
    new_en = en_paragraphs[i]

    if new_en != old_en:
        seg['en'] = new_en
        fixed += 1

    # Write back to file
    filepath = os.path.join(READER_DIR, item['part'], item['jf'])
    data = json.load(open(filepath))
    json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)

print(f"Fixed: {fixed} segments")

# Verify
print("\n=== Verification ===")
total_en = sum(1 for item in all_content_segs if item['seg'].get('en','').strip())
total_he = sum(1 for item in all_content_segs if item['seg'].get('he','').strip())
print(f"Content segments with EN: {total_en}/{len(all_content_segs)} ({total_en/len(all_content_segs)*100:.1f}%)")

# Check a sample
data = json.load(open(os.path.join(READER_DIR, 'part-1', 'halacha-1.json')))
print("\nhalacha-1.json sample:")
for i, seg in enumerate(data['segments'][:3]):
    he = seg.get('he','').strip()[:100]
    en = seg.get('en','').strip()[:120]
    print(f"  Seg {i+1} HE: {he}...")
    print(f"        EN: {en}...")