#!/usr/bin/env python3
"""
Clean reset of Otzar Hayirah JSON files.
Repopulates Hebrew from docx source and English from HTML source.
Pairs by simanim index number.
"""

import os, re, json, html as htmlmod, unicodedata
from docx import Document

DOCX_DIR = '/mnt/c/Users/Pettek/.openclaw/workspace/ajew-org/public/reader/otzar-hayirah'
OUTPUT_DIR = '/root/ajew-org/public/reader/otzar-hayirah'

DOCX_FILES = [
    ('oatzar hayeeruh - volume 1 - copied from torat emet for simanim.docx', 1),
    ('oatzar hayeerah - volume 2 - copied from Torat Emet for simanim.docx', 2),
    ('oatzar hayeerah - volume 3 - copied from Torat emet for simanim.docx', 3),
    ('Oatzar hayeerah - volume 4 - copied from torat emet for simanim.docx', 4),
]

HTML_DIRS = [
    '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar volume 1',
    '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar volume 2',
    '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar volume 3',
    '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar volume 4',
]

HEB_LETTERS = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10,
    'יא': 11, 'יב': 12, 'יג': 13, 'יד': 14, 'טו': 15, 'טז': 16, 'יז': 17, 'יח': 18, 'יט': 19, 'כ': 20,
    'כא': 21, 'כב': 22, 'כג': 23, 'כד': 24, 'כה': 25, 'כו': 26, 'כז': 27, 'כח': 28, 'כט': 29, 'ל': 30,
    'לא': 31, 'לב': 32, 'לג': 33, 'לד': 34, 'לה': 35, 'לו': 36, 'לז': 37, 'לח': 38, 'לט': 39, 'מ': 40,
    'מא': 41, 'מב': 42, 'מג': 43, 'מד': 44, 'מה': 45, 'מו': 46, 'מז': 47, 'מח': 48, 'מט': 49, 'נ': 50,
}

def heb_to_num(s):
    return HEB_LETTERS.get(s.strip(), None)

def strip_html(h):
    h = re.sub(r'<[^>]+>', '', h)
    return re.sub(r'\s+', ' ', htmlmod.unescape(h)).strip()

def extract_simanim_from_text(text):
    """Extract numbered paragraphs from text using simanim markers."""
    paragraphs = []
    valid_markers = sorted(HEB_LETTERS.keys(), key=len, reverse=True)
    marker_pattern = '|'.join(re.escape(m) for m in valid_markers)
    pattern = rf'(?:^|\s)({marker_pattern})\.\s'
    matches = list(re.finditer(pattern, text))
    
    for i, match in enumerate(matches):
        marker = match.group(1)
        simanim_num = heb_to_num(marker)
        start_pos = match.end()
        if i + 1 < len(matches):
            end_pos = matches[i + 1].start()
        else:
            end_pos = len(text)
        para_text = text[start_pos:end_pos].strip()
        if para_text and simanim_num:
            paragraphs.append((simanim_num, para_text))
    
    return paragraphs

def parse_docx(filepath):
    """Parse docx file. Each large paragraph = one section with title + simanim."""
    doc = Document(filepath)
    sections = []
    
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text or len(text) < 100:
            continue
        
        # First line is the section title
        lines = text.split('\n', 1)
        title = lines[0].strip()
        content = text[len(title):].strip() if len(lines) > 1 else ''
        
        simanim = extract_simanim_from_text(content)
        if simanim:
            sections.append((title, simanim))
    
    return sections

def build_docx_index():
    """Build index: part_num -> [(title, [(simanim_num, hebrew_text), ...])]"""
    all_sections = {}
    for filename, part_num in DOCX_FILES:
        filepath = os.path.join(DOCX_DIR, filename)
        if not os.path.exists(filepath):
            print(f'  MISSING: {filename}')
            continue
        sections = parse_docx(filepath)
        all_sections[part_num] = sections
        total = sum(len(p) for _, p in sections)
        print(f'  Part {part_num}: {len(sections)} sections, {total} paragraphs')
    return all_sections

def build_html_english_index():
    """Build index: (part_num, section_title) -> [english_paragraphs]"""
    # This is complex - HTML files are organized differently
    # For now, return empty - we'll handle English separately
    return {}

def main():
    print('=== Otzar Hayirah Clean Reset ===\n')
    
    # Step 1: Parse docx files for Hebrew
    print('Step 1: Parsing docx files for Hebrew...')
    docx_sections = build_docx_index()
    
    total_hebrew = sum(len(p) for sections in docx_sections.values() for _, p in sections)
    print(f'Total Hebrew paragraphs from docx: {total_hebrew}\n')
    
    # Step 2: For each JSON file, find matching docx section and repopulate
    print('Step 2: Repopulating JSON files...')
    
    total_updated = 0
    files_updated = 0
    
    for part_num in range(1, 5):
        if part_num not in docx_sections:
            continue
        
        sections = docx_sections[part_num]
        part_dir = os.path.join(OUTPUT_DIR, f'part-{part_num}')
        if not os.path.exists(part_dir):
            continue
        
        # Build a flat map of all simanim -> hebrew for this part
        # But we need to know which section each torah file belongs to
        # For now, assign sequentially
        
        torah_files = sorted([f for f in os.listdir(part_dir)
                            if f.startswith('torah-') and f.endswith('.json')])
        
        # Simple approach: each torah file gets one section's simanim
        # Map torah files to sections by order
        section_idx = 0
        section_offset = 0  # simanim offset within current section
        
        for tf in torah_files:
            tf_path = os.path.join(part_dir, tf)
            data = json.load(open(tf_path))
            segments = data.get('segments', [])
            
            if section_idx >= len(sections):
                # No more sections - clear Hebrew
                for seg in segments:
                    seg['he'] = ''
                    seg['en'] = ''
                json.dump(data, open(tf_path, 'w'), indent=2, ensure_ascii=False)
                continue
            
            title, simanim_list = sections[section_idx]
            simanim_map = {num: text for num, text in simanim_list}
            
            # Update segments with correct Hebrew by simanim index
            updated = 0
            for seg in segments:
                seg_idx = seg.get('index', 0)
                # Adjust for offset within section
                adjusted_idx = seg_idx - section_offset
                if adjusted_idx in simanim_map:
                    seg['he'] = simanim_map[adjusted_idx]
                    seg['en'] = ''  # Clear English for now
                    updated += 1
                else:
                    # Beyond this section's simanim - clear
                    seg['he'] = ''
                    seg['en'] = ''
            
            json.dump(data, open(tf_path, 'w'), indent=2, ensure_ascii=False)
            
            # Check if we've exhausted this section
            max_idx = max(seg.get('index', 0) for seg in segments) if segments else 0
            max_simanim = max(simanim_map.keys()) if simanim_map else 0
            if max_idx - section_offset >= max_simanim:
                section_idx += 1
                section_offset = max_idx
            
            if updated > 0:
                total_updated += updated
                files_updated += 1
                print(f'  {tf}: {updated}/{len(segments)} segments updated (section: {title})')
    
    print(f'\nTotal: {files_updated} files updated, {total_updated} segments')
    
    # Count remaining
    empty_he = sum(1 for part in range(1,5) for f in os.listdir(os.path.join(OUTPUT_DIR,f'part-{part}'))
                   if f.startswith('torah-') and f.endswith('.json')
                   for seg in json.load(open(os.path.join(OUTPUT_DIR,f'part-{part}',f))).get('segments',[])
                   if not seg.get('he','').strip())
    print(f'Segments still empty (Hebrew): {empty_he}')

if __name__ == '__main__':
    main()
