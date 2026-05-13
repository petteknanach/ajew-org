#!/usr/bin/env python3
"""Extract proper English for Behar and Bechukosai teachings from aligned LH/LM source files."""
import json, pathlib, re

LH_DIR = pathlib.Path("/root/ajew-org/public/reader/likutay-halachos")
LM_DIR = pathlib.Path("/root/ajew-org/public/reader/likutay-moharan")

def find_lh_file(halacha_name):
    """Find the LH torah file matching a halacha name."""
    # Normalize the name
    halacha_name = halacha_name.strip()
    
    for part in range(1, 9):
        pdir = LH_DIR / f"part-{part}"
        if not pdir.exists():
            continue
        idx_file = pdir / "index.json"
        if not idx_file.exists():
            continue
        idx = json.loads(idx_file.read_text())
        for t in idx.get('torahs', []):
            title = t.get('hebrewTitle', '') or t.get('title', '')
            # Try various matching strategies
            if halacha_name in title or title in halacha_name:
                return pdir / f"torah-{t['number']}.json"
            # Try without prefixes
            clean_title = re.sub(r'^(הלכות|לקוטי הלכות)\s*[-–]?\s*', '', title)
            clean_name = re.sub(r'^(הלכות|לקוטי הלכות)\s*[-–]?\s*', '', halacha_name)
            if clean_name in clean_title or clean_title in clean_name:
                return pdir / f"torah-{t['number']}.json"
    return None

def find_lm_file(simanim):
    """Find the LM torah file matching a siman reference."""
    # LM references like "סימן ז'" 
    match = re.search(r'סימן\s+([א-ת]+)', simanim)
    if match:
        siman_letter = match.group(1)
        # Search LM index
        for part in [1, 2]:
            pdir = LM_DIR / f"part-{part}"
            if not pdir.exists():
                continue
            idx_file = pdir / "index.json"
            if not idx_file.exists():
                continue
            idx = json.loads(idx_file.read_text())
            for t in idx.get('torahs', []):
                title = t.get('hebrewTitle', '') or t.get('title', '')
                if f'סימן {siman_letter}' in title:
                    return pdir / f"torah-{t['number']}.json"
    return None

def extract_letter_english(filepath, letter):
    """Extract English segments for a specific letter from a torah file."""
    if not filepath or not filepath.exists():
        return None
    
    data = json.loads(filepath.read_text())
    segs = data.get('segments', [])
    
    # Normalize letter (handle both Hebrew letter and Hebrew letter with geresh)
    letter_clean = letter.strip().strip("'").strip('"')
    letter_patterns = [
        f'אות {letter_clean}',
        f'אות {letter_clean}\'',
        f'אות {letter_clean}"',
    ]
    
    start_idx = None
    for i, seg in enumerate(segs):
        he = str(seg.get('he', '')).strip()
        for pattern in letter_patterns:
            if he == pattern or he.startswith(pattern):
                start_idx = i
                break
        if start_idx is not None:
            break
    
    if start_idx is None:
        return None
    
    en_parts = []
    for i in range(start_idx, len(segs)):
        he = str(segs[i].get('he', '')).strip()
        en = str(segs[i].get('en', '')).strip()
        
        if i > start_idx and he.startswith('אות ') and len(he) <= 10:
            break
        
        if en:
            en_parts.append(en)
    
    return '\n'.join(en_parts) if en_parts else None

def parse_source(src):
    """Parse a source reference into (halacha_name, letter, is_lm)."""
    src = src.strip()
    
    # Check if it's an LM reference
    if 'לקוטי מוהר"ן' in src or 'לקוטי מוהרן' in src:
        lm_match = re.search(r'לקוטי מוהר["\u0022]?ן\s*([^\-]*)', src)
        if lm_match:
            simanim = lm_match.group(1).strip()
            return None, simanim, True
    
    # Extract letter
    letter_match = re.search(r'אות\s+([א-ת][\'"]?)', src)
    letter = letter_match.group(1) if letter_match else None
    
    # Extract halacha name - try various patterns
    # Pattern 1: "הלכות X - אות Y"
    # Pattern 2: "לקוטי הלכות - הלכות X - אות Y"
    # Pattern 3: "X - אות Y" (where X is the halacha name)
    
    # Remove the letter part
    halacha_part = re.split(r'אות\s+[א-ת]', src)[0].strip()
    # Remove trailing dash
    halacha_part = halacha_part.rstrip(' -–')
    # Remove "לקוטי הלכות - " prefix
    halacha_part = re.sub(r'^לקוטי הלכות\s*[-–]\s*', '', halacha_part)
    # Remove "הלכות " prefix
    halacha_name = re.sub(r'^הלכות\s+', '', halacha_part).strip()
    
    return halacha_name, letter, False

# Process both parsha files
for fname in ['behar-teachings.json', 'bechukosai-teachings.json']:
    fpath = pathlib.Path(f'/root/ajew-org/public/data/{fname}')
    if not fpath.exists():
        print(f"File not found: {fname}")
        continue
    
    data = json.loads(fpath.read_text())
    print(f"\n{fname}: {len(data)} teachings")
    
    for t in data:
        src = t.get('source', '')
        if t.get('en', '').strip():
            print(f"  ✓ Already has English: {src[:60]}")
            continue
        
        halacha_name, letter, is_lm = parse_source(src)
        
        if is_lm:
            # Find LM file
            lm_file = find_lm_file(letter)
            if lm_file:
                # For LM, the "letter" is actually the siman reference
                # We need to find the right section in the LM file
                en_text = extract_letter_english(lm_file, letter)
                if en_text:
                    t['en'] = en_text
                    print(f"  ✓ LM: {src[:60]}: {len(en_text)} chars")
                else:
                    print(f"  ✗ LM not found: {src[:60]}")
            else:
                print(f"  ✗ No LM file: {src[:60]}")
        elif halacha_name and letter:
            lh_file = find_lh_file(halacha_name)
            if lh_file:
                en_text = extract_letter_english(lh_file, letter)
                if en_text:
                    t['en'] = en_text
                    print(f"  ✓ {src[:60]}: {len(en_text)} chars")
                else:
                    print(f"  ✗ No English in {lh_file.name} for letter {letter}")
            else:
                print(f"  ✗ No LH file: {halacha_name}")
        else:
            print(f"  ✗ Can't parse: {src}")
    
    fpath.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    
    has_en = sum(1 for t in data if t.get('en', '').strip())
    print(f"  Result: {has_en}/{len(data)} have English")
