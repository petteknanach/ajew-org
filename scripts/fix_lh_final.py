#!/usr/bin/env python3
"""
Fix LH pairing v18 - Final correct approach.

Problem analysis:
- JSON has segments including both titles/headers AND content
- Docx has EN paragraphs in correct order: title ENs, then content ENs
- Original import used ALL paragraphs (titles + content) for ALL segments
- This misaligned content ENs

Solution:
1. From docx, extract EN paragraphs in order
2. From JSON, identify header vs content segments
3. Assign EN by matching header segments to title ENs, content segments to content ENs
"""
from docx import Document
import json, os, re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

# These are known title/header segment patterns in JSON
JSON_HEADER_EN = {
    'Likutay Halachos', 'A Collection of Laws — Shulchan Aruch',
    'Volume 1 · Orach Chaim', 'Volume 2', 'Volume 3',
    'Hilchos Bircas HaShachar', 'Hilchos Tzitzis',
    'Hilchos Tefillin', 'Hilchos Sefiras HaOmer',
    'Hilchos Chanukah', 'Hilchos Purim', 'Hilchos Rosh Hashanah',
    'Hilchos Yom Kippur', 'Hilchos Sukkah', 'Hilchos Pesach',
    'Hilchos Shavuos', 'Hilchos Shabbos', 'The Laws of Shabbos',
    'Hilchos Eruvin', 'Hilchos Niddah', 'The Laws of Family Purity',
    'Hilchos Even HaEzer', 'Hilchos Choshen Mishpat',
    'An introduction from the author himself',
    'The Laws of Rising in the Morning — Halacha 1',
    'The Laws of Rising in the Morning — Halacha 2',
    'The Laws of Washing the Hands in the Morning — Halacha 1',
}

def is_json_header(seg_he, seg_en):
    """Check if segment is a header/title (not content)."""
    he = seg_he.strip()
    en = seg_en.strip() if seg_en else ''

    # Very short HE = header (like "הלכה ג", "אות א", "אות ב")
    if he and len(he.split()) <= 2:
        return True

    # Known header EN texts
    if en in JSON_HEADER_EN:
        return True

    return False

def extract_docx_en_paragraphs():
    """Extract ALL EN paragraphs from all docx files in order."""
    all_en = []

    for df in sorted(os.listdir(DOCX_DIR)):
        if not df.endswith('.docx'):
            continue

        doc = Document(os.path.join(DOCX_DIR, df))
        count = 0

        for p in doc.paragraphs:
            t = p.text.strip()
            if len(t) < 5:
                continue
            if has_hebrew(t):
                continue

            # It's English
            alpha = [c for c in t if c.isalpha()]
            if alpha and sum(1 for c in alpha if c.isascii()) / len(alpha) > 0.5:
                all_en.append(t)
                count += 1

        if count:
            print(f"  {df}: {count} EN paragraphs")

    return all_en

def main():
    print("=== Extracting EN from docx ===")
    docx_en = extract_docx_en_paragraphs()
    print(f"\nTotal docx EN paragraphs: {len(docx_en)}")

    # Now process JSON files
    print("\n=== Processing JSON segments ===\n")

    # First pass: identify headers and content segments
    for part_dir in sorted(os.listdir(READER_DIR)):
        if not part_dir.startswith('part-'):
            continue

        part_path = os.path.join(READER_DIR, part_dir)
        jsfiles = sorted([f for f in os.listdir(part_path)
                          if f.endswith('.json') and f != 'index.json'])

        # Collect all segments with file info
        all_segments = []
        for jf in jsfiles:
            data = json.load(open(os.path.join(part_path, jf)))
            for i, seg in enumerate(data['segments']):
                all_segments.append({
                    'jf': jf,
                    'i': i,
                    'seg': seg,
                    'is_header': is_json_header(seg.get('he', ''), seg.get('en', ''))
                })

        # Count headers vs content
        headers = [s for s in all_segments if s['is_header']]
        content = [s for s in all_segments if not s['is_header']]

        print(f"{part_dir}: {len(headers)} headers, {len(content)} content segments")

        # Build header EN list from known texts
        header_en_list = [s['seg']['en'] for s in headers if s['seg'].get('en', '').strip()]

        # Build content EN list from docx
        # Content ENs come after header ENs in the docx
        content_start = len(header_en_list)
        content_en_list = docx_en[content_start:content_start + len(content)]

        print(f"  Header ENs: {len(header_en_list)}, Content ENs from docx: {len(content_en_list)}")

        # Fix content segment ENs
        fixed = 0
        for idx, item in enumerate(content):
            if idx >= len(content_en_list):
                break

            seg = item['seg']
            old_en = seg.get('en', '').strip()
            new_en = content_en_list[idx]

            if new_en != old_en and len(new_en) > 15:
                seg['en'] = new_en
                fixed += 1

        print(f"  Fixed: {fixed} content segment ENs")

        # Write back changes
        files_to_write = {}
        for item in all_segments:
            jf = item['jf']
            if jf not in files_to_write:
                files_to_write[jf] = json.load(open(os.path.join(part_path, jf)))

        for item in all_segments:
            if item['jf'] in files_to_write:
                fdata = files_to_write[item['jf']]
                fdata['segments'][item['i']] = item['seg']

        for jf, data in files_to_write.items():
            json.dump(data, open(os.path.join(part_path, jf), 'w'),
                      indent=2, ensure_ascii=False)

main()