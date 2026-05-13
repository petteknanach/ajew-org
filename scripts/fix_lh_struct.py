#!/usr/bin/env python3
"""
Fix LH pairing by section-level matching.

The key insight: Each halacha/topic in the docx has:
1. Multiple HE paragraphs (content)
2. Multiple EN paragraphs (translation)
The EN paragraphs are in the same order as their HE content.

But some early paragraphs are headers/metadata, causing offset issues.

Strategy: Match the FIRST distinctive Hebrew content word to find the right offset.
"""
from docx import Document
import json
import os
import re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def strip_nikkud(t): return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', t)
def norm(t): return re.sub(r'\s+', ' ', strip_nikkud(t.lower())).strip()
def he_words(t): return set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(t)))

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

def extract_ordered_content(docx_path):
    """Extract ordered content paragraphs from docx, identifying which are HE content vs EN."""
    doc = Document(docx_path)
    paras = [(i, p.text.strip()) for i, p in enumerate(doc.paragraphs)]

    # Separate into HE and EN blocks
    he_paras = []  # (index_in_docx, text)
    en_paras = []  # (index_in_docx, text)

    for idx, text in paras:
        if len(text) < 15:
            continue

        # Skip known headers
        skip = ['Hilchos', 'Volume', 'Introduction', 'Sefer', 'OC ', 'YD ', 'EH ', 'CM ',
                'Orach', 'Yoreh', 'Even', 'Choshen', 'Likutay', 'Na NaCh', 'Naanach',
                'Petek', 'HH', 'by our', 'A Collection', 'The Laws', 'siman', 'seif',
                'osio', 'Torah', 'Sof', 'bez', 'Segment']
        if any(text.lower().startswith(p.lower()) for p in skip) or \
           any(p.lower() in text.lower()[:40] for p in ['Torah ', 'Siman ', 'Seif ']):
            continue

        if has_hebrew(text):
            words = he_words(text)
            if len(words) >= 3:
                he_paras.append((idx, text))
        else:
            en_paras.append((idx, text))

    return he_paras, en_paras

def build_offset_map(all_he_paras, all_en_paras):
    """
    For each JSON segment, we need to know the correct EN.
    The JSON segments were built from docx content paragraphs in order.

    Key issue: the docx has [HE1, HE2, ..., EN1, EN2, ...] structure,
    but the JSON has [HE1+EN1, HE2+EN2, ...] interleaved.

    The JSON HE text should match the docx HE text. We need to find which docx
    EN corresponds to each JSON segment.
    """
    # The docx HE paragraphs are in same order as JSON segments
    # Build map: docx_he_index -> docx_en_text
    # We need to figure out which EN goes with which HE

    # Simple approach: HE and EN are in same order, just offset
    # Find the offset by matching first few HE paragraphs

    if len(all_he_paras) < 2 or len(all_en_paras) < 2:
        return {}

    # Build word sets for fast matching
    he_word_sets = [(i, he_words(text)) for i, (_, text) in enumerate(all_he_paras)]

    # For each EN paragraph, find which HE it most likely corresponds to
    # by word overlap

    mapping = {}  # he_index -> en_text

    for en_idx, (_, en_text) in enumerate(all_en_paras):
        en_words_lower = set(en_text.lower().split())

        best_he_idx = -1
        best_score = 0

        for he_idx, hws in he_word_sets:
            if not hws:
                continue

            # Check transliterated words
            matches = sum(1 for w in hws if len(w) >= 4 and w.lower() in en_words_lower)

            if matches > best_score:
                best_score = matches
                best_he_idx = he_idx

        if best_score >= 2:
            mapping[best_he_idx] = (en_idx, en_text)

    return mapping

def fix_part(part_dir, all_he_paras, all_en_paras):
    """Fix one part using structural matching."""
    part_path = os.path.join(READER_DIR, part_dir)
    if not os.path.exists(part_path):
        return 0

    jsfiles = sorted([f for f in os.listdir(part_path)
                      if f.endswith('.json') and f != 'index.json'])

    fixed = 0

    for jf in jsfiles:
        filepath = os.path.join(part_path, jf)
        data = json.load(open(filepath))
        changed = False

        for seg in data['segments']:
            he = seg.get('he', '').strip()
            en = seg.get('en', '').strip()

            if not he or len(he) < 30 or not en:
                continue

            # Find this segment in docx by content matching
            seg_words = he_words(he)
            if not seg_words:
                continue

            best_match = -1
            best_score = 0

            for i, (_, docx_he) in enumerate(all_he_paras):
                docx_words = he_words(docx_he)
                overlap = seg_words & docx_words
                score = len(overlap)
                if score > best_score:
                    best_score = score
                    best_match = i

            if best_match >= 0 and best_score >= 5:
                # Find best EN for this docx HE by position
                # Look nearby in en list
                _, correct_en = all_en_paras[min(best_match, len(all_en_paras)-1)]

                if correct_en != en and len(correct_en) > len(en) * 0.5:
                    seg['en'] = correct_en
                    fixed += 1
                    changed = True

        if changed:
            json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)

    return fixed

# Main
print("Collecting docx content...")
all_he = []
all_en = []

for df in sorted(os.listdir(DOCX_DIR)):
    if df.endswith('.docx'):
        he, en = extract_ordered_content(os.path.join(DOCX_DIR, df))
        print(f"  {df}: {len(he)} HE, {len(en)} EN")
        all_he.extend(he)
        all_en.extend(en)

print(f"\nTotal: {len(all_he)} HE paragraphs, {len(all_en)} EN paragraphs")

fixed_total = 0
for part in ['part-1', 'part-2', 'part-3', 'part-4', 'part-5', 'part-6', 'part-7', 'part-8']:
    f = fix_part(part, all_he, all_en)
    fixed_total += f
    print(f"  {part}: {f} fixed")

print(f"\nTotal fixed: {fixed_total}")