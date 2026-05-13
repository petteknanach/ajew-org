#!/usr/bin/env python3
"""
Final fix: Extract English for parsha teachings by finding the specific letter
within the aligned LH file and extracting only the English for that letter's content.
"""
import json, pathlib, re

LH_DIR = pathlib.Path("/root/ajew-org/public/reader/likutay-halachos")
LM_DIR = pathlib.Path("/root/ajew-org/public/reader/likutay-moharan")

def find_lh_file(halacha_name):
    """Find the LH torah file matching a halacha name."""
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
            if halacha_name in title or title in halacha_name:
                return pdir / f"torah-{t['number']}.json"
    return None

def extract_letter_english(filepath, letter):
    """
    Extract English for a specific letter within a torah file.
    Maps content segments (non-header) within the letter range to their English.
    """
    if not filepath or not filepath.exists():
        return None
    
    data = json.loads(filepath.read_text())
    segs = data.get('segments', [])
    
    # Normalize letter
    letter_clean = letter.strip().strip("'").strip('"')
    
    # Find the letter range
    start_idx = None
    end_idx = len(segs)
    
    for i, seg in enumerate(segs):
        he = str(seg.get('he', '')).strip()
        # Match letter header (with or without geresh/quotes)
        if he == f'אות {letter_clean}' or he.startswith(f'אות {letter_clean}'):
            start_idx = i
        elif start_idx is not None and he.startswith('אות ') and len(he) <= 10:
            end_idx = i
            break
    
    if start_idx is None:
        return None
    
    # Collect English from content segments within the letter range
    en_parts = []
    for i in range(start_idx, end_idx):
        en = str(segs[i].get('en', '')).strip()
        if en:
            en_parts.append(en)
    
    return '\n'.join(en_parts) if en_parts else None

def parse_source(src):
    """Parse source reference. Returns (halacha_name, letter, is_lm)."""
    src = src.strip()
    
    # Check for LM reference
    if 'לקוטי מוהר"ן' in src or 'לקוטי מוהרן' in src:
        return None, src, True  # is_lm=True
    
    # Extract letter - handle plain Hebrew AND Hebrew with geresh (")
    # Patterns: "אות ו", "אות יח", "אות י\"ח", "אות כ\"ד"
    letter_match = re.search(r'אות\s+([א-ת][\'"\u0022]?[א-ת]?)', src)
    letter = letter_match.group(1) if letter_match else None
    
    # Extract halacha name
    if letter:
        halacha_part = src[:letter_match.start()].strip()
    else:
        halacha_part = src.strip()
    
    # Clean up
    halacha_name = re.sub(r'\s*[-–]\s*$', '', halacha_part).strip()
    halacha_name = re.sub(r'^לקוטי הלכות\s*[-–]\s*', '', halacha_name).strip()
    halacha_name = re.sub(r'^הלכות\s+', '', halacha_name).strip()
    
    return halacha_name, letter, False

# Try to find LM file by content search
def find_lm_by_content(hebrew_text):
    """Search LM files for the given Hebrew text."""
    key = normalize_he(hebrew_text)[:40]
    for part in [1, 2]:
        pdir = LM_DIR / f"part-{part}"
        if not pdir.exists():
            continue
        for tf in pdir.glob("torah-*.json"):
            data = json.loads(tf.read_text())
            for i, seg in enumerate(data.get('segments', [])):
                he = normalize_he(seg.get('he', ''))
                if key in he:
                    # Collect English from surrounding segments
                    en_parts = []
                    for j in range(max(0, i-1), min(len(data['segments']), i+5)):
                        en = str(data['segments'][j].get('en', '')).strip()
                        if en:
                            en_parts.append(en)
                    return '\n'.join(en_parts) if en_parts else None
    return None

def normalize_he(text):
    text = str(text).strip()
    text = re.sub(r'[\u0591-\u05C7]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

# Process both parsha files
for fname in ['behar-teachings.json', 'bechukosai-teachings.json']:
    fpath = pathlib.Path(f'/root/ajew-org/public/data/{fname}')
    data = json.loads(fpath.read_text())
    
    print(f"\n{fname}:")
    
    for i, t in enumerate(data):
        if t.get('en', '').strip():
            continue  # Already has English
        
        src = t.get('source', '')
        halacha_name, letter, is_lm = parse_source(src)
        
        if is_lm:
            # Search LM files by content
            he = t.get('he', '')
            en = find_lm_by_content(he)
            if en:
                t['en'] = en
                print(f"  T{i+1}: ✓ LM content match ({len(en)} chars)")
            else:
                print(f"  T{i+1}: ✗ LM not found")
        elif halacha_name and letter:
            lh_file = find_lh_file(halacha_name)
            if lh_file:
                en = extract_letter_english(lh_file, letter)
                if en:
                    t['en'] = en
                    print(f"  T{i+1}: ✓ {lh_file.name} letter {letter} ({len(en)} chars)")
                else:
                    print(f"  T{i+1}: ✗ No English in {lh_file.name} letter {letter}")
            else:
                print(f"  T{i+1}: ✗ No LH file for: {halacha_name}")
        else:
            print(f"  T{i+1}: ✗ Can't parse: {src}")
    
    fpath.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    
    has_en = sum(1 for t in data if t.get('en', '').strip())
    print(f"\n  Total: {has_en}/{len(data)} have English")
