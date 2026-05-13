#!/usr/bin/env python3
"""
Fix LH pairing v14 - Front matter stripping approach.

Strip front matter from docx, then assign EN paragraphs to JSON
content segments by position.
"""
from docx import Document
import json, os, re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

# What does actual content look like in docx?
# After front matter: HE content paragraphs followed by EN translation paragraphs
# Front matter includes: title pages, dedications, copyright, table of contents, etc.

def is_front_matter(text):
    """True if paragraph is front matter (not actual content translation)."""
    t = text.lower().strip()
    # Short text
    if len(t.split()) <= 2: return True
    # Known front matter patterns
    patterns = [
        'hilchos ', 'na nach', 'siman ', 'seif ', 'osio ',
        'volume ', 'introduction', 'likutay', 'a collection',
        'the laws ', 'oc ', 'yd ', 'eh ', 'cm ', 'like all',
        'naanach', 'segment', 'one stop', 'arranged by',
        'copyright', 'rough draft', 'no copyright',
        'free for all', 'books of rabbi',
        'character —', 'stories of rabbi',
        'outpouring of the soul', 'fires of israel',
        'who he was and', 'live up the good',
        'pray with your', 'praises of rabbi',
        'complete english translation',
        'ajew.org', 'one stop for',
        'note on paragraph', 'cross-reference',
        'bas sheva', 'yisroel dov',
        'student of rabbi', 'na naach',
        'table of contents', 'right-click',
        'update field', 'each paragraph in this',
        'in memory of', 'torah ', 'rabbi '
    ]
    return any(p in t for p in patterns)

def extract_content_paras(doc_path):
    """Extract EN content paragraphs (actual translations), skipping front matter."""
    doc = Document(doc_path)
    paras = doc.paragraphs

    # Find where content starts (first non-front-matter paragraph with significant text)
    content_start = 0
    for i, p in enumerate(paras):
        t = p.text.strip()
        if len(t) > 10 and not is_front_matter(t):
            content_start = i
            break

    print(f"    Content starts at P{content_start}")

    # From content start, extract EN paragraphs (non-Hebrew, non-front-matter)
    en_paras = []
    for i in range(content_start, len(paras)):
        t = paras[i].text.strip()
        if len(t) < 10: continue
        if has_hebrew(t): continue  # Skip Hebrew paragraphs
        if is_front_matter(t): continue  # Skip front matter
        en_paras.append(t)

    return en_paras

# Step 1: Build EN paragraph list from all docx files
print("=== Building EN content list ===\n")
all_en = []
vol_en = {}

for df in sorted(os.listdir(DOCX_DIR)):
    if not df.endswith('.docx'): continue
    path = os.path.join(DOCX_DIR, df)
    en_paras = extract_content_paras(path)

    # Extract volume number
    vol_match = re.search(r'Volume_(\d+)', df)
    vol_num = int(vol_match.group(1)) if vol_match else 0
    vol_en[vol_num] = en_paras
    all_en.extend(en_paras)

    print(f"  Vol {vol_num:2d}: {len(en_paras)} EN paragraphs")

print(f"\nTotal EN paragraphs: {len(all_en)}")

# Step 2: Get JSON content segments by part
print("\n=== Getting JSON segments ===\n")

# Map parts to volume numbers (approximate)
PART_VOLS = {
    'part-1': list(range(1, 17)),
    'part-2': list(range(17, 29)),
    'part-3': list(range(29, 38)),
}

for part_dir in sorted(os.listdir(READER_DIR)):
    if not part_dir.startswith('part-'): continue

    part_path = os.path.join(READER_DIR, part_dir)
    jsfiles = sorted([f for f in os.listdir(part_path)
                      if f.endswith('.json') and f != 'index.json'])

    # Get content segment EN texts
    content_segs = []
    for jf in jsfiles:
        data = json.load(open(os.path.join(part_path, jf)))
        for seg in data['segments']:
            he = seg.get('he', '').strip()
            if he and len(he) > 20 and not is_front_matter(he):
                content_segs.append({'jf': jf, 'seg': seg})

    # Get EN paragraphs for this part (first matching vol)
    part_en = []
    for vol_num in PART_VOLS.get(part_dir, list(range(1, 38))):
        if vol_num in vol_en:
            part_en.extend(vol_en[vol_num])

    print(f"{part_dir}: {len(content_segs)} JSON segments, {len(part_en)} docx EN paragraphs")

    # Assign EN by position
    fixed = 0
    for i, item in enumerate(content_segs):
        if i >= len(part_en):
            break

        seg = item['seg']
        old_en = seg.get('en', '').strip()
        new_en = part_en[i]

        if new_en != old_en and len(new_en) > 20:
            seg['en'] = new_en
            fixed += 1

            # Write back to file
            filepath = os.path.join(part_path, item['jf'])
            data = json.load(open(filepath))
            json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)

    print(f"  Fixed: {fixed} segments")

print("\n=== Verification ===")
# Check a sample
data = json.load(open(os.path.join(READER_DIR, 'part-1', 'halacha-1.json')))
print("halacha-1.json:")
for i, seg in enumerate(data['segments'][:3]):
    he = seg.get('he', '')[:100]
    en = seg.get('en', '')[:100]
    print(f"  Seg {i+1} HE: {he}")
    print(f"           EN: {en}")