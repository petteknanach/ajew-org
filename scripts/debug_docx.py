#!/usr/bin/env python3
"""Debug: show all docx paragraphs to understand structure."""
from docx import Document
import os

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'

# Show first 30 paragraphs of first docx
for df in sorted(os.listdir(DOCX_DIR))[:1]:
    doc = Document(os.path.join(DOCX_DIR, df))
    print(f"=== {df} ===")
    for i, p in enumerate(doc.paragraphs[:50]):
        t = p.text.strip()
        if t:
            print(f"P{i} [{len(t)}]: {t[:120]}")