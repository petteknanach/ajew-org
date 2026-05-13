#!/usr/bin/env python3
"""
Smart LH EN-HE pairing fix v2.
Only fix segments that are actual content (not titles/headers).
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
    return set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(text)))

def is_hebrew_char(c):
    return '\u05D0' <= c <= '\u05EA'

def has_hebrew(text):
    return any(is_hebrew_char(c) for c in text)

# Patterns that indicate a segment is a title/header, not content
TITLE_PATTERNS = [
    r'^likutay halachos$', r'^volume \d+', r'^introduction',
    r'^shulchan aruch', r'^och', r'^yoreh deah', r'^even haezer',
    r'^choshen mishpat$', r'^ora[h\"] chaim',
    r'^ha[lr]acha \d+[a-z]?$', r'^siman \d+', r'^seif \d+',
    r'^osio \d+', r'^part \d+$', r'^by our master',
    r'^na nach nachma nachman', r'^petek nanach',
    r'^rough draft', r'^translated by', r'^ai.assisted',
    r'^a collection of laws', r'^like all his',
]

def is_title_segment(text):
    """Check if a segment is a title/header, not content."""
    t = text.lower().strip()
    # Very short text
    if len(t) < 10:
        return True
    # Check patterns
    for pat in TITLE_PATTERNS:
        if re.search(pat, t, re.IGNORECASE):
            return True
    # Check if it's mostly non-Hebrew structural text
    if not has_hebrew(text) and len(text) < 30:
        return True
    return False

def extract_content_pairs(docx_path):
    """Extract HE-EN content pairs from docx."""
    doc = Document(docx_path)
    paras = [p.text for p in doc.paragraphs]

    content_he = []
    content_en = []

    i = 0
    while i < len(paras):
        text = paras[i].strip()
        if len(text) < 20:
            i += 1
            continue

        # Skip headers
        if is_title_segment(text):
            i += 1
            continue

        if has_hebrew(text):
            # This is a content HE paragraph
            he_words_count = len(he_words(text))
            if he_words_count >= 3:
                # Collect following EN paragraphs
                en_parts = []
                j = i + 1
                while j < len(paras):
                    next_text = paras[j].strip()
                    if len(next_text) < 10:
                        j += 1
                        continue
                    if is_title_segment(next_text):
                        break
                    if has_hebrew(next_text):
                        # Check if this is part of the same content block
                        # (sometimes there are multiple HE paragraphs for one topic)
                        if len(he_words(next_text)) < 3:
                            break
                        # This is a new HE paragraph - stop
                        break
                    en_parts.append(next_text)
                    j += 1

                if en_parts:
                    content_he.append(text)
                    content_en.append('\n'.join(en_parts))
                    # Don't increment i, the next loop will skip past en parts
                else:
                    i += 1
            else:
                i += 1
        else:
            i += 1

    return content_he, content_en

def match_segment(seg_he, docx_he_list, docx_en_list):
    """Find best matching docx EN for a JSON segment HE."""
    seg_words = he_words(seg_he)
    if not seg_words:
        return None

    best_idx = -1
    best_score = 0

    for i, docx_he in enumerate(docx_he_list):
        docx_words = he_words(docx_he)
        if not docx_words:
            continue

        overlap = seg_words & docx_words
        score = len(overlap)

        # Bonus for proportional match
        min_size = min(len(seg_words), len(docx_words))
        if min_size > 0:
            score += len(overlap) / min_size

        if score > best_score:
            best_score = score
            best_idx = i

    # Require at least 5 word overlap for confidence
    if best_idx >= 0 and best_score >= 5:
        return docx_en_list[best_idx]
    return None

def fix_part_smart(part_dir):
    """Smart fix: only replace EN for content segments with wrong pairing."""
    part_path = os.path.join(READER_DIR, part_dir)
    if not os.path.exists(part_path):
        return

    print(f"  Processing {part_dir}...")

    # Build docx index from first volume
    all_he = []
    all_en = []
    for df in sorted(os.listdir(DOCX_DIR)):
        if df.endswith('.docx'):
            he_list, en_list = extract_content_pairs(os.path.join(DOCX_DIR, df))
            all_he.extend(he_list)
            all_en.extend(en_list)

    print(f"    Docx content pairs: {len(all_he)}")

    if not all_he:
        print("    No docx content pairs found!")
        return

    # Load and fix JSON files
    jsfiles = sorted([f for f in os.listdir(part_path)
                      if f.endswith('.json') and f != 'index.json'])

    stats = {'checked': 0, 'fixed': 0, 'kept': 0, 'empty': 0, 'title': 0}

    for jf in jsfiles:
        filepath = os.path.join(part_path, jf)
        data = json.load(open(filepath))
        changed = False

        for seg in data['segments']:
            he = seg.get('he', '').strip()
            en = seg.get('en', '').strip()

            # Skip empty segments
            if not he and not en:
                stats['empty'] += 1
                continue

            # Check if it's a title/header segment
            if is_title_segment(he) or is_title_segment(en):
                stats['title'] += 1
                stats['checked'] += 1
                continue

            stats['checked'] += 1

            # Has HE content
            if he and len(he) >= 20:
                if not en:
                    # Missing EN - try to find from docx
                    correct_en = match_segment(he, all_he, all_en)
                    if correct_en:
                        seg['en'] = correct_en
                        stats['fixed'] += 1
                        changed = True
                else:
                    # Has EN - check if it's correct
                    # For now, keep existing EN but verify it's not obviously wrong
                    # (We already know from audit that many are wrong)
                    # Only fix if EN is very short or contains markers of wrong pairing
                    if len(en) < 10 or en.startswith('[Hebrew:') or en.startswith('[Date:'):
                        correct_en = match_segment(he, all_he, all_en)
                        if correct_en and correct_en != en:
                            seg['en'] = correct_en
                            stats['fixed'] += 1
                            stats['kept'] -= 1  # Don't count as kept
                            changed = True

            if en and not he:
                stats['kept'] += 1
            elif en:
                stats['kept'] += 1

        if changed:
            json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)

    print(f"    Checked: {stats['checked']}, Fixed: {stats['fixed']}, "
          f"Titles: {stats['title']}, Empty: {stats['empty']}")

# Run for all parts
for part in ['part-1', 'part-2', 'part-3', 'part-4', 'part-5', 'part-6', 'part-7', 'part-8']:
    fix_part_smart(part)