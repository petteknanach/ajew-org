#!/usr/bin/env python3
"""
Fix LH EN-HE pairing by matching JSON HE -> Docx HE -> Docx EN.

Steps:
1. Extract all content (HE+EN) paragraphs from docx, skipping headers/titles
2. For each JSON segment, find its matching docx HE paragraph
3. Assign the corresponding docx EN paragraph to the JSON segment
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

def get_he_word_set(text):
    return set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(text)))

def extract_docx_content_pairs(docx_path):
    """
    Extract content paragraphs from docx, skipping headers/metadata.
    Returns list of (he_text, en_text) pairs.
    
    Strategy: Skip everything until we find the first substantial HE paragraph
    that looks like actual content (not a title).
    """
    doc = Document(docx_path)
    paras = [p.text for p in doc.paragraphs]
    
    pairs = []
    he_paras = []
    en_paras = []
    
    # First pass: collect all HE and EN content paragraphs separately
    for text in paras:
        text = text.strip()
        if len(text) < 15:
            continue
        
        # Skip known header/metadata patterns
        if text.startswith('Hilchos') or text.startswith('Na NaCh') or \
           text.startswith('Naanach') or text.startswith('Likutay Halachos') or \
           text.startswith('Volume') or text.startswith('Introduction') or \
           text == 'HH' or text.startswith('Sefer') or text == '...' or \
           'Torah' in text[:20]:
            continue
        
        if has_hebrew(text):
            # Skip if it looks like a header (short, no actual content)
            he_words = get_he_word_set(text)
            if len(he_words) < 3:
                continue
            he_paras.append(text)
        else:
            en_paras.append(text)
    
    # Match HE paragraphs with subsequent EN paragraphs
    # The structure is: HE1, HE2, ..., EN1, EN2, ...
    # But we need to match them properly
    
    # Build pairs by matching HE to the EN that follows it
    i = 0
    j = 0
    while i < len(he_paras) and j < len(en_paras):
        he = he_paras[i]
        he_words = get_he_word_set(he)
        
        # Collect consecutive EN paragraphs until we find one with significant
        # Hebrew word overlap with the HE
        en_parts = []
        while j < len(en_paras):
            en = en_paras[j]
            en_words_lower = set(en.lower().split())
            
            # Check if EN has transliterated HE words
            he_in_en = sum(1 for w in he_words if w.lower() in en_words_lower)
            
            if he_in_en > 0 or len(en_parts) == 0:
                en_parts.append(en)
                j += 1
            else:
                break
            
            # Stop if we've collected enough EN text
            if len(' '.join(en_parts)) > len(he) * 0.8:
                break
        
        if en_parts:
            pairs.append((he, '\n'.join(en_parts)))
        
        i += 1
    
    return pairs

def match_json_to_docx(json_segs, docx_pairs):
    """
    For each JSON segment with HE text, find the matching docx pair
    and return the correct EN text.
    """
    # Build index: for each docx pair, compute HE word fingerprint
    docx_index = []
    for he, en in docx_pairs:
        words = get_he_word_set(he)
        docx_index.append((words, en))
    
    results = []
    for seg in json_segs:
        he = seg.get('he', '').strip()
        en = seg.get('en', '').strip()
        
        if not he or len(he) < 20:
            results.append(en)
            continue
        
        he_words = get_he_word_set(he)
        if not he_words:
            results.append(en)
            continue
        
        # Find best matching docx pair
        best_idx = -1
        best_score = 0
        for i, (docx_words, _) in enumerate(docx_index):
            overlap = he_words & docx_words
            if len(overlap) > best_score:
                best_score = len(overlap)
                best_idx = i
        
        if best_idx >= 0 and best_score >= 5:
            correct_en = docx_index[best_idx][1]
            results.append(correct_en)
        else:
            results.append(en)
    
    return results

def fix_part(part_dir):
    part_path = os.path.join(READER_DIR, part_dir)
    if not os.path.exists(part_path):
        return
    
    print(f"  Processing {part_dir}...")
    
    # Extract docx pairs
    all_pairs = []
    for df in sorted(os.listdir(DOCX_DIR)):
        if df.endswith('.docx'):
            pairs = extract_docx_content_pairs(os.path.join(DOCX_DIR, df))
            all_pairs.extend(pairs)
    
    print(f"    Docx pairs: {len(all_pairs)}")
    
    # Load JSON
    jsfiles = sorted([f for f in os.listdir(part_path)
                      if f.endswith('.json') and f != 'index.json'])
    
    total_fixed = 0
    total_bad = 0
    
    for jf in jsfiles[:3]:  # Process first 3 for testing
        filepath = os.path.join(part_path, jf)
        data = json.load(open(filepath))
        segments = data['segments']
        
        # Get correct EN for each segment
        correct_ens = match_json_to_docx(segments, all_pairs)
        
        # Update segments
        fixed = 0
        bad = 0
        for i, seg in enumerate(segments):
            old_en = seg.get('en', '').strip()
            new_en = correct_ens[i]
            
            if new_en and new_en != old_en:
                # Check if old was wrong (no word overlap)
                if old_en:
                    he_words = get_he_word_set(seg.get('he', ''))
                    old_words = set(old_en.lower().split())
                    overlap = sum(1 for w in he_words if w.lower() in old_words)
                    if overlap == 0:
                        bad += 1
                
                seg['en'] = new_en
                fixed += 1
        
        if fixed > 0:
            json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)
        
        total_fixed += fixed
        total_bad += bad
        print(f"    {jf}: {fixed} fixed ({bad} bad pairings)")
    
    print(f"    Total: {total_fixed} fixed, {total_bad} bad pairings corrected")

# Test with part-1 first
print("=== Testing LH part-1 repair ===")
fix_part('part-1')