#!/usr/bin/env python3
"""
Fast LH EN-HE pairing fix using inverted index.
Build word index from docx, then O(1) lookup per segment.
"""
from docx import Document
import json
import os
import re
from collections import defaultdict

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

def get_he_words(text):
    return set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(text)))

def extract_docx_pairs(docx_path):
    """Extract (HE, EN) pairs from docx, focusing on content paragraphs."""
    doc = Document(docx_path)
    paras = [p.text for p in doc.paragraphs]
    
    # Skip patterns (headers, metadata)
    skip_patterns = ['Hilchos', 'Na NaCh', 'Naanach', 'Likutay Halachos',
                     'Volume', 'Introduction', 'HH', 'Sefer', 'Torah',
                     'OC', 'YD', 'EH', 'CM', 'Orach', 'Yoreh', 'Even',
                     'Choshen', 'osio', 'siman', 'seif', 'סי', 'ס']
    
    he_list = []
    en_list = []
    
    for text in paras:
        text = text.strip()
        if len(text) < 15:
            continue
        
        # Skip known header patterns
        if any(text.startswith(p) or p in text[:30] for p in skip_patterns):
            continue
        
        if has_hebrew(text):
            # Skip if too short or looks like a header
            words = get_he_words(text)
            if len(words) >= 3:
                he_list.append(text)
        else:
            if len(text) > 10:
                en_list.append(text)
    
    # Pair HE with following EN
    pairs = []
    # Find the split point: HE paragraphs come first, then EN
    # Actually the structure alternates, let's pair by position after aligning
    
    # Simple approach: pair by position, handle mismatches
    i = 0
    while i < len(he_list) and i < len(en_list):
        pairs.append((he_list[i], en_list[i]))
        i += 1
    
    return pairs

def build_word_index(pairs):
    """Build inverted index: Hebrew word -> list of (pair_index, en_text)."""
    index = defaultdict(list)
    for idx, (he, en) in enumerate(pairs):
        words = get_he_words(he)
        for w in words:
            index[w].append((idx, en))
    return index

def find_correct_en(he_text, word_index, all_pairs, threshold=0.3):
    """Find the correct EN for a HE text using the word index."""
    he_words = get_he_words(he_text)
    if not he_words:
        return None
    
    # Collect candidate EN texts with their scores
    candidates = defaultdict(int)  # en_text -> score
    for w in he_words:
        if w in word_index:
            for pair_idx, en in word_index[w]:
                candidates[(pair_idx, en)] += 1
    
    if not candidates:
        return None
    
    # Score each candidate by total keyword overlap
    best_en = None
    best_score = 0
    
    for (pair_idx, en), word_count in candidates.items():
        docx_he = all_pairs[pair_idx][0]
        docx_he_words = get_he_words(docx_he)
        
        if not docx_he_words:
            continue
        
        # Calculate overlap ratio
        overlap = he_words & docx_he_words
        score = len(overlap)
        
        # Bonus for longer overlap relative to both texts
        if docx_he_words:
            score += len(overlap) / len(docx_he_words) * 2
        
        if score > best_score:
            best_score = score
            best_en = en
    
    # Only return if score is above threshold (real match, not spurious)
    if best_score >= 5 and best_en:
        return best_en
    return None

def is_bad_pairing(he_text, en_text):
    """Check if the EN is likely wrong for this HE."""
    he_words = get_he_words(he_text)
    if not he_words or not en_text:
        return False
    
    en_lower = en_text.lower()
    # Count Hebrew root words that appear in EN (transliterated)
    matches = sum(1 for w in he_words if len(w) >= 4 and w.lower() in en_lower)
    
    # If no transliterated words match, might be bad
    # But some translations don't include transliterations
    # So only flag if HE has many distinctive words
    if len(he_words) > 10 and matches == 0:
        return True
    if len(he_words) > 20 and matches < 2:
        return True
    
    return False

def fix_part_fast(part_dir):
    """Fix LH part using fast indexed lookup."""
    part_path = os.path.join(READER_DIR, part_dir)
    if not os.path.exists(part_path):
        return
    
    print(f"  Processing {part_dir}...")
    
    # Build index from all docx files
    all_pairs = []
    for df in sorted(os.listdir(DOCX_DIR)):
        if df.endswith('.docx'):
            pairs = extract_docx_pairs(os.path.join(DOCX_DIR, df))
            all_pairs.extend(pairs)
    
    word_index = build_word_index(all_pairs)
    print(f"    Indexed {len(all_pairs)} docx pairs, {len(word_index)} unique words")
    
    # Load JSON files
    jsfiles = sorted([f for f in os.listdir(part_path)
                      if f.endswith('.json') and f != 'index.json'])
    
    total_fixed = 0
    total_bad = 0
    
    for jf in jsfiles:
        filepath = os.path.join(part_path, jf)
        data = json.load(open(filepath))
        changed = False
        
        for seg in data['segments']:
            he = seg.get('he', '').strip()
            en = seg.get('en', '').strip()
            
            if not he or len(he) < 20:
                continue
            
            # Check if pairing is bad
            if is_bad_pairing(he, en):
                correct_en = find_correct_en(he, word_index, all_pairs)
                
                if correct_en and correct_en != en:
                    seg['en'] = correct_en
                    total_fixed += 1
                    total_bad += 1
                    changed = True
                elif not en:
                    correct_en = find_correct_en(he, word_index, all_pairs)
                    if correct_en:
                        seg['en'] = correct_en
                        total_fixed += 1
                        changed = True
        
        if changed:
            json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)
    
    # Stats
    total_segs = 0
    total_en_count = 0
    for f in os.listdir(part_path):
        if not f.endswith('.json') or f == 'index.json':
            continue
        d = json.load(open(os.path.join(part_path, f)))
        segs = d.get('segments', d if isinstance(d, list) else [])
        if isinstance(segs, list):
            total_segs += len(segs)
            for s in segs:
                if s.get('en', '').strip():
                    total_en_count += 1

    print(f"    Fixed: {total_fixed} bad pairings")
    print(f"    EN: {total_en_count}/{total_segs} ({total_en_count/total_segs*100:.1f}%)")

# Run for part-1
fix_part_fast('part-1')