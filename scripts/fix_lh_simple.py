#!/usr/bin/env python3
"""
Simple LH fix: Match docx content paragraphs to JSON content segments.

The docx alternates: [section header HE] [content HE] [content EN]
The JSON has the same structure but the EN was assigned wrong positionally.

I'll extract content paragraphs from both in order and align them.
"""
from docx import Document
import json, os, re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)
def strip_nikkud(t): return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', t)
def is_english_text(t):
    if not t: return False
    alpha = [c for c in t if c.isalpha()]
    if not alpha: return False
    ascii_ratio = sum(1 for c in alpha if c.isascii()) / len(alpha)
    return ascii_ratio > 0.6

# Known section headers in docx (both HE and EN versions)
SECTION_HEADERS_EN = {
    'The Laws of Rising in the Morning', 'Hilchos Bircas HaShachar',
    'Hilchos Tzitzis', 'Hilchos Tefillin', 'Hilchos Sefiras HaOmer',
    'Hilchos Chanukah', 'Hilchos Purim', 'Hilchos Rosh Hashanah',
    'Hilchos Yom Kippur', 'Hilchos Sukkah', 'Hilchos Pesach',
    'Hilchos Shavuos', 'Hilchos Shabbos', 'The Laws of Shabbos',
    'Hilchos Eruvin', 'Hilchos Niddah', 'The Laws of Family Purity',
    'Hilchos Even HaEzer', 'Hilchos Choshen Mishpat',
    'The Laws of Rising in the Morning - Continued',
}

def is_section_header(text):
    """Check if text is a section/topic header (not actual content)."""
    t = text.strip()
    # Short headers
    if len(t) < 10 or len(t.split()) <= 3:
        return True
    # Known header patterns
    if any(h.lower() in t.lower() for h in SECTION_HEADERS_EN):
        return True
    # Starts with "The Laws of" or "Hilchos"
    if t.lower().startswith('the laws of') or t.lower().startswith('hilchos '):
        return True
    # Halacha references
    if re.match(r'^Halacha \d+', t):
        return True
    # Single words or numbers
    if len(t.split()) <= 2:
        return True
    return False

def extract_docx_content(doc_path):
    """
    Extract ordered content paragraphs from docx.
    Returns list of ('he'|'en', text) tuples for actual content.
    """
    doc = Document(doc_path)
    content = []
    in_content = False

    for p in doc.paragraphs:
        t = p.text.strip()
        if len(t) < 5:
            continue

        has_h = has_hebrew(t)
        is_en = is_english_text(t)

        # Detect when actual content begins (first substantial paragraph)
        if not in_content:
            # Skip front matter - it's mostly EN metadata
            if is_section_header(t):
                continue
            # Content starts when we hit non-header text
            if has_h or (is_en and len(t) > 30):
                in_content = True

        if not in_content:
            continue

        if is_section_header(t):
            continue

        if has_h:
            content.append(('he', t))
        elif is_en:
            content.append(('en', t))

    return content

def get_json_content_segments(part_path):
    """Get ordered list of content segments from a part directory."""
    jsfiles = sorted([f for f in os.listdir(part_path)
                      if f.endswith('.json') and f != 'index.json'])

    segments = []
    for jf in jsfiles:
        data = json.load(open(os.path.join(part_path, jf)))
        for seg in data['segments']:
            he = seg.get('he', '').strip()
            en = seg.get('en', '').strip()
            if he and len(he) > 15 and not is_section_header(he):
                segments.append({
                    'jf': jf,
                    'idx': len(segments),
                    'he': he,
                    'en': en,
                    'seg': seg
                })
    return segments

def main():
    print("=== Building docx content index ===\n")

    # Combine all docx content
    all_docx_content = []
    for df in sorted(os.listdir(DOCX_DIR)):
        if not df.endswith('.docx'): continue
        path = os.path.join(DOCX_DIR, df)
        content = extract_docx_content(path)
        all_docx_content.extend(content)
        he = sum(1 for t, _ in content if t == 'he')
        en = sum(1 for t, _ in content if t == 'en')
        print(f"  {df}: {he} HE, {en} EN content paras")

    print(f"\nTotal docx content: {len(all_docx_content)} paragraphs")

    # Extract just the EN paragraphs
    docx_en = [text for typ, text in all_docx_content if typ == 'en']
    docx_he = [text for typ, text in all_docx_content if typ == 'he']
    print(f"Docx HE content paragraphs: {len(docx_he)}")
    print(f"Docx EN content paragraphs: {len(docx_en)}")

    # Process each part
    for part_dir in sorted(os.listdir(READER_DIR)):
        if not part_dir.startswith('part-'): continue
        part_path = os.path.join(READER_DIR, part_dir)

        segs = get_json_content_segments(part_path)
        print(f"\n{part_dir}: {len(segs)} content segments")

        # Match by position - use docx EN for corresponding segments
        # The key insight: both JSON and docx list content in the same order
        fixed = 0
        for i, item in enumerate(segs):
            if i >= len(docx_en):
                break

            new_en = docx_en[i]
            old_en = item['en']

            if new_en != old_en and len(new_en) > 15:
                item['seg']['en'] = new_en
                fixed += 1

        # Write back changes
        if fixed > 0:
            # Group fixes by file
            files_to_write = {}
            for item in segs:
                jf = item['jf']
                if jf not in files_to_write:
                    files_to_write[jf] = json.load(open(os.path.join(part_path, jf)))

            # Find the index of each modified segment
            for item in segs:
                if item['seg']['en'] != item['en']:
                    # Find segment in file data
                    fdata = files_to_write[item['jf']]
                    seg_idx = [s for s in fdata['segments']].index(item['seg'])
                    fdata['segments'][seg_idx] = item['seg']

            for jf, data in files_to_write.items():
                json.dump(data, open(os.path.join(part_path, jf), 'w'),
                          indent=2, ensure_ascii=False)

        print(f"  Fixed: {fixed} segments")

main()