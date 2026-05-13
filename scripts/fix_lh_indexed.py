#!/usr/bin/env python3
"""
Fast LH EN-HE fix using inverted index.
Build index once, then O(1) lookup per segment.
"""
from docx import Document
import json
import os
import re
from collections import defaultdict
import time

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def strip_nikkud(text):
    return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)

def norm(text):
    return re.sub(r'\s+', ' ', strip_nikkud(text.lower().strip())).strip()

def he_word_set(text):
    return set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(text)))

def is_hebrew_char(c):
    return '\u05D0' <= c <= '\u05EA'

def has_hebrew(text):
    return any(is_hebrew_char(c) for c in text)

# Skip patterns for titles/headers
SKIP_PREFIXES = ['Hilchos', 'Volume', 'Introduction', 'Sefer', 'OC', 'YD',
                 'EH', 'CM', 'Orach', 'Yoreh', 'Even', 'Choshen', 'Likutay',
                 'Na NaCh', 'Naanach', 'Petek', 'HH', 'by our', 'A Collection',
                 'The Laws', 'ha[lr]acha', 'siman', 'seif', 'osio', 'Torah']

def is_title(text):
    t = text.lower().strip()
    if len(t) < 8:
        return True
    for prefix in SKIP_PREFIXES:
        if t.startswith(prefix.lower()):
            return True
    return False

def extract_pairs(docx_path):
    """Extract (HE, EN) content pairs from docx."""
    doc = Document(docx_path)
    paras = [p.text for p in doc.paragraphs]

    he_list = []
    en_list = []
    i = 0
    while i < len(paras):
        text = paras[i].strip()
        if len(text) < 15 or is_title(text):
            i += 1
            continue

        if has_hebrew(text) and len(he_word_set(text)) >= 3:
            # Hebrew content paragraph
            he = text
            en_parts = []
            i += 1
            while i < len(paras):
                ntext = paras[i].strip()
                if len(ntext) < 5:
                    i += 1
                    continue
                if has_hebrew(ntext) and len(he_word_set(ntext)) >= 3:
                    break  # Next HE paragraph
                if is_title(ntext):
                    break
                en_parts.append(ntext)
                i += 1

            if en_parts:
                he_list.append(he)
                en_list.append('\n'.join(en_parts))
        else:
            i += 1

    return he_list, en_list

def build_inverted_index(he_list, en_list):
    """Build inverted index: Hebrew word -> list of (pair_idx, he_text, en_text)."""
    index = defaultdict(list)
    for idx, (he, en) in enumerate(zip(he_list, en_list)):
        for word in he_word_set(he):
            index[word].append(idx)
    return index

def fix_part_indexed(part_dir, index, he_list, en_list):
    """Fix one part using pre-built index."""
    part_path = os.path.join(READER_DIR, part_dir)
    if not os.path.exists(part_path):
        return 0, 0, 0

    jsfiles = sorted([f for f in os.listdir(part_path)
                      if f.endswith('.json') and f != 'index.json'])

    fixed = 0
    checked = 0
    total_en = 0
    total_segs = 0

    for jf in jsfiles:
        filepath = os.path.join(part_path, jf)
        data = json.load(open(filepath))
        changed = False

        for seg in data['segments']:
            he = seg.get('he', '').strip()
            old_en = seg.get('en', '').strip()

            if not he or not old_en:
                if not he:
                    total_segs += 1
                continue

            if is_title(he) or is_title(old_en):
                total_segs += 1
                if old_en:
                    total_en += 1
                continue

            total_segs += 1
            checked += 1

            he_w = he_word_set(he)
            if not he_w:
                if old_en:
                    total_en += 1
                continue

            # Find best match via index
            candidates = defaultdict(int)  # idx -> score
            for word in he_w:
                if word in index:
                    for idx in index[word]:
                        candidates[idx] += 1

            best_idx = -1
            best_score = 0
            for idx, score in candidates.items():
                if score > best_score:
                    best_score = score
                    best_idx = idx

            if best_idx >= 0 and best_score >= 5:
                correct_en = en_list[best_idx]
                # Verify overlap
                docx_w = he_word_set(he_list[best_idx])
                overlap = he_w & docx_w
                if len(overlap) >= 3:
                    if correct_en != old_en:
                        seg['en'] = correct_en
                        fixed += 1
                        changed = True

            if seg.get('en', '').strip():
                total_en += 1

        if changed:
            json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)

    return fixed, total_en, total_segs

# Main execution
print("Building docx index...")
start = time.time()

all_he = []
all_en = []
for df in sorted(os.listdir(DOCX_DIR)):
    if df.endswith('.docx'):
        he, en = extract_pairs(os.path.join(DOCX_DIR, df))
        all_he.extend(he)
        all_en.extend(en)

print(f"  Pairs: {len(all_he)}")
index = build_inverted_index(all_he, all_en)
print(f"  Index entries: {len(index)}")
print(f"  Time: {time.time()-start:.1f}s")

print("\nFixing parts...")
for part in ['part-1', 'part-2', 'part-3', 'part-4', 'part-5', 'part-6', 'part-7', 'part-8']:
    fixed, en_count, total = fix_part_indexed(part, index, all_he, all_en)
    pct = en_count/total*100 if total else 0
    print(f"  {part}: {fixed} fixed, {en_count}/{total} ({pct:.1f}%)")