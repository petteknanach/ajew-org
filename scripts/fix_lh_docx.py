#!/usr/bin/env python3
"""
Fix LH EN-HE pairing by re-parsing the source docx files.

The LH docx has a clear structure:
- English title/header paragraphs (marked as English)
- Hebrew paragraph = the Shulchan Aruch text being discussed
- English paragraph(s) = the translation of that Hebrew text

We need to match each Hebrew paragraph to its following English paragraph(s).
"""
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

def text_keywords(text, min_len=3):
    """Extract significant words from normalised text."""
    t = strip_nikkud(text.lower())
    words = re.findall(r'[\u05D0-\u05EA]{3,}', t)
    return set(words)

def extract_docx_pairs(docx_path):
    """Extract (he_text, en_text) pairs from LH docx.

    Strategy: In LH docx, after the headers and intro:
    - Hebrew paragraph = Shulchan Aruch segment
    - Following English paragraph(s) = translation
    """
    doc = Document(docx_path)
    pairs = []

    paras = [(i, p.text.strip(), is_hebrew(p.text)) for i, p in enumerate(doc.paragraphs)]

    i = 0
    while i < len(paras):
        idx, text, is_he = paras[i]

        # Skip short or non-content paragraphs
        if len(text) < 15:
            i += 1
            continue

        if is_he:
            # This is a Hebrew paragraph - collect it and any following English
            he_text = text
            en_parts = []

            j = i + 1
            while j < len(paras):
                nidx, ntext, nis_he = paras[j]
                if len(ntext) < 5:
                    j += 1
                    continue
                if not nis_he:
                    en_parts.append(ntext)
                    j += 1
                else:
                    break

            if en_parts:
                # Multiple English paragraphs for one Hebrew = join them
                en_text = ' '.join(en_parts)
                pairs.append((he_text, en_text))
                i = j
            else:
                # Hebrew with no English following - skip
                i += 1
        else:
            i += 1

    return pairs

def contains_text(long_text, short_text):
    """Check if short_text content is substantially present in long_text."""
    long_norm = strip_nikkud(long_text.lower().replace(' ', ''))
    short_norm = strip_nikkud(short_text.lower().replace(' ', ''))

    # Exact containment
    if short_norm in long_norm and len(short_norm) > 30:
        return True

    # Word overlap - check if majority of short words appear in long
    short_words = set(re.findall(r'[\u05D0-\u05EA]{3,}', short_norm))
    if not short_words:
        return False

    long_words = set(re.findall(r'[\u05D0-\u05EA]{3,}', long_norm))
    if not long_words:
        return False

    overlap = short_words & long_words
    return len(overlap) / len(short_words) > 0.5

def find_he_in_json(he_text, json_segments, start_idx=0):
    """Find which JSON segment contains or matches this Hebrew text."""
    for i in range(start_idx, len(json_segments)):
        seg_he = json_segments[i].get('he', '').strip()
        if not seg_he or len(seg_he) < 20:
            continue

        if contains_text(he_text, seg_he):
            return i
        if contains_text(seg_he, he_text):
            return i

    # Fallback: find closest match by keyword overlap
    he_keywords = text_keywords(he_text)
    if not he_keywords:
        return -1

    best_idx = -1
    best_score = 0
    for i in range(start_idx, len(json_segments)):
        seg_he = json_segments[i].get('he', '').strip()
        if not seg_he or len(seg_he) < 20:
            continue

        seg_keywords = text_keywords(seg_he)
        overlap = he_keywords & seg_keywords
        if len(overlap) > best_score:
            best_score = len(overlap)
            best_idx = i

    return best_idx if best_score >= 3 else -1

