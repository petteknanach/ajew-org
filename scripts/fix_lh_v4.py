#!/usr/bin/env python3
"""
Fix LH EN-HE pairing by matching docx paragraphs to JSON segments.

The docx structure is:
[HE paragraph 1]
[EN paragraph 1 - translation of HE paragraph 1]
[HE paragraph 2]
[EN paragraph 2 - translation of HE paragraph 2]
...

The JSON segments contain large chunks of HE text with multiple paragraphs.
The EN in JSON should match the correct docx EN paragraph.

Strategy:
1. Build a list of (docx_HE, docx_EN) pairs from docx
2. For each JSON segment, find which docx_HE paragraphs it contains
3. Build the correct EN from matching docx_EN paragraphs
"""
from docx import Document
import json
import os
import re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c):
    return '\u05D0' <= c <= '\u05EA'

def is_hebrew_text(text):
    return any(is_hebrew_char(c) for c in text)

def strip_nikkud(text):
    return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)

def norm(text):
    t = strip_nikkud(text.lower().strip())
    return re.sub(r'\s+', ' ', t).strip()

def extract_he_en_pairs(docx_path):
    """Extract ordered (HE, EN) pairs from LH docx."""
    doc = Document(docx_path)
    pairs = []
    paras = [p.text.strip() for p in doc.paragraphs]

    i = 0
    while i < len(paras):
        text = paras[i]
        if len(text) < 10 or not is_hebrew_text(text):
            i += 1
            continue

        # Found Hebrew paragraph
        he = text
        en_parts = []
        i += 1
        # Collect following English paragraphs
        while i < len(paras) and not is_hebrew_text(paras[i]):
            if len(paras[i]) > 5:
                en_parts.append(paras[i])
            i += 1

        if en_parts:
            pairs.append((he, ' '.join(en_parts)))
        # Don't increment i here - the while loop already handles it

    return pairs

def segment_he_overlap(seg_he, docx_he):
    """Check if seg_he contains or overlaps with docx_he."""
    seg_norm = norm(seg_he)
    docx_norm = norm(docx_he)

    # Check containment
    if docx_norm in seg_norm and len(docx_norm) > 30:
        return True
    if seg_norm in docx_norm and len(seg_norm) > 30:
        return True

    # Check word overlap
    seg_words = set(re.findall(r'[\u05D0-\u05EA]{3,}', seg_norm))
    docx_words = set(re.findall(r'[\u05D0-\u05EA]{3,}', docx_norm))
    if not seg_words or not docx_words:
        return False

    overlap = seg_words & docx_words
    return len(overlap) / min(len(seg_words), len(docx_words)) > 0.3

def fix_part_with_docx(part_dir):
    """Fix EN-HE pairing for one part using docx files."""
    part_path = os.path.join(READER_DIR, part_dir)
    if not os.path.exists(part_path):
        return

    # Map part to docx volumes
    vol_map = {
        'part-1': list(range(1, 6)),
        'part-2': list(range(6, 11)),
        'part-3': list(range(11, 15)),
        'part-4': list(range(17, 21)),
        'part-5': list(range(21, 27)),
        'part-6': list(range(27, 29)),
        'part-7': list(range(29, 31)),
        'part-8': list(range(31, 35)),
    }

    part_num = int(part_dir.split('-')[1])
    vol_nums = vol_map.get(part_dir, [])

    # Collect docx pairs
    all_pairs = []
    for vn in vol_nums:
        suffix = {1: 'OC', 6: 'OC', 11: 'OC', 15: 'OC', 17: 'YD'}.get(vn,
                'YD' if 17 <= vn <= 26 else
                'EH' if 27 <= vn <= 28 else
                'CM')
        if vn <= 16:
            suffix = 'OC'
        elif vn <= 26:
            suffix = 'YD'
        elif vn <= 28:
            suffix = 'EH'
        else:
            suffix = 'CM'

        vol_str = f"OC{vn}" if suffix == 'OC' else f"YD{vn-16}" if suffix == 'YD' else \
                  f"EH{vn-26}" if suffix == 'EH' else f"CM{vn-28}"
        df = f"Volume_{vn:02d}_{suffix}{vol_str.split(suffix)[-1]}_English.docx"
        # Simpler: just list all docx files

    # Actually, let's just use all available docx
    docx_files = [f for f in os.listdir(DOCX_DIR) if f.endswith('.docx')]
    for df in docx_files:
        pairs = extract_he_en_pairs(os.path.join(DOCX_DIR, df))
        all_pairs.extend(pairs)

    print(f"  Total docx pairs: {len(all_pairs)}")

    # Load JSON
    jsfiles = sorted([f for f in os.listdir(part_path)
                      if f.endswith('.json') and f != 'index.json'])
    all_segs = []
    for jf in jsfiles:
        data = json.load(open(os.path.join(part_path, jf)))
        for seg in data['segments']:
            all_segs.append((jf, seg))

    # For each segment, find matching docx EN
    fixed = 0
    for jf, seg in all_segs:
        he = seg.get('he', '').strip()
        en = seg.get('en', '').strip()
        if not he or not en or len(he) < 20:
            continue

        # Find matching docx pair
        for docx_he, docx_en in all_pairs:
            if segment_he_overlap(he, docx_he):
                if docx_en != en and len(docx_en) > len(en) * 0.5:
                    seg['en'] = docx_en
                    fixed += 1
                break

    # Write back
    if fixed > 0:
        seg_idx = 0
        for jf in jsfiles:
            data = json.load(open(os.path.join(part_path, jf)))
            for i in range(len(data['segments'])):
                data['segments'][i] = all_segs[seg_idx][1]
                seg_idx += 1
            json.dump(data, open(os.path.join(part_path, jf), 'w'),
                      indent=2, ensure_ascii=False)

    total_en = sum(1 for _, s in all_segs if s.get('en', '').strip())
    print(f"  Fixed: {fixed}, Total EN: {total_en}/{len(all_segs)} ({total_en/len(all_segs)*100:.1f}%)")

def main():
    import sys
    if len(sys.argv) > 1:
        fix_part_with_docx(sys.argv[1])
    else:
        for part_dir in ['part-1', 'part-2']:
            print(f"\nProcessing {part_dir}...")
            fix_part_with_docx(part_dir)

if __name__ == '__main__':
    main()