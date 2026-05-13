#!/usr/bin/env python3
"""Extract proper English for Behar and Bechukosai teachings from aligned LH source files."""
import json, pathlib, re

LH_DIR = pathlib.Path("/root/ajew-org/public/reader/likutay-halachos")

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
    """Extract English segments for a specific letter (אות) from a LH torah file."""
    data = json.loads(filepath.read_text())
    segs = data.get('segments', [])
    
    letter_pattern = f'אות {letter}'
    start_idx = None
    for i, seg in enumerate(segs):
        he = str(seg.get('he', '')).strip()
        if he == letter_pattern or he.startswith(letter_pattern):
            start_idx = i
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
            print(f"  ✓ Already has English: {src[:50]}")
            continue
        
        # Parse source to find halacha name and letter
        letter_match = re.search(r'אות\s+([א-ת])', src)
        letter = letter_match.group(1) if letter_match else None
        
        halacha = re.split(r'\s*[-–]\s*אות', src)[0].strip()
        halacha = re.sub(r'^הלכות\s+', '', halacha)
        
        if not letter:
            print(f"  ✗ No letter: {src}")
            continue
        
        lh_file = find_lh_file(halacha)
        if not lh_file:
            print(f"  ✗ No LH file: {halacha}")
            continue
        
        en_text = extract_letter_english(lh_file, letter)
        if en_text:
            t['en'] = en_text
            print(f"  ✓ {src[:60]}: {len(en_text)} chars")
        else:
            print(f"  ✗ No English in {lh_file.name} for letter {letter}")
    
    fpath.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    
    has_en = sum(1 for t in data if t.get('en', '').strip())
    print(f"  Result: {has_en}/{len(data)} have English")
