#!/usr/bin/env python3
"""Check actual EN-HE pairing for specific segments."""
import json
import os
from docx import Document
import re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c):
    return '\u05D0' <= c <= '\u05EA'

def is_hebrew_text(text):
    return any(is_hebrew_char(c) for c in text)

def extract_he_en_pairs(docx_path):
    """Extract pairs by: find Hebrew paragraph, then collect following English."""
    doc = Document(docx_path)
    pairs = []
    paras = [p.text.strip() for p in doc.paragraphs]

    i = 0
    while i < len(paras):
        text = paras[i]
        if len(text) < 10 or not is_hebrew_text(text):
            i += 1
            continue

        # Found Hebrew - collect all following English
        he = text
        en_parts = []
        i += 1
        while i < len(paras) and not is_hebrew_text(paras[i]):
            if len(paras[i]) > 5:
                en_parts.append(paras[i])
            i += 1

        if en_parts:
            pairs.append((he, ' '.join(en_parts)))

    return pairs

def main():
    # Check specific files
    docx_path = os.path.join(DOCX_DIR, 'Volume_01_OC1_English.docx')
    pairs = extract_he_en_pairs(docx_path)
    print(f"Extracted {len(pairs)} HE-EN pairs from docx\n")

    # Print first 5 pairs
    print("=== First 5 pairs from docx ===")
    for i, (he, en) in enumerate(pairs[:5]):
        print(f"\nPair {i}:")
        print(f"  HE ({len(he)} chars): {he[:150]}...")
        print(f"  EN ({len(en)} chars): {en[:200]}...")

    # Now compare with JSON
    json_path = os.path.join(READER_DIR, 'part-1', 'halacha-1.json')
    data = json.load(open(json_path))
    print(f"\n\n=== JSON halacha-1.json ===")
    print(f"Total segments: {len(data['segments'])}")
    for i, seg in enumerate(data['segments'][:3]):
        print(f"\nSeg {i}:")
        print(f"  HE ({len(seg.get('he',''))}): {seg.get('he','')[:150]}...")
        print(f"  EN ({len(seg.get('en',''))}): {seg.get('en','')[:200]}...")

if __name__ == '__main__':
    main()