#!/usr/bin/env python3
"""
Fix LH EN-HE pairing by searching docx EN for transliterated Hebrew words.

Strategy:
1. For each JSON segment, extract unique Hebrew words
2. Search docx EN paragraphs for those words (transliterated in English)
3. Assign the best matching EN paragraph to the JSON segment
"""
from docx import Document
import json
import os
import re
from collections import defaultdict

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def strip_nikkud(t): return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', t)
def norm(t): return re.sub(r'\s+', ' ', strip_nikkud(t.lower())).strip()
def he_words(t): return set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(t)))

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

# Header patterns to skip
SKIP = {'hilchos','na nach','naanach','siman','seif','osio','sof',
        'torah ','likutay','volume ','a collection','the laws ','introduction'}

def is_header(t):
    tl = t.lower()[:30]
    return any(tl.startswith(s) for s in SKIP) or len(t.strip()) < 8

def extract_docx_paragraphs():
    """Extract all HE content and all EN content paragraphs from all docx files."""
    all_he = []  # List of (he_text, he_words_set)
    all_en = []  # List of en_text

    for df in sorted(os.listdir(DOCX_DIR)):
        if not df.endswith('.docx'): continue
        doc = Document(os.path.join(DOCX_DIR, df))

        for p in doc.paragraphs:
            t = p.text.strip()
            if len(t) < 15 or is_header(t):
                continue

            if has_hebrew(t):
                words = he_words(t)
                if len(words) >= 2:
                    all_he.append((t, words))
            else:
                if len(t) > 10:
                    all_en.append(t)

    return all_he, all_en

def build_en_index(all_en):
    """Build word-level index from EN text."""
    # Split EN into words, index by lowercase
    index = defaultdict(list)  # word -> list of (en_idx, score)
    for idx, en in enumerate(all_en):
        en_lower = en.lower()
        en_words = set(re.findall(r'[a-z]{3,}', en_lower))
        for w in en_words:
            if len(w) > 3 and w not in {'this','that','the','and','for','with','from','are','was','has','had','not','but','his','her','their','all','one','who','what','when','where','which','than','will','would','shall','should','could','may','might','being','been','have','our'}:
                index[w].append(idx)
    return index, en_words if all_en else set()

def find_matching_en(he_text, all_he, all_en, en_word_index):
    """
    Find which EN paragraphs match this HE text.

    Approach: The HE text in JSON contains multiple Hebrew paragraphs.
    We need to find the corresponding EN paragraphs.

    Method: For each en paragraph, check if it contains transliterated
    words from the HE text.
    """
    he_w = he_words(he_text)
    if not he_w:
        return None

    # Count how many EN paragraphs reference each Hebrew word
    en_scores = defaultdict(int)  # en_idx -> score

    for he_word in he_w:
        # Search EN index for this word
        if he_word in en_word_index:
            for en_idx in en_word_index[he_word]:
                en_scores[en_idx] += 2

    if not en_scores:
        # Try matching by similar words (fuzzy)
        for en_idx, en_text in enumerate(all_en):
            en_lower = en_text.lower()
            matches = sum(1 for w in he_w if len(w) >= 4 and w.lower() in en_lower)
            if matches >= 2:
                en_scores[en_idx] += matches

    if not en_scores:
        return None

    # Get the paragraph with the highest score
    best_idx = max(en_scores, key=en_scores.get)
    best_score = en_scores[best_idx]

    # Need at least some matches
    if best_score < 3:
        return None

    return all_en[best_idx]

def fix_part(part_dir, all_he, all_en, en_index):
    part_path = os.path.join(READER_DIR, part_dir)
    if not os.path.exists(part_path):
        return 0, 0

    jsfiles = sorted([f for f in os.listdir(part_path)
                      if f.endswith('.json') and f != 'index.json'])

    fixed = 0
    total = 0
    bad_before = 0

    for jf in jsfiles:
        filepath = os.path.join(part_path, jf)
        data = json.load(open(filepath))
        changed = False

        for seg in data['segments']:
            he = seg.get('he','').strip()
            en = seg.get('en','').strip()

            total += 1

            if not he or is_header(he):
                continue

            if not en:
                # Missing EN - try to find it
                correct_en = find_matching_en(he, all_he, all_en, en_index)
                if correct_en:
                    seg['en'] = correct_en
                    fixed += 1
                    changed = True
                continue

            # Check if current pairing is bad
            he_w = he_words(he)
            if he_w:
                en_lower = en.lower()
                matches = sum(1 for w in he_w if len(w) >= 4 and w.lower() in en_lower)

                if matches == 0 and len(he_w) >= 5:
                    # Bad pairing
                    bad_before += 1
                    correct_en = find_matching_en(he, all_he, all_en, en_index)
                    if correct_en and correct_en != en and len(correct_en) > 20:
                        seg['en'] = correct_en
                        fixed += 1
                        changed = True

        if changed:
            json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)

    return fixed, bad_before

# Main
print("=== LH Pairing Fix ===\n")

all_he, all_en = extract_docx_paragraphs()
print(f"Docx paragraphs: {len(all_he)} HE, {len(all_en)} EN\n")

# Build EN word index for searching
en_index = defaultdict(list)
for idx, en in enumerate(all_en):
    en_lower = en.lower()
    for word in re.findall(r'[a-z]{4,}', en_lower):
        en_index[word].append(idx)

for part in ['part-1','part-2','part-3','part-4','part-5','part-6','part-7','part-8']:
    f, b = fix_part(part, all_he, all_en, en_index)
    print(f"  {part}: {f} fixed, {b} bad pairings replaced")

print("\nDone!")