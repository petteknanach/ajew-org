#!/usr/bin/env python3
"""Debug: compare JSON segment HE text with docx HE paragraphs."""
from docx import Document
import json
import os
import re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'

def strip_nikkud(t): return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', t)
def norm(t): return re.sub(r'\s+', ' ', strip_nikkud(t.lower())).strip()
def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

def extract_he_paras(docx_path):
    """Get all HE content paragraphs (skip headers)."""
    doc = Document(docx_path)
    result = []
    for p in doc.paragraphs:
        t = p.text.strip()
        if len(t) < 15: continue
        if has_hebrew(t):
            result.append(t)
    return result

# Load docx HE paragraphs
print("Loading docx HE paragraphs from Volume_01...")
docx_he = extract_he_paras(os.path.join(DOCX_DIR, 'Volume_01_OC1_English.docx'))
print(f"  Docx HE paragraphs: {len(docx_he)}")

# Load JSON segments
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos/part-1'
data = json.load(open(os.path.join(READER_DIR, 'halacha-1.json')))
json_segs = data['segments']
print(f"  JSON segments: {len(json_segs)}")

# For each JSON segment, try to find in docx
print("\n=== Matching JSON segments to docx paragraphs ===")
for i, seg in enumerate(json_segs[:5]):
    he = seg.get('he','').strip()
    en = seg.get('en','').strip()
    h_norm = norm(he)

    # Search for this text in docx
    best_match_idx = -1
    best_match_len = 0

    for j, docx_para in enumerate(docx_he[:30]):
        d_norm = norm(docx_para)
        # Check if docx para is contained in JSON segment
        if d_norm in h_norm and len(d_norm) > best_match_len:
            best_match_len = len(d_norm)
            best_match_idx = j

    print(f"\nJSON Seg {i+1} (HE {len(he)} chars):")
    print(f"  HE preview: {he[:80]}")
    print(f"  EN preview: {(en[:80].replace(chr(10),' ')) if en else '(empty)'}")

    if best_match_idx >= 0:
        print(f"  Best match: Docx HE {best_match_idx} ({best_match_len} chars)")
        print(f"  Matched text: {docx_he[best_match_idx][:80]}")
    else:
        # Try partial match
        for j, docx_para in enumerate(docx_he[:30]):
            d_words = norm(docx_para).split()
            h_words = h_norm.split()
            overlap = sum(1 for w in d_words if len(w) > 3 and w in h_words)
            if overlap > 5:
                print(f"  Partial match: Docx HE {j} (overlap: {overlap})")
                print(f"    Text: {docx_para[:80]}")
                break