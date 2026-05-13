#!/usr/bin/env python3
"""
Fresh start: Full source inventory and pairing analysis.
For each book, identify:
1. What source files exist
2. What the current JSON pairing looks like  
3. What the correct pairing should be
"""
import json, os, re
from docx import Document

READER_DIR = '/root/ajew-org/public/reader'

def has_hebrew(t):
    return any('\u05D0' <= c <= '\u05EA' for c in t)

def count_by_book(book_dir):
    total = 0; has_he = 0; has_en = 0; both = 0; en_text = 0
    for f in sorted(os.listdir(book_dir)):
        if not f.endswith('.json') or f == 'index.json': continue
        data = json.load(open(os.path.join(book_dir, f)))
        for seg in data.get('segments', []):
            total += 1
            h = seg.get('he','').strip()
            e = seg.get('en','').strip()
            if h: has_he += 1
            if e: has_en += 1
            if h and e: both += 1
            if e and any(c.isalpha() for c in e): en_text += 1
    return {'total': total, 'has_he': has_he, 'has_en': has_en, 'both': both, 'en_text': en_text}

print("=== Current JSON Status ===")
for book in sorted(os.listdir(READER_DIR)):
    bp = os.path.join(READER_DIR, book)
    if not os.path.isdir(bp): continue
    stats = count_by_book(bp)
    print(f"{book:40s}: {stats['both']}/{stats['total']} paired, {stats['has_en']} with EN")

print("\n=== Source Files Inventory ===")

# Check docx sources
docx_dir = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
if os.path.exists(docx_dir):
    files = [f for f in os.listdir(docx_dir) if f.endswith('.docx')]
    print(f"LH docx: {len(files)} files")
    for f in sorted(files)[:5]:
        print(f"  {f}")

# Check HTML sources  
html_dirs = [
    '/root/ajew-org/public/teachings',
    '/mnt/c/Users/Pettek/Downloads',
]

for hd in html_dirs:
    if os.path.exists(hd):
        for root, dirs, files in os.walk(hd):
            if files and len(files) < 50:  # Skip large dirs
                print(f"{root}: {len(files)} files")
                [print(f"  {f}") for f in sorted(files)[:3]]