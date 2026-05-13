#!/usr/bin/env python3
"""Extract proper English for Behar teachings from aligned LH source files."""
import json, pathlib, re

LH_DIR = pathlib.Path("/root/ajew-org/public/reader/likutay-halachos")

def find_lh_file(halacha_name):
    """Find the LH torah file matching a halacha name."""
    # Search all parts for matching halacha
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

def extract_letter_segments(filepath, letter):
    """Extract Hebrew and English segments for a specific letter (אות) from a LH torah file."""
    data = json.loads(filepath.read_text())
    segs = data.get('segments', [])
    
    # Find the letter header
    letter_pattern = f'אות {letter}'
    start_idx = None
    for i, seg in enumerate(segs):
        he = str(seg.get('he', '')).strip()
        if he == letter_pattern or he.startswith(letter_pattern):
            start_idx = i
            break
    
    if start_idx is None:
        return None, None
    
    # Collect segments until next letter
    he_parts, en_parts = [], []
    for i in range(start_idx, len(segs)):
        he = str(segs[i].get('he', '')).strip()
        en = str(segs[i].get('en', '')).strip()
        
        # Stop at next letter marker (but not the first one)
        if i > start_idx and he.startswith('אות ') and len(he) <= 10:
            break
        
        if he: he_parts.append(he)
        if en: en_parts.append(en)
    
    return '\n'.join(he_parts), '\n'.join(en_parts)

# Load Behar teachings
behar = json.loads(pathlib.Path('/root/ajew-org/public/data/behar-teachings.json').read_text())

# For each teaching, parse the source reference and extract English
for t in behar:
    src = t.get('source', '')
    
    # Parse source: "הלכות X - אות Y" or "הלכות X"
    # Try to extract halacha name and letter
    letter_match = re.search(r'אות\s+([א-ת])', src)
    letter = letter_match.group(1) if letter_match else None
    
    # Extract halacha name - everything before " - אות" or the whole string
    halacha = re.split(r'\s*[-–]\s*אות', src)[0].strip()
    # Remove leading "הלכות " if present
    halacha = re.sub(r'^הלכות\s+', '', halacha)
    
    if not letter:
        print(f"  ✗ No letter found in source: {src}")
        continue
    
    # Find the LH file
    lh_file = find_lh_file(halacha)
    if not lh_file:
        print(f"  ✗ LH file not found for: {halacha}")
        continue
    
    # Extract English for this letter
    he_text, en_text = extract_letter_segments(lh_file, letter)
    
    if en_text:
        t['en'] = en_text
        print(f"  ✓ {src}: {len(en_text)} chars")
    else:
        print(f"  ✗ No English found for: {src} (file: {lh_file.name})")

# Save
pathlib.Path('/root/ajew-org/public/data/behar-teachings.json').write_text(
    json.dumps(behar, ensure_ascii=False, indent=2)
)

# Summary
has_en = sum(1 for t in behar if t.get('en', '').strip())
print(f"\n{has_en}/{len(behar)} teachings now have English")
