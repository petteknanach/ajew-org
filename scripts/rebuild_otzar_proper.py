#!/usr/bin/env python3
"""
Proper Otzar HaYirah Rebuild - Topic by Topic

Extracts topics from the Otzar HaYirah docx volumes,
numbers the simanim, and creates clean structured JSON
with Hebrew + English (when available) for each topic.
"""

import json
import pathlib
import re
from docx import Document

DOCX_DIR = pathlib.Path("/mnt/c/Users/Pettek/.openclaw/workspace/ajew-org/public/reader/otzar-hayirah")
OUTPUT_DIR = pathlib.Path("/root/ajew-org/public/reader/otzar-hayirah")

HEB_LETTERS = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10,
    'יא': 11, 'יב': 12, 'יג': 13, 'יד': 14, 'טו': 15, 'טז': 16, 'יז': 17, 'יח': 18, 'יט': 19, 'כ': 20,
    'כא': 21, 'כב': 22, 'כג': 23, 'כד': 24, 'כה': 25, 'כו': 26, 'כז': 27, 'כח': 28, 'כט': 29, 'ל': 30,
}

def extract_simanim(text):
    """Extract numbered simanim (אות א, אות ב, etc.) from text."""
    simanim = []
    # Pattern for אות + letter
    pattern = r'(אות\s+[א-ת״]+)\s*\.?\s*'
    matches = list(re.finditer(pattern, text))
    
    for i, match in enumerate(matches):
        marker = match.group(1).strip()
        start = match.end()
        end = matches[i+1].start() if i+1 < len(matches) else len(text)
        content = text[start:end].strip()
        
        # Get the number
        letter = marker.replace("אות", "").strip()
        num = HEB_LETTERS.get(letter, 0)
        
        if content and num > 0:
            simanim.append({
                "number": num,
                "letter": letter,
                "he": content
            })
    return simanim

def parse_volume(docx_path, volume_num):
    """Parse one volume docx and return topics with simanim."""
    doc = Document(docx_path)
    full_text = "\n".join([p.text for p in doc.paragraphs])
    
    # Split by major topic headings (simple heuristic for now)
    # In practice these docx have clear topic sections
    topics = []
    
    # For now, treat the whole volume as one big extraction
    # and later split by known topic names
    simanim = extract_simanim(full_text)
    
    if simanim:
        topics.append({
            "volume": volume_num,
            "title": f"Volume {volume_num}",
            "simanim": simanim
        })
    
    return topics

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    volumes = [
        ("oatzar hayeeruh - volume 1 - copied from torat emet for simanim.docx", 1),
        ("oatzar hayeerah - volume 2 - copied from Torat Emet for simanim.docx", 2),
        ("oatzar hayeerah - volume 3 - copied from Torat emet for simanim.docx", 3),
        ("Oatzar hayeerah - volume 4 - copied from torat emet for simanim.docx", 4),
    ]
    
    all_topics = []
    
    for filename, vol in volumes:
        path = DOCX_DIR / filename
        if not path.exists():
            print(f"Missing: {filename}")
            continue
        
        print(f"Processing Volume {vol}...")
        topics = parse_volume(path, vol)
        all_topics.extend(topics)
    
    # Save index
    index = {
        "topics": [{"title": t["title"], "volume": t["volume"]} for t in all_topics]
    }
    
    with open(OUTPUT_DIR / "index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"\nCreated index with {len(all_topics)} topics")
    print("Saved to public/reader/otzar-hayirah/index.json")

if __name__ == "__main__":
    main()