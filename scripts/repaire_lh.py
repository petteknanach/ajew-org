#!/usr/bin/env python3
"""
Re-pair Likutay Halachos EN-HE by content matching.
The docx has the correct EN text, but it was assigned positionally.
We need to:
1. Parse the docx to get correct EN text
2. Match each docx paragraph to the correct JSON segment by content
"""
import json
import os
import re
from docx import Document

def normalize_text(text):
    """Normalize text for comparison."""
    if not text:
        return ''
    # Remove parentheses content, brackets, etc.
    text = re.sub(r'\[.*?\]', ' ', text)
    text = re.sub(r'[\u2018\u2019\u201c\u201d\u00ad]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text.lower()

def get_docx_paragraphs(volume_num):
    """Get English paragraphs from docx for a given volume."""
    docx_path = f'/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos/Volume_{volume_num:02d}_OC1_English.docx'
    if not os.path.exists(docx_path):
        return []
    
    doc = Document(docx_path)
    paragraphs = []
    for p in doc.paragraphs:
        text = p.text.strip()
        if text:
            paragraphs.append(text)
    return paragraphs

def match_docx_to_json(paragraphs, segments):
    """Match docx English paragraphs to JSON segments by content similarity."""
    # For each docx paragraph, find the best matching JSON segment
    matched = {}  # json_seg_index -> docx_paragraph
    
    for pi, para in enumerate(paragraphs):
        para_norm = normalize_text(para)
        if len(para_norm) < 20:
            continue  # Skip very short paragraphs (headers, etc.)
        
        best_score = 0
        best_idx = -1
        
        for sj, seg in enumerate(segments):
            he = seg.get('he', '')
            if not he:
                continue
            
            # Key word overlap approach
            # Extract meaningful words from both
            para_words = set(w for w in para_norm.split() if len(w) > 3)
            he_words = set(w for w in normalize_text(he).split() if len(w) > 3)
            
            if not para_words or not he_words:
                continue
            
            # Jaccard similarity
            intersection = len(para_words & he_words)
            union = len(para_words | he_words)
            jaccard = intersection / union if union > 0 else 0
            
            if jaccard > best_score:
                best_score = jaccard
                best_idx = sj
        
        if best_idx >= 0 and best_score > 0.1:
            matched[best_idx] = para
    
    return matched

def main():
    lh_dir = 'public/reader/likutay-halachos'
    
    for part_dir in sorted(os.listdir(lh_dir)):
        part_path = os.path.join(lh_dir, part_dir)
        if not os.path.isdir(part_path):
            continue
        
        print(f'Processing {part_dir}...')
        
        for f in sorted(os.listdir(part_path)):
            if not f.startswith('halacha-') or not f.endswith('.json'):
                continue
            
            filepath = os.path.join(part_path, f)
            try:
                data = json.load(open(filepath))
            except:
                continue
            
            segments = data.get('segments', [])
            if not segments:
                continue
            
            # Find part number and attempt to get docx
            # Part 1 = Volumes 1-10, Part 2 = Volumes 11-30, etc.
            # This needs proper mapping
            
            # For now, let's analyze the mismatch
            for seg in segments:
                he = seg.get('he', '')
                en = seg.get('en', '')
                if he and en:
                    # Check if they don't match
                    he_words = set(normalize_text(he).split())
                    en_words = set(normalize_text(en).split())
                    if not he_words or not en_words:
                        continue
                    overlap = len(he_words & en_words) / max(len(he_words | en_words), 1)
                    if overlap < 0.05:  # Very low overlap = bad pairing
                        print(f'  Bad: {f} - HE: {he[:60]} | EN: {en[:60]}')
                        break  # Just show one example per file

if __name__ == '__main__':
    main()