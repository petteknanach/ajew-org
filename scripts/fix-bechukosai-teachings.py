#!/usr/bin/env python3
"""
Fix Bechukosai LH teachings:
- Use existing JSON if present (has good Hebrew)
- Pull matching English from LH torah files
- Correct any remaining OCR issues
"""

import json
import pathlib
import re

LH_DIR = pathlib.Path("/root/ajew-org/public/reader/likutay-halachos")
DATA_FILE = pathlib.Path("/root/ajew-org/public/data/bechukosai-teachings.json")
DOCX_PATH = "/mnt/c/Users/Pettek/.openclaw/workspace/ajew-org/public/reader/Parsha/3 VaYikra/10 Bichookoaseye.docx"

def find_torah_for_source(source_text):
    """Find part + torah number from source string like 'הלכות תלמוד תורה ג' - אות ב'"""
    # Extract halacha name
    m = re.search(r'הלכות\s+([^\-]+)', source_text)
    if not m:
        return None, None
    halacha = m.group(1).strip()
    
    for p in range(1, 9):
        idx_file = LH_DIR / f"part-{p}" / "index.json"
        if not idx_file.exists():
            continue
        idx = json.loads(idx_file.read_text())
        for t in idx.get("torahs", []):
            title = t.get("hebrewTitle", "") or ""
            if halacha in title or title in halacha:
                return p, t["number"]
    return None, None

def extract_english(part, torah_num, letter=None):
    """Extract English (and Hebrew) for a given letter or the whole torah"""
    f = LH_DIR / f"part-{part}" / f"torah-{torah_num}.json"
    if not f.exists():
        return "", ""
    data = json.loads(f.read_text())
    segs = data.get("segments", [])
    
    if not segs:
        return "", ""
    
    # If letter specified, find starting point
    start_idx = 0
    if letter:
        for i, seg in enumerate(segs):
            he = str(seg.get("he", ""))
            if f"אות {letter}" in he or he.startswith(f"אות {letter}"):
                start_idx = i
                break
    
    he_parts, en_parts = [], []
    for i in range(start_idx, len(segs)):
        he = str(segs[i].get("he", "")).strip()
        en = str(segs[i].get("en", "")).strip()
        if i > start_idx and he.startswith("אות ") and len(he) <= 12:
            break
        if he: he_parts.append(he)
        if en: en_parts.append(en)
    
    return "\n".join(he_parts), "\n".join(en_parts)

def main():
    # Load existing (has good Hebrew from previous run)
    with open(DATA_FILE) as f:
        teachings = json.load(f)
    
    print(f"Processing {len(teachings)} Bechukosai teachings...")
    
    fixed_count = 0
    for i, t in enumerate(teachings):
        source = t.get("source", "")
        if not source:
            continue
            
        # Try to find the LH file
        part, torah_num = find_torah_for_source(source)
        
        # Extract letter if present
        letter_match = re.search(r'אות\s*([א-ת״]+)', source)
        letter = letter_match.group(1) if letter_match else None
        
        if part and torah_num:
            he, en = extract_english(part, torah_num, letter)
            if en and len(en) > 30:
                t["en"] = en
                if he and len(he) > 100:
                    t["he"] = he  # overwrite with cleaner version
                fixed_count += 1
                print(f"  #{i+1}: en={len(en)} chars from part-{part}/torah-{torah_num}")
    
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(teachings, f, ensure_ascii=False, indent=2)
    
    print(f"\nFixed English for {fixed_count} teachings")
    print("Saved to public/data/bechukosai-teachings.json")

if __name__ == "__main__":
    main()