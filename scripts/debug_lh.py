#!/usr/bin/env python3
"""Debug: show specific LH segments where EN might be mismatched."""
import json
import os
import re

READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def strip_nikkud(text):
    return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)

def norm(text):
    t = strip_nikkud(text.lower().strip())
    return re.sub(r'\s+', ' ', t).strip()

def get_he_words_set(text):
    return set(re.findall(r'[\u05D0-\u05EA]{3,}', norm(text)))

def check_pairing(he_text, en_text):
    """Return True if pairing looks correct."""
    he_words = get_he_words_set(he_text)
    if not he_words:
        return True  # Can't check
    en_lower = en_text.lower()
    matches = sum(1 for w in he_words if len(w) >= 4 and w in en_lower)
    ratio = matches / len(he_words)
    return ratio > 0.2 or matches >= 2

# Check first halacha in detail
part_path = os.path.join(READER_DIR, 'part-1')
data = json.load(open(os.path.join(part_path, 'halacha-1.json')))

print("=== Checking halacha-1.json ===")
for i, seg in enumerate(data['segments']):
    he = seg.get('he', '').strip()
    en = seg.get('en', '').strip()
    if not he or not en:
        continue

    good = check_pairing(he, en)
    he_words = get_he_words_set(he)

    # Show all segments, highlight bad ones
    if not good or i < 5:
        en_lower = en.lower()
        matches = [w for w in he_words if len(w) >= 4 and w in en_lower]
        print(f"\nSeg {i+1}: GOOD={good}")
        print(f"  HE ({len(he_words)} words): {he[:120]}...")
        print(f"  EN ({len(en)} chars): {en[:150]}...")
        print(f"  Matches: {matches}")

# Let's also check from the audit - the known bad pairings
print("\n\n=== Checking known bad segments ===")
# halacha-1.json seg 1 and seg 2 were flagged
for seg_num in [1, 2]:
    seg = data['segments'][seg_num - 1]
    he = seg.get('he', '').strip()
    en = seg.get('en', '').strip()
    print(f"\nSeg {seg_num}:")
    print(f"  HE: {he[:80]}...")
    print(f"  EN: {en[:80]}...")

# Load docx and see what EN corresponds to each HE
from docx import Document
DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'

print("\n\n=== Docx content for Volume 1 ===")
doc = Document(os.path.join(DOCX_DIR, 'Volume_01_OC1_English.docx'))
he_paras = []
en_paras = []

for p in doc.paragraphs:
    text = p.text.strip()
    if len(text) < 10:
        continue
    has_he = any(ord(c) > 127 for c in text)
    if has_he and not text.startswith('Hilchos') and not text.startswith('Na '):
        he_paras.append(text)
    elif not has_he and len(text) > 5 and not text.startswith('Hilchos') and not text.startswith('Na '):
        en_paras.append(text)

print(f"HE paragraphs: {len(he_paras)}")
print(f"EN paragraphs: {len(en_paras)}")

for i in range(min(5, len(he_paras))):
    print(f"\nDocx HE {i}: {he_paras[i][:120]}...")
    if i < len(en_paras):
        print(f"Docx EN {i}: {en_paras[i][:150]}...")

print("\n\nComparing with JSON:")
for i in range(min(3, len(data['segments']))):
    seg = data['segments'][i]
    print(f"\nJSON Seg {i+1} HE: {seg['he'][:100]}...")
    # Try to find in docx HE paragraphs
    seg_words = get_he_words_set(seg['he'])
    for j, dp in enumerate(he_paras[:10]):
        dp_words = get_he_words_set(dp)
        overlap = seg_words & dp_words
        if overlap:
            print(f"  -> Matches Docx HE {j} (overlap: {len(overlap)} words: {list(overlap)[:5]})")
            print(f"  -> Docx EN {j}: {en_paras[j][:120] if j < len(en_paras) else 'N/A'}...")