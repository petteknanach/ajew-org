#!/usr/bin/env python3
"""
Fix LH EN-HE pairing using docx source.
Key insight: The JSON has EN in every segment, but it's WRONG.
We need to re-match EN text to the correct HE segments.

Strategy:
1. Extract all HE paragraphs from docx (these match the JSON HE text)
2. Extract all EN paragraphs from docx (these are the correct translations)
3. Match JSON HE segments to docx HE paragraphs
4. Assign the correct EN from docx to the JSON segment
"""
from docx import Document
import json
import os
import re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def strip_nikkud(text):
    return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)

def norm(text):
    """Normalize text - remove nikkud, collapse spaces, lowercase."""
    t = strip_nikkud(text.lower().strip())
    return re.sub(r'\s+', ' ', t).strip()

def get_he_words(text):
    """Get Hebrew words from text."""
    return set(re.findall(r'[\u05D0-\u05EA]{3,}', norm(text)))

def extract_he_en_from_docx(docx_path):
    """Extract Hebrew and English paragraphs from docx separately."""
    doc = Document(docx_path)
    he_list = []
    en_list = []

    for p in doc.paragraphs:
        text = p.text.strip()
        if len(text) < 10:
            continue
        if any(ord(c) > 127 for c in text):
            he_list.append(text)
        else:
            en_list.append(text)

    return he_list, en_list

def find_best_he_match(target_he, docx_he_list, search_start=0):
    """Find which docx HE paragraph matches this target HE text."""
    target_words = get_he_words(target_he)
    if not target_words:
        return -1

    best_idx = -1
    best_score = 0

    for i in range(search_start, len(docx_he_list)):
        docx_words = get_he_words(docx_he_list[i])
        if not docx_words:
            continue

        # Check overlap
        overlap = target_words & docx_words
        score = len(overlap)

        # Bonus for longer overlap relative to target
        if target_words:
            ratio = len(overlap) / len(target_words)
            score += ratio * 2

        if score > best_score:
            best_score = score
            best_idx = i

    return best_idx if best_score >= 3 else -1

def fix_one_part_with_docx(part_dir, docx_files):
    """Fix one LH part using docx files."""
    part_path = os.path.join(READER_DIR, part_dir)
    if not os.path.exists(part_path):
        print(f"  {part_dir}: not found")
        return

    # Collect all docx HE and EN paragraphs
    all_he = []
    all_en = []

    for docx_file in docx_files:
        docx_path = os.path.join(DOCX_DIR, docx_file)
        if not os.path.exists(docx_path):
            continue
        he_list, en_list = extract_he_en_from_docx(docx_path)
        all_he.extend(he_list)
        all_en.extend(en_list)

    print(f"    Docx: {len(all_he)} HE paragraphs, {len(all_en)} EN paragraphs")

    if not all_he or not all_en:
        return

    # Load all JSON segments
    all_segments = []
    json_files = sorted([f for f in os.listdir(part_path)
                         if f.endswith('.json') and f != 'index.json'])

    for jf in json_files:
        data = json.load(open(os.path.join(part_path, jf)))
        all_segments.append((jf, data))

    # Match: for each JSON segment with HE, find matching docx HE and get its EN
    fixed = 0
    total_checked = 0
    mismatched = 0

    for jf, data in all_segments:
        changed = False
        for seg in data.get('segments', []):
            he = seg.get('he', '').strip()
            en = seg.get('en', '').strip()

            if not he or len(he) < 20:
                continue

            total_checked += 1

            # Find matching docx HE paragraph
            match_idx = find_best_he_match(he, all_he)

            if match_idx >= 0 and match_idx < len(all_en):
                correct_en = all_en[match_idx]

                # Check if current EN is different from correct one
                if en != correct_en:
                    # Verify it's actually better (has keyword overlap)
                    he_words = get_he_words(he)
                    new_words = get_he_words(correct_en)
                    overlap = he_words & new_words

                    if len(overlap) >= 1:
                        seg['en'] = correct_en
                        fixed += 1
                        changed = True

                        # Check if old EN was wrong
                        if en:
                            old_words = get_he_words(en)
                            old_overlap = he_words & old_words
                            if old_overlap == 0:
                                mismatched += 1

        if changed:
            json.dump(data, open(os.path.join(part_path, jf), 'w'),
                      indent=2, ensure_ascii=False)

    # Calculate final stats
    total_en = sum(1 for _, d in all_segments
                   for s in d.get('segments', []) if s.get('en', '').strip())

    print(f"    Checked: {total_checked}, Fixed: {fixed}, "
          f"Mismatched: {mismatched}")
    print(f"    Final: {total_en}/{sum(len(d.get('segments',[])) for _,d in all_segments)} "
          f"= {total_en/sum(len(d.get('segments',[])) for _,d in all_segments)*100:.1f}%")

def main():
    import sys
    if len(sys.argv) > 2:
        part_dir = sys.argv[1]
        docx_files = sys.argv[2:]
        print(f"Processing {part_dir}...")
        fix_one_part_with_docx(part_dir, docx_files)
    else:
        # Process all parts with their docx files
        all_docx = [f for f in os.listdir(DOCX_DIR) if f.endswith('.docx')]
        print("Processing all parts...")

        for part_num in range(1, 9):
            part_dir = f'part-{part_num}'
            part_path = os.path.join(READER_DIR, part_dir)
            if not os.path.exists(part_path):
                continue

            print(f"\n--- {part_dir} ---")
            fix_one_part_with_docx(part_dir, all_docx)

if __name__ == '__main__':
    main()