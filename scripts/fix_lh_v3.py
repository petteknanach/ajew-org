#!/usr/bin/env python3
"""Fix LH EN-HE pairing using docx."""
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

def get_he_words(text):
    return set(re.findall(r'[\u05D0-\u05EA]{3,}', norm(text)))

def extract_he_en_from_docx(docx_path):
    """Extract Hebrew and English paragraphs from LH docx."""
    doc = Document(docx_path)
    he_list = []
    en_list = []
    paras = [(i, p.text.strip()) for i, p in enumerate(doc.paragraphs)]

    # First, identify Hebrew paragraphs (contain actual Hebrew chars)
    for idx, text in paras:
        if len(text) < 10:
            continue
        if is_hebrew_text(text):
            he_list.append(text)
        else:
            en_list.append(text)

    return he_list, en_list

def find_best_match(target_he, docx_he_list):
    target_words = get_he_words(target_he)
    if not target_words:
        return -1, 0

    best_idx = -1
    best_score = 0

    for i, docx_he in enumerate(docx_he_list):
        docx_words = get_he_words(docx_he)
        if not docx_words:
            continue
        overlap = target_words & docx_words
        score = len(overlap) + len(overlap) / len(target_words) * 2
        if score > best_score:
            best_score = score
            best_idx = i

    return best_idx, best_score

def fix_part(part_dir, docx_files):
    part_path = os.path.join(READER_DIR, part_dir)
    if not os.path.exists(part_path):
        return

    # Collect all docx paragraphs
    all_he = []
    all_en = []
    for df in docx_files:
        dp = os.path.join(DOCX_DIR, df)
        if os.path.exists(dp):
            h, e = extract_he_en_from_docx(dp)
            all_he.extend(h)
            all_en.extend(e)

    print(f"  Docx: {len(all_he)} HE, {len(all_en)} EN paragraphs")

    if len(all_he) != len(all_en):
        print(f"  WARNING: HE/EN count mismatch! HE={len(all_he)}, EN={len(all_en)}")

    # Load all JSON
    jsfiles = sorted([f for f in os.listdir(part_path) if f.endswith('.json') and f != 'index.json'])
    all_segs = []
    for jf in jsfiles:
        data = json.load(open(os.path.join(part_path, jf)))
        all_segs.append((jf, data))

    # Fix: match JSON HE to docx HE, assign docx EN
    fixed = 0
    for jf, data in all_segs:
        changed = False
        for seg in data['segments']:
            he = seg.get('he', '').strip()
            en = seg.get('en', '').strip()
            if not he or len(he) < 20:
                continue
            if not en:  # Only fix missing EN
                continue

            # Find matching docx HE
            idx, score = find_best_match(he, all_he)
            if idx >= 0 and score >= 2:
                correct_en = all_en[idx]
                if correct_en != en:
                    # Verify: check if correct EN has words matching HE
                    he_words = get_he_words(he)
                    correct_words = get_he_words(correct_en)
                    if he_words & correct_words:
                        seg['en'] = correct_en
                        fixed += 1
                        changed = True

        if changed:
            json.dump(data, open(os.path.join(part_path, jf), 'w'),
                      indent=2, ensure_ascii=False)

    total = sum(len(d['segments']) for _, d in all_segs)
    total_en = sum(1 for _, d in all_segs for s in d['segments'] if s.get('en', '').strip())
    print(f"  Fixed {fixed} pairings. EN coverage: {total_en}/{total} ({total_en/total*100:.1f}%)")

# Process just part-1 first
fix_part('part-1', [f'Volume_{i:02d}_OC{i}_English.docx' for i in range(1, 6)])