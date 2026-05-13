#!/usr/bin/env python3
"""
Smart LH EN-HE pairing fix.

The issue: JSON segments have EN text that is the translation of a DIFFERENT
Hebrew segment (shifted by one position).

Strategy:
1. For each segment, check if the EN text actually translates the HE text
2. If not, find the correct docx EN that does translate it
3. Match by extracting signature Hebrew phrases and searching for them in EN
"""
from docx import Document
import json
import os
import re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c):
    return '\u05D0' <= c <= '\u05EA'

def has_hebrew(text):
    return any(is_hebrew_char(c) for c in text)

def strip_nikkud(text):
    return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)

def norm(text):
    t = strip_nikkud(text.lower().strip())
    return re.sub(r'\s+', ' ', t).strip()

def get_he_words_set(text):
    """Get set of Hebrew words (3+ chars)."""
    return set(re.findall(r'[\u05D0-\u05EA]{3,}', norm(text)))

def extract_he_en_pairs(docx_path):
    """Extract ordered (HE, EN) pairs from LH docx."""
    doc = Document(docx_path)
    pairs = []
    paras = [p.text for p in doc.paragraphs]

    i = 0
    while i < len(paras):
        text = paras[i].strip()
        if len(text) < 15:
            i += 1
            continue

        if has_hebrew(text) and not text.startswith('Hilchos') and not text.startswith('Na '):
            he = text
            en_parts = []
            i += 1
            while i < len(paras):
                next_text = paras[i].strip()
                if len(next_text) < 5:
                    i += 1
                    continue
                if has_hebrew(next_text):
                    break
                if next_text.startswith('Hilchos') or next_text.startswith('Na '):
                    break
                en_parts.append(next_text)
                i += 1
            if en_parts and len(he) > 30:
                pairs.append((he, '\n'.join(en_parts)))
        else:
            i += 1

    return pairs

def build_he_to_en_map(docx_pairs):
    """Build map: normalized HE -> EN."""
    mapping = {}
    for he, en in docx_pairs:
        key = norm(he)
        mapping[key] = en
    return mapping

def find_best_en(he_text, docx_pairs):
    """Find the EN text that best translates this HE text."""
    he_words = get_he_words_set(he_text)
    if not he_words:
        return None

    # Try exact normalized match
    key = norm(he_text)
    for docx_he, docx_en in docx_pairs:
        if norm(docx_he) == key:
            return docx_en

    # Try containment match
    for docx_he, docx_en in docx_pairs:
        dk = norm(docx_he)
        if dk in key and len(dk) > 30:
            return docx_en
        if key in dk and len(key) > 30:
            return docx_en

    # Try keyword overlap
    best_en = None
    best_score = 0
    for docx_he, docx_en in docx_pairs:
        docx_words = get_he_words_set(docx_he)
        overlap = he_words & docx_words
        score = len(overlap)
        if score > best_score and score >= 3:
            best_score = score
            best_en = docx_en

    return best_en if best_score >= 5 else None

def is_good_pairing(he_text, en_text):
    """Check if EN plausibly translates HE by word overlap."""
    he_words = get_he_words_set(he_text)
    if not he_words:
        return True
    en_lower = en_text.lower()
    matches = sum(1 for w in he_words if w in en_lower)
    return matches / len(he_words) > 0.3

def fix_part(part_dir):
    """Fix EN-HE pairing for one LH part using docx source."""
    part_path = os.path.join(READER_DIR, part_dir)
    if not os.path.exists(part_path):
        return

    # Load all docx pairs
    all_pairs = []
    for df in sorted(os.listdir(DOCX_DIR)):
        if df.endswith('.docx'):
            pairs = extract_he_en_pairs(os.path.join(DOCX_DIR, df))
            all_pairs.extend(pairs)

    # Build lookup
    he_to_en = {}
    for he, en in all_pairs:
        key = norm(he)
        if key not in he_to_en:
            he_to_en[key] = en

    # Load JSON segments
    jsfiles = sorted([f for f in os.listdir(part_path)
                      if f.endswith('.json') and f != 'index.json'])
    all_data = []
    all_segs = []
    for jf in jsfiles:
        data = json.load(open(os.path.join(part_path, jf)))
        all_data.append((jf, data))
        for seg in data['segments']:
            all_segs.append(seg)

    # Fix mismatched pairings
    fixed = 0
    removed_bad = 0

    for seg in all_segs:
        he = seg.get('he', '').strip()
        en = seg.get('en', '').strip()
        if not he or len(he) < 20 or not en:
            continue

        # Check if current pairing is good
        if not is_good_pairing(he, en):
            # Find correct EN from docx
            correct_en = find_best_en(he, all_pairs)
            if correct_en and correct_en != en and len(correct_en) > 20:
                seg['en'] = correct_en
                fixed += 1
            else:
                # No good match found - clear bad EN
                seg['en'] = ''
                removed_bad += 1

    # Write back
    if fixed > 0 or removed_bad > 0:
        seg_idx = 0
        for jf, data in all_data:
            for i in range(len(data['segments'])):
                data['segments'][i] = all_segs[seg_idx]
                seg_idx += 1
            json.dump(data, open(os.path.join(part_path, jf), 'w'),
                      indent=2, ensure_ascii=False)

    total_en = sum(1 for s in all_segs if s.get('en', '').strip())
    total = len(all_segs)
    print(f"  Fixed: {fixed}, Removed bad: {removed_bad}")
    print(f"  EN: {total_en}/{total} ({total_en/total*100:.1f}%)")

# Run for part-1
fix_part('part-1')