def fix_lh_part(part_dir, docx_files):
    """Fix all halachot in one LH part directory."""
    part_path = os.path.join(READER_DIR, part_dir)

    # Load all JSON files
    json_files = sorted([f for f in os.listdir(part_path) if f.endswith('.json') and f != 'index.json'])
    all_segments = []
    file_map = {}  # segment index -> (file, seg_index)

    for jf in json_files:
        filepath = os.path.join(part_path, jf)
        data = json.load(open(filepath))
        for si, seg in enumerate(data.get('segments', [])):
            all_segments.append(seg)
            file_map[len(all_segments) - 1] = (jf, si)

    print(f"  {part_dir}: {len(all_segments)} segments across {len(json_files)} files")

    # For each docx volume, extract pairs and fix segments
    fixed = 0
    last_json_idx = 0

    for docx_path in docx_files:
        pairs = extract_docx_pairs(docx_path)
        print(f"    Docx: {len(pairs)} HE-EN pairs")

        for he_text, en_text in pairs:
            # Find matching JSON segment starting from last position
            match_idx = find_he_in_json(he_text, all_segments, start_idx=last_json_idx)

            if match_idx < 0:
                # Try from beginning
                match_idx = find_he_in_json(he_text, all_segments, start_idx=0)

            if match_idx >= 0:
                seg = all_segments[match_idx]
                if not seg.get('en', '').strip() and seg.get('he', '').strip():
                    seg['en'] = en_text
                    fixed += 1

                # Update search start position for next match
                last_json_idx = match_idx + 1

    # Write back to files
    if fixed > 0:
        # Reconstruct JSON files from updated segments
        seg_idx = 0
        for jf in json_files:
            filepath = os.path.join(part_path, jf)
            data = json.load(open(filepath))
            for si in range(len(data['segments'])):
                data['segments'][si] = all_segments[seg_idx]
                seg_idx += 1
            json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)

    total_en = sum(1 for s in all_segments if s.get('en', '').strip())
    print(f"    Fixed: {fixed}, Total EN: {total_en}/{len(all_segments)} ({total_en/len(all_segments)*100:.1f}%)")

def main():
    # Map part directories to docx files
    # OC = Orach Chaim, YD = Yoreh Deah, EH = Even HaEzer, CM = Choshen Mishpat
    part_docx_map = {
        'part-1': ['Volume_01_OC1_English.docx', 'Volume_02_OC2_English.docx',
                    'Volume_03_OC3_English.docx', 'Volume_04_OC4_English.docx',
                    'Volume_05_OC5_English.docx'],
        'part-2': ['Volume_06_OC6_English.docx', 'Volume_07_OC7_English.docx',
                    'Volume_08_OC8_English.docx', 'Volume_09_OC9_English.docx',
                    'Volume_10_OC10_English.docx'],
        'part-3': ['Volume_11_OC11_English.docx', 'Volume_12_OC12_English.docx',
                    'Volume_13_OC13_English.docx', 'Volume_14_OC14_English.docx'],
        'part-4': ['Volume_17_YD1_English.docx', 'Volume_18_YD2_English.docx',
                    'Volume_19_YD3_English.docx', 'Volume_20_YD4_English.docx'],
        'part-5': ['Volume_21_YD5_English.docx', 'Volume_22_YD6_English.docx',
                    'Volume_23_YD7_English.docx', 'Volume_24_YD8_English.docx',
                    'Volume_25_YD9_English.docx', 'Volume_26_YD10_English.docx'],
        'part-6': ['Volume_27_EH1_English.docx', 'Volume_28_EH2_English.docx'],
        'part-7': ['Volume_29_CM1_English.docx', 'Volume_30_CM2_English.docx'],
        'part-8': ['Volume_31_CM3_English.docx', 'Volume_32_CM4_English.docx'],
    }

    for part_dir, docx_files in part_docx_map.items():
        docx_paths = [os.path.join(DOCX_DIR, f) for f in docx_files]
        # Check all exist
        existing = [p for p in docx_paths if os.path.exists(p)]
        if existing:
            print(f"Processing {part_dir}...")
            fix_lh_part(part_dir, existing)

if __name__ == '__main__':
    main()