#!/usr/bin/env python3
"""
Extract English for parsha teachings by matching Hebrew content in aligned LH/LM files.
Uses fuzzy matching to find the Hebrew text in the LH files and extract corresponding English.
"""
import json, pathlib, re

LH_DIR = pathlib.Path("/root/ajew-org/public/reader/likutay-halachos")
LM_DIR = pathlib.Path("/root/ajew-org/public/reader/likutay-moharan")

def normalize_he(text):
    """Normalize Hebrew text for comparison."""
    text = str(text).strip()
    # Remove nikud (Hebrew vowels)
    text = re.sub(r'[\u0591-\u05C7]', '', text)
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove common punctuation
    text = re.sub(r'["\'״׳]', '', text)
    return text.strip()

def find_text_in_file(filepath, search_text, min_match_len=50):
    """Search for a Hebrew text snippet in a JSON file and return the segments around it."""
    if not filepath.exists():
        return None
    
    data = json.loads(filepath.read_text())
    segs = data.get('segments', [])
    
    search_norm = normalize_he(search_text)
    # Use first 40 chars as search key
    key = search_norm[:40]
    
    for i, seg in enumerate(segs):
        he = normalize_he(seg.get('he', ''))
        if key in he:
            # Found! Collect English from this segment and nearby ones
            en_parts = []
            # Go back a bit to capture the start
            start = max(0, i-1)
            for j in range(start, min(len(segs), i+5)):
                en = str(segs[j].get('en', '')).strip()
                if en:
                    en_parts.append(en)
            return '\n'.join(en_parts) if en_parts else None
    
    return None

def search_all_lh(search_text):
    """Search all LH files for the given Hebrew text."""
    for part in range(1, 9):
        pdir = LH_DIR / f"part-{part}"
        if not pdir.exists():
            continue
        for tf in pdir.glob("torah-*.json"):
            result = find_text_in_file(tf, search_text)
            if result:
                return result, tf.name
    return None, None

def search_all_lm(search_text):
    """Search all LM files for the given Hebrew text."""
    for part in [1, 2]:
        pdir = LM_DIR / f"part-{part}"
        if not pdir.exists():
            continue
        for tf in pdir.glob("torah-*.json"):
            result = find_text_in_file(tf, search_text)
            if result:
                return result, tf.name
    return None, None

# Process both parsha files
for fname in ['behar-teachings.json', 'bechukosai-teachings.json']:
    fpath = pathlib.Path(f'/root/ajew-org/public/data/{fname}')
    data = json.loads(fpath.read_text())
    
    print(f"\n{fname}: {len(data)} teachings")
    
    for i, t in enumerate(data):
        if t.get('en', '').strip():
            print(f"  T{i+1}: ✓ Already has English ({len(t['en'])} chars)")
            continue
        
        he = t.get('he', '')
        if not he:
            print(f"  T{i+1}: ✗ No Hebrew text")
            continue
        
        # Search in LH files
        en, source_file = search_all_lh(he)
        if not en:
            # Search in LM files
            en, source_file = search_all_lm(he)
        
        if en:
            t['en'] = en
            print(f"  T{i+1}: ✓ Found English in {source_file} ({len(en)} chars)")
        else:
            print(f"  T{i+1}: ✗ No English found")
    
    fpath.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    
    has_en = sum(1 for t in data if t.get('en', '').strip())
    print(f"\n  Total: {has_en}/{len(data)} have English")
