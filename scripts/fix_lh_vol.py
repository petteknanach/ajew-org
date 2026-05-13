#!/usr/bin/env python3
"""
Fix LH pairing v10 - Volume-aware matching.

The docx files are organized by OC volume.
The JSON parts are also organized by volume.
We need to:
1. Map each JSON segment to its OC volume
2. Use volume-specific EN paragraphs
3. Match by position within each volume
"""
from docx import Document
import json, os, re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

# Map volume numbers to OC section
VOLUME_OC = {
    1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 10:10,
    11:11, 12:12, 13:13, 14:14, 15:15, 16:16,
    17:'YD1', 18:'YD2', 19:'YD3', 20:'YD4', 21:'YD5',
    22:'YD6', 23:'YD7', 24:'YD8', 25:'YD9', 26:'YD10',
    27:'EH1', 28:'EH2',
    29:'CM1', 30:'CM2', 31:'CM3', 32:'CM4', 33:'CM5', 34:'CM6',
    35:'CM7', 36:'CM8', 37:'CM9'
}

# Map JSON part to volume range
PART_VOLUMES = {
    'part-1': list(range(1, 11)),      # OC 1-10 (intro + first half)
    'part-2': list(range(11, 17)),      # OC 11-16
    'part-3': [17, 18, 19],             # YD 1-3
    'part-4': [20, 21, 22, 23],         # YD 4-7
    'part-5': [24, 25, 26, 27],         # YD 8-10 + EH1
    'part-6': [28],                     # EH2
    'part-7': [29, 30, 31, 32],         # CM 1-4
    'part-8': [33, 34, 35, 36, 37],     # CM 5-9
}

def is_meta(text):
    t = text.lower().strip()
    if len(t) < 5 or len(t.split()) <= 2: return True
    prefixes = ['hilchos','na nach','siman ','seif ','osio ','volume ',
                'introduction','likutay','a collection','the laws ','oc ',
                'yd ','eh ','cm ','like all','naanach','segment',
                'one stop','arranged by','torah ','rabbi nachman']
    return any(t.startswith(p) for p in prefixes)

def get_part_volume_en(part_dir):
    """Get all EN content paragraphs for a part's volumes."""
    vol_en = []
    vol_nums = PART_VOLUMES.get(part_dir, [])

    for vn in vol_nums:
        # Find the docx file for this volume
        for df in os.listdir(DOCX_DIR):
            if not df.endswith('.docx'): continue
            # Check if volume number matches
            vol_marker = f'Volume_{vn:02d}'
            if vol_marker not in df: continue

            doc = Document(os.path.join(DOCX_DIR, df))
            for p in doc.paragraphs:
                t = p.text.strip()
                if len(t) < 15: continue
                if is_meta(t): continue
                if not has_hebrew(t) and len(t) > 20:
                    vol_en.append(t)
            break  # Found the file for this volume

    return vol_en

def fix_part(part_dir):
    part_path = os.path.join(READER_DIR, part_dir)
    if not os.path.exists(part_path): return

    # Get EN paragraphs for this part's volumes
    vol_en = get_part_volume_en(part_dir)
    print(f"\n  {part_dir}: {len(vol_en)} EN paragraphs from volumes {PART_VOLUMES.get(part_dir, [])}")

    jsfiles = sorted([f for f in os.listdir(part_path)
                      if f.endswith('.json') and f != 'index.json'])

    # Collect all content segments in order
    all_segments = []
    file_map = {}  # (file, seg_idx) -> global_idx
    global_idx = 0

    for jf in jsfiles:
        data = json.load(open(os.path.join(part_path, jf)))
        for i, seg in enumerate(data['segments']):
            he = seg.get('he', '').strip()
            if he and not is_meta(he):
                all_segments.append({'file': jf, 'idx': i, 'seg': seg})
                file_map[(jf, i)] = global_idx
            global_idx += 1

    print(f"    Content segments: {len(all_segments)}")

    # Match: assign EN from vol_en to content segments by position
    fixed = 0
    for i, item in enumerate(all_segments):
        if i >= len(vol_en):
            break

        seg = item['seg']
        old_en = seg.get('en', '').strip()
        new_en = vol_en[i]

        if new_en != old_en and len(new_en) > 20:
            seg['en'] = new_en
            fixed += 1

    # Write back modified files
    for jf in jsfiles:
        filepath = os.path.join(part_path, jf)
        data = json.load(open(filepath))
        json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)

    print(f"    Fixed: {fixed} segments")

# Main
for part in ['part-1', 'part-2', 'part-3', 'part-4', 'part-5', 'part-6', 'part-7', 'part-8']:
    fix_part(part)