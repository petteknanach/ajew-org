#!/usr/bin/env python3
"""Analyze Volume 1 structure - find actual content paragraphs."""
from docx import Document
import os

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

doc = Document(os.path.join(DOCX_DIR, 'Volume_01_OC1_English.docx'))

# Show paragraphs 59 onwards (skip front matter)
print("=== Content paragraphs (from P59 onward) ===\n")
for i, p in enumerate(doc.paragraphs[59:120], start=59):
    t = p.text.strip()
    if not t: continue
    ht = 'HE' if has_hebrew(t) else 'EN'
    print(f"P{i:3d} [{ht:2s}] | {len(t):4d} | {t[:120]}")