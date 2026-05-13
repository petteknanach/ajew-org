#!/usr/bin/env python3
"""
Parse Otzar Hayirah docx files.
Each section is one massive paragraph: title + all simanim text combined.
Split by detecting section titles (short Hebrew lines).
"""

import os, re, json, unicodedata
from docx import Document

DOCX_DIR = '/mnt/c/Users/Pettek/.openclaw/workspace/ajew-org/public/reader/otzar-hayirah'
OUTPUT_DIR = '/root/ajew-org/public/reader/otzar-hayirah'

DOCX_FILES = [
    ('oatzar hayeeruh - volume 1 - copied from torat emet for simanim.docx', 1),
    ('oatzar hayeerah - volume 2 - copied from Torat Emet for simanim.docx', 2),
    ('oatzar hayeerah - volume 3 - copied from Torat emet for simanim.docx', 3),
    ('Oatzar hayeerah - volume 4 - copied from torat emet for simanim.docx', 4),
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

def extract_simanim(text):
    """Extract numbered paragraphs from a block of text."""
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
    """Parse docx file. Each large paragraph contains one section."""
    doc = Document(filepath)
    sections = []
    
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text or len(text) < 100:
            continue
        
        # First line is the section title
        lines = text.split('\n')
        title = lines[0].strip()
        
        # Rest is the content
        content = text[len(title):].strip()
        
        # Extract simanim from content
        simanim = extract_simanim(content)
        
        if simanim:
            sections.append((title, simanim))
    
    return sections

def main():
    print('Parsing Otzar Hayirah docx files...')
    
    all_sections = {}
    for filename, part_num in DOCX_FILES:
        filepath = os.path.join(DOCX_DIR, filename)
        if not os.path.exists(filepath):
            print(f'  MISSING: {filename}')
            continue
        
        sections = parse_docx(filepath)
        all_sections[part_num] = sections
        total_paras = sum(len(p) for _, p in sections)
        print(f'  Part {part_num}: {len(sections)} sections, {total_paras} paragraphs')
        
        for i, (title, paras) in enumerate(sections[:3]):
            print(f'    {i+1}. {title}: {len(paras)} paragraphs')
    
    # Map sections to JSON files
    print('\nMapping to JSON files...')
    
    total_updated = 0
    files_updated = 0
    
    for part_num in range(1, 5):
        if part_num not in all_sections:
            continue
        
        sections = all_sections[part_num]
        part_dir = os.path.join(OUTPUT_DIR, f'part-{part_num}')
        if not os.path.exists(part_dir):
            continue
        
        # Build section map by title
        section_map = {}
        for title, paras in sections:
            norm = unicodedata.normalize('NFKD', title.strip())
            section_map[norm] = paras
            section_map[title.strip()] = paras
        
        torah_files = sorted([f for f in os.listdir(part_dir)
                            if f.startswith('torah-') and f.endswith('.json')])
        
        for tf in torah_files:
            tf_path = os.path.join(part_dir, tf)
            data = json.load(open(tf_path))
            
            torah_title = data.get('hebrewTitle', '')
            segments = data.get('segments', [])
            
            # Find matching section
            matching_paras = None
            norm_title = unicodedata.normalize('NFKD', torah_title.strip())
            
            if norm_title in section_map:
                matching_paras = section_map[norm_title]
            elif torah_title.strip() in section_map:
                matching_paras = section_map[torah_title.strip()]
            else:
                # Try partial match
                for title, paras in sections:
                    norm_section = unicodedata.normalize('NFKD', title.strip())
                    if norm_section in norm_title or norm_title in norm_section:
                        matching_paras = paras
                        break
            
            if not matching_paras:
                continue
            
            # Build simanim map
            paras_map = {num: text for num, text in matching_paras}
            
            # Update segments
            updated = 0
            for seg in segments:
                seg_idx = seg.get('index', 0)
                if seg_idx in paras_map:
                    seg['he'] = paras_map[seg_idx]
                    updated += 1
            
            if updated > 0:
                total_updated += updated
                files_updated += 1
                json.dump(data, open(tf_path, 'w'), indent=2, ensure_ascii=False)
                print(f'  {tf}: {updated}/{len(segments)} segments updated')
    
    print(f'\nTotal: {files_updated} files updated, {total_updated} segments')
    
    # Count remaining empty
    empty = 0
    for part_num in range(1, 5):
        part_dir = os.path.join(OUTPUT_DIR, f'part-{part_num}')
        if not os.path.exists(part_dir):
            continue
        for f in os.listdir(part_dir):
            if not f.startswith('torah-') or not f.endswith('.json'):
                continue
            data = json.load(open(os.path.join(part_dir, f)))
            for seg in data.get('segments', []):
                if not seg.get('he', '').strip():
                    empty += 1
    print(f'Still empty: {empty} segments')

if __name__ == '__main__':
    main()
