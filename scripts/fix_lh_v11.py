#!/usr/bin/env python3
"""
Fix LH pairing v11 - Direct content extraction from docx.

The docx has all English content (with some Hebrew terms). The JSON has all 
Hebrew content. The EN in JSON was incorrectly matched positionally.

Fix: Extract all English content paragraphs from docx, then assign them
to JSON content segments by position (after stripping headers/metadata).
"""
from docx import Document
import json, os, re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

# Patterns that indicate metadata/header paragraphs
META_PATTERNS = [
    'hilchos ', 'na nach', 'naanach', 'siman ', 'seif ', 'osio ',
    'volume ', 'introduction', 'likutay', 'a collection', 'the laws ',
    'oc ', 'yd ', 'eh ', 'cm ', 'like all', 'segment',
    'one stop', 'arranged by', 'torah ', 'nitan l\'tal', 'rabbi nachman',
    'the entire likutay', 'end of', 'nnmmm', 'na na',
    'each paragraph in this volume', 'table of contents',
    'right-click', 'update field', 'arranged', 'this edition'
]

def is_meta(text):
    t = text.lower().strip()
    return len(t.split()) <= 2 or any(t.startswith(p) for p in META_PATTERNS) or \
           any(p in t for p in ['copyright', 'rough draft', 'no copyright', 'free for all'])

def extract_en_content(docx_path):
    """Extract English content paragraphs from docx, skipping headers."""
    doc = Document(docx_path)
    en_list = []
    
    finding_content = False
    for p in doc.paragraphs:
        t = p.text.strip()
        if len(t) < 10:
            continue
        
        if is_meta(t):
            if finding_content:
                # Reached end of content
                pass
            continue
        
        # If we get here, it's a content paragraph
        finding_content = True
        
        # Only include non-Hebrew content (the EN translation)
        # Skip paragraphs that are mostly Hebrew
        he_chars = sum(1 for c in t if is_hebrew_char(c))
        if he_chars > len(t) * 0.3:
            continue  # Mostly Hebrew
        
        en_list.append(t)
    
    return en_list

def main():
    print("Building docx content index...\n")
    
    # Build combined EN list for all volumes
    all_en = []
    vol_en_map = {}  # volume number -> list of EN paragraphs
    
    for df in sorted(os.listdir(DOCX_DIR)):
        if not df.endswith('.docx'): 
            continue
        
        # Extract volume number
        vol_match = re.search(r'Volume_(\d+)', df)
        if not vol_match:
            continue
        vol_num = int(vol_match.group(1))
        
        en_list = extract_en_content(os.path.join(DOCX_DIR, df))
        vol_en_map[vol_num] = en_list
        all_en.extend(en_list)
        
        print(f"  Vol {vol_num:2d}: {len(en_list):4d} EN paragraphs")
    
    print(f"\nTotal EN paragraphs: {len(all_en)}")
    
    # Map parts to volume numbers
    PART_VOLS = {
        'part-1': [1,2,3,4,5,6,7,8,9,10],
        'part-2': [11,12,13,14,15,16],
        'part-3': [17,18,19],
        'part-4': [20,21,22,23],
        'part-5': [24,25,26,27],
        'part-6': [28],
        'part-7': [29,30,31,32],
        'part-8': [33,34,35,36,37],
    }
    
    print("\n=== Processing parts ===")
    
    for part_dir, vols in PART_VOLS.items():
        part_path = os.path.join(READER_DIR, part_dir)
        if not os.path.exists(part_path):
            continue
        
        # Get EN paragraphs for this part's volumes
        part_en = []
        for v in vols:
            if v in vol_en_map:
                part_en.extend(vol_en_map[v])
        
        # Load and process JSON files
        jsfiles = sorted([f for f in os.listdir(part_path)
                          if f.endswith('.json') and f != 'index.json'])
        
        # Collect content segment EN indices
        # (segments that have actual content HE, not headers)
        content_seg_indices = []
        for jf in jsfiles:
            data = json.load(open(os.path.join(part_path, jf)))
            for i, seg in enumerate(data['segments']):
                he = seg.get('he', '').strip()
                if he and len(he) > 20 and not is_meta(he):
                    content_seg_indices.append((jf, i))
        
        print(f"\n  {part_dir}: {len(content_seg_indices)} content segments, {len(part_en)} EN paragraphs")
        
        # Assign EN to segments by position
        fixed = 0
        for seg_idx, (jf, seg_i) in enumerate(content_seg_indices):
            if seg_idx >= len(part_en):
                break
            
            filepath = os.path.join(part_path, jf)
            data = json.load(open(filepath))
            seg = data['segments'][seg_i]
            
            old_en = seg.get('en', '').strip()
            new_en = part_en[seg_idx]
            
            if new_en != old_en:
                # Only fix if new EN is significantly different
                if len(new_en) > 20 and (not old_en or abs(len(new_en) - len(old_en)) > 50):
                    seg['en'] = new_en
                    fixed += 1
                    json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)
        
        print(f"    Fixed: {fixed} segment EN texts")

main()