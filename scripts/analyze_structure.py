#!/usr/bin/env python3
"""
Fix LH pairing - Approach v6: Structural alignment.

The LH docx structure is:
[headers...]
[HE paragraph 1 = Shulchan Aruch text]
[EN paragraph 1 = English translation + commentary]
[HE paragraph 2 = next Shulchan Aruch text]  
[EN paragraph 2 = next English translation]
...

The JSON has these same paragraphs extracted into segments.
The problem: headers and metadata paragraphs throw off the offset.

Strategy:
1. Parse docx as ordered sequence of ALL paragraphs
2. Parse JSON as ordered sequence of ALL segments
3. Strip headers from both sequences  
4. Align remaining content by position
"""
from docx import Document
import json
import os
import re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

HEADER_KEYWORDS = [
    'hilchos ', 'na nach', 'siman ', 'seif ', 'osio ', 'volume ',
    'introduction', 'likutay', 'a collection', 'the laws ', 'oc ',
    'yd ', 'eh ', 'cm ', 'nitan l'tal', 'halacha ', 'like all',
    'end of', 'rabbi nachman', 'one who recites', 'the entire'
]

def is_header_or_meta(text):
    t = text.lower().strip()
    if len(t) < 5: return True
    words = t.split()
    if len(words) <= 2: return True
    # Check single-line headers (short, few words)
    if len(t) < 40 and len(words) <= 5:
        return True
    for kw in HEADER_KEYWORDS:
        if t.startswith(kw):
            return True
    return False

def is_likely_english(text):
    """Check if text is English (not transliterated Hebrew)."""
    ascii_chars = sum(1 for c in text if c.isascii())
    return ascii_chars > len(text) * 0.7

def extract_docx_content(docx_path):
    """Extract content paragraphs in order, with type labels."""
    doc = Document(docx_path)
    result = []
    for p in doc.paragraphs:
        t = p.text.strip()
        if len(t) < 5:
            continue
        if is_header_or_meta(t):
            result.append(('meta', t))
        elif has_hebrew(t):
            result.append(('he', t))
        else:
            result.append(('en', t))
    return result

def get_content_paragraphs(sections):
    """Extract only content (he+en) paragraphs, skipping meta."""
    he_paras = []
    en_paras = []
    for typ, text in sections:
        if typ == 'he':
            he_paras.append(text)
        elif typ == 'en':
            # Skip very short EN (likely partial)
            if len(text) > 15:
                en_paras.append(text)
    return he_paras, en_paras

print("=== Analyzing docx structure ===")
# Analyze one volume in detail
vol1_path = os.path.join(DOCX_DIR, 'Volume_01_OC1_English.docx')
vol1_sections = extract_docx_content(vol1_path)
print(f"Volume_01 total paragraphs: {len(vol1_sections)}")

types = {}
for typ, _ in vol1_sections:
    types[typ] = types.get(typ, 0) + 1
print(f"  Types: {types}")

he_paras, en_paras = get_content_paragraphs(vol1_sections)
print(f"  HE content: {len(he_paras)}, EN content: {len(en_paras)}")

# Check JSON structure for part-1
json_path = os.path.join(READER_DIR, 'part-1')
json_files = sorted([f for f in os.listdir(json_path) if f.endswith('.json') and f != 'index.json'])

he_count = 0
en_count = 0
meta_count = 0
for jf in json_files[:10]:  # First 10 files
    data = json.load(open(os.path.join(json_path, jf)))
    for seg in data['segments']:
        he = seg.get('he','').strip()
        en = seg.get('en','').strip()
        if is_header_or_meta(he) or (en and is_header_or_meta(en)) if en else is_header_or_meta(he):
            meta_count += 1
        else:
            if he: he_count += 1
            if en: en_count += 1

print(f"\nJSON (first 10 files):")
print(f"  Content HE segments: {he_count}")
print(f"  Content EN segments: {en_count}")
print(f"  Meta segments: {meta_count}")

# The docx has ~175 HE content paragraphs per volume
# The JSON should have similar for each volume
# Let's see if positional alignment works after stripping meta

print("\n=== Testing positional alignment ===")
# For halacha-1.json (should map to beginning of vol1)
test_data = json.load(open(os.path.join(json_path, 'halacha-1.json')))
print(f"halacha-1.json has {len(test_data['segments'])} segments")

# Find the corresponding docx HE paragraphs
for i, seg in enumerate(test_data['segments'][:5]):
    he = seg.get('he','').strip()
    en = seg.get('en','').strip()
    print(f"\n  Seg {i+1}:")
    print(f"    HE ({len(he)}): {he[:60]}")
    print(f"    EN ({len(en) if en else 0}): {(en[:80] if en else '(empty)')}")