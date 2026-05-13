#!/usr/bin/env python3
"""Compare LH halacha JSON with its source docx to understand the pairing issue."""
from docx import Document
import json

# Load a specific halacha JSON
halacha_path = '/root/ajew-org/public/reader/likutay-halachos/part-1/halacha-1.json'
data = json.load(open(halacha_path))
print("=== Halacha 1 JSON segments ===")
for i, seg in enumerate(data['segments']):
    he = seg.get('he','').strip()
    en = seg.get('en','').strip()
    print(f"Seg {i+1}:")
    print(f"  HE ({len(he)}): {he[:120]}")
    print(f"  EN ({len(en)}): {en[:120]}")
    print()

# Load the corresponding docx
docx_path = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos/Volume_01_OC1_English.docx'
doc = Document(docx_path)

print("\n=== LH Docx paragraphs (first volume, first few halachot) ===")
for i, p in enumerate(doc.paragraphs):
    text = p.text.strip()
    if not text:
        continue
    has_he = any(ord(c) > 127 for c in text)
    style = p.style.name if p.style else 'Normal'
    marker = "[HE]" if has_he else "[EN]"
    print(f"P{i} {marker} style={style}: {text[:150]}")
    if i > 30:
        break