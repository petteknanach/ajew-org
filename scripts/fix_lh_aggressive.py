#!/usr/bin/env python3
"""
Fix LH EN-HE pairing - aggressive approach.
For each segment, find the best matching docx EN based on HE content.
Replace the current EN regardless of whether it looks correct.
"""
from docx import Document
import json
import os
import re
from collections import defaultdict

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def strip_nikkud(text):
    return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)

def norm(text):
    return re.sub(r'\s+', ' ', strip_nikkud(text.lower().strip())).strip()

def he_words(text):
    """Get Hebrew words (4+ chars) from text."""
    return set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(text)))

def is_hebrew_char(c):
    return '\u05D0' <= c <= '\u05EA'

def has_hebrew(text):
    return any(is_hebrew_char(c) for c in text)

def extract_content_pairs(docx_path):
    """Extract HE-EN content pairs from docx, skipping headers."""
    doc = Document(docx_path)
    paras = [p.text for p in doc.paragraphs]

    he_paras = []
    en_paras = []

    for text in paras:
        t = text.strip()
        if len(t) < 20:
            continue

        # Skip headers
        if any(t.startswith(p) for p in ['Hilchos', 'Na NaCh', 'Likutay Halachos',
                                           'Volume', 'Introduction', 'Sefer',
                                           'Torah', 'OC ', 'YD ', 'EH ', 'CM ',
                                           'Orach Chaim', 'Yoreh Deah',
                                           'Even HaEzer', 'Choshen Mishpat']):
            continue
        if t in ('HH', '...', ''):
            continue

        if has_hebrew(t):
            # Must have significant Hebrew content
            if len(he_words(t)) >= 3:
                he_paras.append(t)
        else:
            en_paras.append(t)

    # Pair HE with EN by position (both lists should be in same order)
    pairs = []
    min_len = min(len(he_paras), len(en_paras))
    for i in range(min_len):
        pairs.append((he_paras[i], en_paras[i]))

    return pairs

def fix_part_all(part_dir):
    """Fix ALL LH segments by re-matching to docx."""
    part_path = os.path.join(READER_DIR, part_dir)
    if not os.path.exists(part_path):
        return

    print(f"  Processing {part_dir}...")

    # Build docx index
    all_pairs = []
    for df in sorted(os.listdir(DOCX_DIR)):
        if df.endswith('.docx'):
            pairs = extract_content_pairs(os.path.join(DOCX_DIR, df))
            all_pairs.extend(pairs)

    print(f"    Docx pairs: {len(all_pairs)}")

    # Build index: for each docx pair, store HE word set
    # Use first N words as lookup key for speed
    word_to_pairs = defaultdict(list)
    for idx, (he, en) in enumerate(all_pairs):
        words = tuple(sorted(he_words(he))[:5])  # First 5 words as key
        word_to_pairs[words].append((idx, en))

    # Also build full word sets for matching
    all_he_sets = [he_words(he) for he, _ in all_pairs]

    # Load JSON files
    jsfiles = sorted([f for f in os.listdir(part_path)
                      if f.endswith('.json') and f != 'index.json'])

    total_changed = 0
    total_bad = 0
    total_files = 0

    for jf in jsfiles:
        filepath = os.path.join(part_path, jf)
        data = json.load(open(filepath))
        segments = data['segments']
        changed = False

        for seg in segments:
            he = seg.get('he', '').strip()
            old_en = seg.get('en', '').strip()

            if not he or len(he) < 20:
                continue

            he_w = he_words(he)
            if not he_w:
                continue

            # Find best matching docx pair
            best_idx = -1
            best_score = 0

            for i, docx_w in enumerate(all_he_sets):
                if not docx_w:
                    continue
                overlap = he_w & docx_w
                score = len(overlap)
                if score > best_score:
                    best_score = score
                    best_idx = i

            # Check if we have a good match
            if best_idx >= 0 and best_score >= 5:
                correct_en = all_pairs[best_idx][1]

                if correct_en != old_en:
                    seg['en'] = correct_en
                    total_changed += 1
                    if old_en:
                        total_bad += 1
                    changed = True

        if changed:
            json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)
            total_files += 1

    # Stats
    total_segs = 0
    total_en = 0
    for f in os.listdir(part_path):
        if not f.endswith('.json') or f == 'index.json':
            continue
        d = json.load(open(os.path.join(part_path, f)))
        segs = d.get('segments', [])
        total_segs += len(segs)
        total_en += sum(1 for s in segs if s.get('en', '').strip())

    print(f"    Changed: {total_changed} segments across {total_files} files")
    print(f"    Bad pairings replaced: {total_bad}")
    print(f"    EN coverage: {total_en}/{total_segs} ({total_en/total_segs*100:.1f}%)")

# Run for all LH parts
for part in ['part-1', 'part-2', 'part-3', 'part-4', 'part-5', 'part-6', 'part-7', 'part-8']:
    fix_part_all(part)