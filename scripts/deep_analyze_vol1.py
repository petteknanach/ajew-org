#!/usr/bin/env python3
"""
Analyze VOLUME 01 docx to understand what's actual ENGLISH TRANSLATION content
vs front matter/metadata.
"""
from docx import Document
import os

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'

# Show a specific range - after all front matter
doc = Document(os.path.join(DOCX_DIR, 'Volume_01_OC1_English.docx'))
paras = doc.paragraphs

print(f"Volume 01 has {len(paras)} paragraphs\n")

# Find where actual content starts (after the front matter section)
front_matter_end = 0
for i, p in enumerate(paras):
    t = p.text.strip()
    # Look for end of front matter markers
    if '4 Eyar' in t or '21 Teves' in t or 'rough draft produced' in t.lower():
        front_matter_end = i
        break

print(f"Front matter ends around paragraph {front_matter_end}\n")

# Show actual content paragraphs
print("=== ACTUAL CONTENT (after front matter) ===\n")
for i in range(front_matter_end + 1, min(front_matter_end + 80, len(paras))):
    t = paras[i].text.strip()
    if not t: continue
    has_he = any('\u05D0' <= c <= '\u05EA' for c in t)
    ht = 'HE' if has_he else 'EN'
    print(f"[{i:4d}|{ht}] {t[:120]}")