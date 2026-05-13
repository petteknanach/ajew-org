#!/usr/bin/env python3
"""
Clean reset of Otzar Hayirah Hebrew from docx source.
1. Clear all Hebrew from all JSON files
2. For files matching docx sections by title → set Hebrew from docx by simanim index
3. Keep existing English
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

def normalize_he(s):
    s = unicodedata.normalize('NFKD', s)
    s = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', s)  # Remove nikud
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def extract_simanim(text):
    paragraphs = []
    valid_markers = sorted(HEB_LETTERS.keys(), key=len, reverse=True)
    marker_pattern = '|'.join(re.escape(m) for m in valid_markers)
    pattern = rf'(?:^|\s)({marker_pattern})\.\s'
    matches = list(re.finditer(pattern, text))
    for i, match in enumerate(matches):
        marker = match.group(1)
        simanim_num = heb_to_num(marker)
        start_pos = match.end()
        end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        para_text = text[start_pos:end_pos].strip()
        if para_text and simanim_num:
            paragraphs.append((simanim_num, para_text))
    return paragraphs

def parse_docx(filepath):
    doc = Document(filepath)
    sections = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text or len(text) < 100: continue
        lines = text.split('\n', 1)
        title = lines[0].strip()
        content = text[len(title):].strip() if len(lines) > 1 else ''
        simanim = extract_simanim(content)
        if simanim:
            sections.append((title, simanim))
    return sections

def main():
    print('=== Otzar Hayirah Hebrew Reset ===\n')
    
    # Parse docx
    print('Step 1: Parsing docx files...')
    docx_index = {}  # part_num -> {normalized_title: {simanim_num: hebrew}}
    for filename, part_num in DOCX_FILES:
        filepath = os.path.join(DOCX_DIR, filename)
        if not os.path.exists(filepath): continue
        sections = parse_docx(filepath)
        docx_index[part_num] = {}
        for title, simanim_list in sections:
            norm = normalize_he(title)
            docx_index[part_num][norm] = {num: text for num, text in simanim_list}
        print(f'  Part {part_num}: {len(sections)} sections')
    
    # Process JSON files
    print('\nStep 2: Resetting Hebrew in JSON files...')
    total_cleared = 0
    total_set = 0
    files_with_hebrew = 0
    files_without = 0
    
    for part_num in range(1, 5):
        part_dir = os.path.join(OUTPUT_DIR, f'part-{part_num}')
        if not os.path.exists(part_dir): continue
        index = docx_index.get(part_num, {})
        
        for f in sorted(os.listdir(part_dir)):
            if not f.startswith('torah-') or not f.endswith('.json'): continue
            tf_path = os.path.join(part_dir, f)
            data = json.load(open(tf_path))
            
            torah_title = data.get('hebrewTitle', '')
            norm_title = normalize_he(torah_title)
            
            # Find matching docx section
            simanim_map = index.get(norm_title)
            if not simanim_map:
                # Try partial match
                for docx_norm, sim_map in index.items():
                    if docx_norm in norm_title or norm_title in docx_norm:
                        simanim_map = sim_map
                        break
            
            # Clear all Hebrew first
            for seg in data.get('segments', []):
                if seg.get('he', '').strip():
                    seg['he'] = ''
                    total_cleared += 1
            
            # Set Hebrew from docx if matching section found
            if simanim_map:
                for seg in data.get('segments', []):
                    seg_idx = seg.get('index', 0)
                    if seg_idx in simanim_map:
                        seg['he'] = simanim_map[seg_idx]
                        total_set += 1
                files_with_hebrew += 1
            else:
                files_without += 1
            
            json.dump(data, open(tf_path, 'w'), indent=2, ensure_ascii=False)
    
    print(f'Segments cleared: {total_cleared}')
    print(f'Segments set from docx: {total_set}')
    print(f'Files with Hebrew: {files_with_hebrew}')
    print(f'Files without Hebrew (no docx match): {files_without}')
    
    # Count remaining empty
    empty = sum(1 for part in range(1,5)
                for f in os.listdir(os.path.join(OUTPUT_DIR,f'part-{part}'))
                if f.startswith('torah-') and f.endswith('.json')
                for seg in json.load(open(os.path.join(OUTPUT_DIR,f'part-{part}',f))).get('segments',[])
                if not seg.get('he','').strip())
    print(f'Total empty Hebrew segments: {empty}')

if __name__ == '__main__':
    main()
