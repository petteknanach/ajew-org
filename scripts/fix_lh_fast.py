#!/usr/bin/env python3
"""Fix LH EN-HE pairing - optimized for speed."""
from docx import Document
import json
import os
import re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew(text):
    return any(ord(c) > 127 for c in text)

def strip_nikkud(text):
    return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)

def normalize(text):
    return strip_nikkud(text.lower().replace(' ', '')).replace('\n', '')

def extract_pairs_fast(docx_path):
    """Extract HE-EN pairs from docx using a fast approach."""
    doc = Document(docx_path)
    pairs = []
    paras = doc.paragraphs

    i = 0
    while i < len(paras):
        text = paras[i].text.strip()
        if len(text) < 15:
            i += 1
            continue

        if is_hebrew(text):
            he_text = text
            en_parts = []
            j = i + 1
            while j < len(paras):
                ntext = paras[j].text.strip()
                if len(ntext) < 5:
                    j += 1
                    continue
                if not is_hebrew(ntext):
                    en_parts.append(ntext)
                    j += 1
                else:
                    break
            if en_parts:
                pairs.append((he_text, ' '.join(en_parts)))
            i = j if en_parts else i + 1
        else:
            i += 1

    return pairs

def fix_one_part(part_dir, docx_files):
    """Fix one LH part directory."""
    part_path = os.path.join(READER_DIR, part_dir)
    if not os.path.exists(part_path):
        print(f"  {part_dir}: dir not found")
        return

    # Extract all pairs from all docx files
    all_pairs = []
    for docx_file in docx_files:
        docx_path = os.path.join(DOCX_DIR, docx_file)
        if not os.path.exists(docx_path):
            continue
        pairs = extract_pairs_fast(docx_path)
        print(f"    {docx_file}: {len(pairs)} pairs")
        all_pairs.extend(pairs)

    print(f"    Total pairs: {len(all_pairs)}")

    # Build a lookup: normalized HE -> EN
    he_to_en = {}
    for he, en in all_pairs:
        key = normalize(he)
        if key not in he_to_en:
            he_to_en[key] = en

    # Also build word-level index for partial matches
    def get_he_words(text):
        norm = normalize(text)
        return set(re.findall(r'[\u05D0-\u05EA]{3,}', norm))

    # Process JSON files
    fixed = 0
    for f in sorted(os.listdir(part_path)):
        if not f.endswith('.json') or f == 'index.json':
            continue

        filepath = os.path.join(part_path, f)
        data = json.load(open(filepath))
        changed = False

        for seg in data.get('segments', []):
            he = seg.get('he', '').strip()
            if not he or seg.get('en', '').strip():
                continue

            # Try exact match first
            key = normalize(he)
            if key in he_to_en:
                seg['en'] = he_to_en[key]
                fixed += 1
                changed = True
                continue

            # Try partial match using keywords
            he_words = get_he_words(he)
            if not he_words:
                continue

            best_en = None
            best_score = 0
            for pkey, pen in he_to_en.items():
                pwords = get_he_words(pkey)
                overlap = he_words & pwords
                score = len(overlap)
                if score > best_score and score >= 3:
                    best_score = score
                    best_en = pen

            if best_en:
                seg['en'] = best_en
                fixed += 1
                changed = True

        if changed:
            json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)

    # Calculate stats
    total = 0; has_en = 0
    for f in os.listdir(part_path):
        if not f.endswith('.json') or f == 'index.json':
            continue
        data = json.load(open(os.path.join(part_path, f)))
        for seg in data.get('segments', []):
            total += 1
            if seg.get('en', '').strip():
                has_en += 1

    print(f"    {part_dir}: fixed {fixed}, now {has_en}/{total} = {has_en/total*100:.1f}%")

def main():
    import sys
    if len(sys.argv) > 1:
        part_dir = sys.argv[1]
        docx_files = sys.argv[2:]
        print(f"Processing {part_dir} with {len(docx_files)} docx files...")
        fix_one_part(part_dir, docx_files)
    else:
        # Process all parts
        part_docx_map = {
            'part-1': ['Volume_01_OC1_English.docx', 'Volume_02_OC2_English.docx',
                        'Volume_03_OC3_English.docx', 'Volume_04_OC4_English.docx',
                        'Volume_05_OC5_English.docx'],
            'part-2': ['Volume_06_OC6_English.docx', 'Volume_07_OC7_English.docx',
                        'Volume_08_OC8_English.docx', 'Volume_09_OC9_English.docx',
                        'Volume_10_OC10_English.docx'],
        }
        for part_dir, docx_files in part_docx_map.items():
            print(f"\nProcessing {part_dir}...")
            fix_one_part(part_dir, docx_files)

if __name__ == '__main__':
    main()