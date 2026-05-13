#!/usr/bin/env python3
"""
Complete Otzar Hayirah Hebrew rebuild - FINAL CORRECT VERSION.
For each JSON file:
1. Find the matching docx section by Hebrew title (exact, partial, or keyword match)
2. Assign Hebrew from docx simanim by index number
3. If JSON has more segments than docx has simanim, extra segments get empty Hebrew
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

def normalize(s):
    s = unicodedata.normalize('NFKD', s)
    s = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', s)
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

def find_docx_section(json_title, docx_sections):
    """Find the best matching docx section for a JSON title."""
    jn = normalize(json_title)
    
    # 1. Exact normalized match
    for title, simanim in docx_sections:
        if normalize(title) == jn:
            return simanim
    
    # 2. JSON title contains docx title
    for title, simanim in docx_sections:
        if normalize(title) in jn:
            return simanim
    
    # 3. Docx title contains JSON title
    for title, simanim in docx_sections:
        if jn in normalize(title):
            return simanim
    
    # 4. Keyword matching - extract Hebrew words and find best overlap
    jn_words = set(re.findall(r'[\u0590-\u05FF]{3,}', json_title))
    if not jn_words:
        return None
    
    best_match = None
    best_score = 0
    for title, simanim in docx_sections:
        dn_words = set(re.findall(r'[\u0590-\u05FF]{3,}', title))
        score = len(jn_words & dn_words)
        if score > best_score:
            best_score = score
            best_match = simanim
    
    return best_match if best_score >= 1 else None

def main():
    print('=== Otzar Hayirah Complete Hebrew Rebuild ===\n')
    
    # Parse docx
    print('Step 1: Parsing docx files...')
    docx_sections = {}
    for filename, part_num in DOCX_FILES:
        filepath = os.path.join(DOCX_DIR, filename)
        if not os.path.exists(filepath): continue
        docx_sections[part_num] = parse_docx(filepath)
        print(f'  Part {part_num}: {len(docx_sections[part_num])} sections')
    
    # Process all JSON files
    print('\nStep 2: Processing JSON files...')
    total_set = 0
    files_matched = 0
    files_unmatched = 0
    
    for part_num in range(1, 5):
        part_dir = os.path.join(OUTPUT_DIR, f'part-{part_num}')
        if not os.path.exists(part_dir): continue
        
        docx_list = docx_sections.get(part_num, [])
        
        for f in sorted(os.listdir(part_dir)):
            if not f.startswith('torah-') or not f.endswith('.json'): continue
            
            tf_path = os.path.join(part_dir, f)
            data = json.load(open(tf_path))
            segments = data.get('segments', [])
            
            hebrew_title = data.get('hebrewTitle', '')
            simanim_list = find_docx_section(hebrew_title, docx_list)
            
            if simanim_list:
                simanim_map = {num: text for num, text in simanim_list}
                for seg in segments:
                    seg_idx = seg.get('index', 0)
                    if seg_idx in simanim_map:
                        seg['he'] = simanim_map[seg_idx]
                        total_set += 1
                    else:
                        seg['he'] = ''
                files_matched += 1
            else:
                # Clear Hebrew for unmatched files
                for seg in segments:
                    seg['he'] = ''
                files_unmatched += 1
            
            json.dump(data, open(tf_path, 'w'), indent=2, ensure_ascii=False)
    
    print(f'Files matched: {files_matched}')
    print(f'Files unmatched: {files_unmatched}')
    print(f'Segments set: {total_set}')
    
    # Count remaining empty
    empty = 0
    for part_num in range(1, 5):
        part_dir = os.path.join(OUTPUT_DIR, f'part-{part_num}')
        if not os.path.exists(part_dir): continue
        for f in os.listdir(part_dir):
            if not f.startswith('torah-') or not f.endswith('.json'): continue
            data = json.load(open(os.path.join(part_dir, f)))
            for seg in data.get('segments', []):
                if not seg.get('he', '').strip():
                    empty += 1
    print(f'Remaining empty Hebrew: {empty}')

if __name__ == '__main__':
    main()
