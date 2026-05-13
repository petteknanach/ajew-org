#!/usr/bin/env python3
"""
Fix LH pairing v17 - Anchored matching.

Instead of trying to match individual paragraphs, use the known
docx structure: [HE title] [HE content] [EN content]

Each such group maps to one or more JSON segments.
"""
from docx import Document
import json, os, re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

# These patterns identify section headers (not content)
HEADER_PATTERNS = [
    r'.*hilchos.*', r'.*The Laws of.*',
    r'.*Hilchos.*', r'.*siman \d+.*',
    r'.*seif \d+.*', r'.*Volume .*\.',
    # Add more patterns for known header formats
]

def is_section_header(text):
    """Check if text looks like a section/topic header."""
    t = text.strip()
    if len(t) < 8 or len(t.split()) <= 3:
        return True
    # Check against patterns
    t_lower = t.lower()
    for pat in HEADER_PATTERNS:
        if re.match(pat, t_lower, re.IGNORECASE):
            return True
    # Check if it's a known EN section header style
    if t_lower.startswith('the laws of') or t_lower.startswith('hilchos '):
        return True
    return False

def extract_content_blocks(doc_path):
    """
    Extract content blocks from docx.
    Each block is a dict: {'he': text, 'en': text, 'he_raw': raw_he}
    Blocks are in document order.
    """
    doc = Document(doc_path)
    blocks = []

    # State tracking
    current_he = []
    current_en = []

    def flush_block():
        if current_he and current_en:
            blocks.append({
                'he': '\n'.join(current_he),
                'en': '\n'.join(current_en),
                'he_lines': len(current_he),
                'en_lines': len(current_en)
            })
        current_he.clear()
        current_en.clear()

    for p in doc.paragraphs:
        t = p.text.strip()
        if len(t) < 3:
            continue

        if is_section_header(t):
            # Section header - flush current block
            flush_block()
            continue

        if has_hebrew(t):
            # Hebrew paragraph
            if current_en:
                # We have EN without more HE - might be multi-line EN
                # Keep collecting EN
                current_en.append(t)
            else:
                current_he.append(t)
        else:
            # English paragraph
            current_en.append(t)

    # Flush last block
    flush_block()

    return blocks

# Test on Volume 1
print("=== Testing on Volume 1 ===")
blocks = extract_content_blocks(os.path.join(DOCX_DIR, 'Volume_01_OC1_English.docx'))
print(f"Found {len(blocks)} content blocks")

for i, b in enumerate(blocks[:3]):
    print(f"\nBlock {i+1}:")
    print(f"  HE ({b['he_lines']} lines): {b['he'][:80]}...")
    print(f"  EN ({b['en_lines']} lines): {b['en'][:80]}...")

# Now check what JSON segment 1 looks like
print("\n=== Checking JSON halacha-1.json ===")
data = json.load(open(os.path.join(READER_DIR, 'part-1', 'halacha-1.json')))
for i, seg in enumerate(data['segments']):
    he = seg.get('he', '')
    en = seg.get('en', '')
    print(f"Seg {i+1} HE: {he[:80]}...")
    print(f"Seg {i+1} EN: {(en[:80] if en else '(empty)')}...")

# Now check a typical halacha
print("\n=== Checking JSON halacha-10.json ===")
data = json.load(open(os.path.join(READER_DIR, 'part-1', 'halacha-10.json')))
for i, seg in enumerate(data['segments'][:5]):
    he = seg.get('he', '')
    en = seg.get('en', '')
    print(f"Seg {i+1} HE: {he[:80]}...")
    print(f"Seg {i+1} EN: {(en[:80] if en else '(empty)')}...")