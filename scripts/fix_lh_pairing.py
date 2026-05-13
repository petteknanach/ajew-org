#!/usr/bin/env python3
"""
Fix Likutay Halachos EN-HE pairing using the docx source.

The docx has interleaved paragraphs: [HE paragraph] followed by [EN paragraph].
Each HE paragraph is a segment from Shulchan Aruch that LH discusses.
Each EN paragraph is the translation.

The JSON has the same structure but the pairing was done positionally.
We need to match by finding the HE text in the JSON and assigning the correct EN.
"""
from docx import Document
import json
import os
import re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'

def strip_nikkud(text):
    """Remove vowel points from Hebrew."""
    return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)

def normalize(text):
    """Normalize text for comparison."""
    return strip_nikkud(text.lower().strip().replace(' ', ''))

def extract_he_en_pairs_from_docx(docx_path):
    """Extract Hebrew-English pairs from LH docx.

    In the LH docx, structure is:
    - Title/header paragraphs
    - [Hebrew paragraph] = a segment of Shulchan Aruch
    - [English paragraph(s)] = translation of that segment
    - [Hebrew paragraph] = next segment
    - etc.
    """
    doc = Document(docx_path)
    paragraphs = [(i, p.text.strip(), any(ord(c) > 127 for c in p.text)) for i, p in enumerate(doc.paragraphs)]

    pairs = []
    i = 0
    while i < len(paragraphs):
        idx, text, is_he = paragraphs[i]

        # Skip title/header paragraphs
        if len(text) < 5:
            i += 1
            continue

        # If this is a Hebrew paragraph, the next English paragraph(s) are its translation
        if is_he and len(text) > 10:
            he_text = text
            en_parts = []
            j = i + 1
            while j < len(paragraphs):
                nidx, ntext, nis_he = paragraphs[j]
                if not nis_he and len(ntext) > 3:
                    en_parts.append(ntext)
                    j += 1
                else:
                    break
            en_text = ' '.join(en_parts) if en_parts else ''
            if en_text:
                pairs.append((he_text, en_text))
            i = j
        else:
            i += 1

    return pairs

def find_best_he_match(he_text, json_segments, start_idx=0):
    """Find the JSON segment that best matches a Hebrew text."""
    he_normalized = normalize(he_text)

    # Try exact match first
    for i in range(start_idx, len(json_segments)):
        seg_he = json_segments[i].get('he', '').strip()
        if not seg_he:
            continue
        seg_normalized = normalize(seg_he)

        # Check if one contains the other
        if seg_normalized in he_normalized and len(seg_normalized) > 20:
            return i
        if he_normalized in seg_normalized and len(he_normalized) > 20:
            return i

        # Check if significant portion matches
        if len(seg_normalized) > 20 and len(he_normalized) > 20:
            shorter = min(seg_normalized, he_normalized, key=len)
            longer = max(seg_normalized, he_normalized, key=len)
            if shorter in longer:
                return i

    return -1

def fix_lh_book():
    """Fix all LH halachot."""
    reader_dir = '/root/ajew-org/public/reader/likutay-halachos'

    for part_dir in sorted(os.listdir(reader_dir)):
        part_path = os.path.join(reader_dir, part_dir)
        if not os.path.isdir(part_path):
            continue

        # Determine which docx volume
        vol_map = {
            'part-1': 'Volume_01', 'part-2': 'Volume_02',
            'part-3': 'Volume_03', 'part-4': 'Volume_04',
            'part-5': 'Volume_05', 'part-6': 'Volume_06',
            'part-7': 'Volume_07', 'part-8': 'Volume_08',
        }
        if part_dir not in vol_map:
            continue

        vol_name = vol_map[part_dir]
        docx_path = os.path.join(DOCX_DIR, f'{vol_name}_OC{vol_name.split("_")[1]}_English.docx')

        if not os.path.exists(docx_path):
            print(f"No docx found for {part_dir}: {docx_path}")
            continue

        print(f"Processing {part_dir} from {vol_name}...")

        # Extract pairs from docx
        pairs = extract_he_en_pairs_from_docx(docx_path)
        print(f"  Found {len(pairs)} HE-EN pairs in docx")

        # Process each JSON file
        for f in sorted(os.listdir(part_path)):
            if not f.endswith('.json') or f == 'index.json':
                continue

            filepath = os.path.join(part_path, f)
            data = json.load(open(filepath))
            segments = data.get('segments', [])

            # Count fixes
            fixed = 0
            pair_idx = 0

            for seg in segments:
                he = seg.get('he', '').strip()
                en = seg.get('en', '').strip()

                # Skip if already has EN or no HE
                if en or not he or len(he) < 10:
                    continue

                # Find matching pair
                best_pair_idx = find_best_he_match(he, pairs, start_idx=pair_idx)
                if best_pair_idx >= 0:
                    seg['en'] = pairs[best_pair_idx][1]
                    fixed += 1
                    pair_idx = best_pair_idx + 1

            if fixed > 0:
                json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)
                print(f"  Fixed {f}: {fixed} segments")

        # Summary
        total = 0; has_en = 0
        for f in os.listdir(part_path):
            if not f.endswith('.json') or f == 'index.json':
                continue
            data = json.load(open(os.path.join(part_path, f)))
            for seg in data.get('segments', []):
                total += 1
                if seg.get('en', '').strip():
                    has_en += 1

        print(f"  {part_dir}: {has_en}/{total} = {has_en/total*100:.1f}%")

if __name__ == '__main__':
    fix_lh_book()