#!/usr/bin/env python3
"""
Check all books for available source files and pairing status.
"""
import json, os, re
from docx import Document

READER_DIR = '/root/ajew-org/public/reader'

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

def check_book_pairing(book_dir):
    """Check EN-HE pairing quality for a book."""
    total = 0; bad = 0; empty = 0; total_en = 0

    for f in sorted(os.listdir(book_dir)):
        if not f.endswith('.json') or f == 'index.json': continue
        data = json.load(open(os.path.join(book_dir, f)))
        for seg in data.get('segments', []):
            he = seg.get('he','').strip()
            en = seg.get('en','').strip()
            total += 1
            if en:
                total_en += 1
            else:
                empty += 1

    return total, total_en, empty

# Check all books
for book in sorted(os.listdir(READER_DIR)):
    book_path = os.path.join(READER_DIR, book)
    if not os.path.isdir(book_path): continue

    total, en_count, empty = check_book_pairing(book_path)
    pct = en_count/total*100 if total else 0
    print(f"{book:40s}: {en_count}/{total} ({pct:.1f}%) EN, {empty} empty")

print("\n=== Source file availability ===")
source_dirs = [
    '/mnt/c/Users/Pettek/Downloads/Oatrzoas Ramchal',
    '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos',
    '/root/ajew-org/public/teachings',
]

for src_dir in source_dirs:
    if os.path.exists(src_dir):
        files = [f for f in os.listdir(src_dir) if f.endswith(('.docx', '.html', '.txt'))]
        print(f"{src_dir}: {len(files)} source files")
    else:
        print(f"{src_dir}: NOT FOUND")